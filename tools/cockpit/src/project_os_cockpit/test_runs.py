"""The repo's latest test run and CI runs, for the Tests page (FEAT-0161 / TASK-0681).

project-os's ``run-tests.py`` rewrites ``.project-os/runs/latest.json`` as
each command starts and finishes, and ``ci-status.py`` saves the latest run
of each CI workflow to ``.project-os/ci/latest.json``. Both formats are
defined once, upstream, in the template's ``tools/instructions/TEST-RUNS.md``
(project-os-dev FEAT-0042). This module reads them and nothing else: it never
writes into ``.project-os/`` and never creates it.

**The page works nothing out itself.** The readers below turn each file into
what the Tests page draws -- the header line, each command's symbol and
duration, the rows listed under the grid, each workflow's state -- so the
renderer only places text, the way the release test page takes its sections
from the payload. It also keeps the rules testable here, in the suite CI runs.

**Neither file is a verdict** (project-os ADR-0025). Nothing here changes a
test note's status, and nothing reads these payloads to decide one.

Three pieces:

- :func:`run_payload` and :func:`ci_payload` -- the two readings, served by
  ``GET /api/cockpit/test-run``.
- :func:`log_file` -- the only way a log is reached from the sidecar: a path
  the run file names, that resolves under ``.project-os/runs/``.
- :class:`TestRunWatcher` -- publishes ``cockpit:test-run`` when either
  ``latest.json`` is replaced.
"""

from __future__ import annotations

import json
import logging
import os
import socket
import threading
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from .events import ControlEvent, EventBus
from .validation import canonical_case

log = logging.getLogger("project_os_cockpit.test_runs")

RUN_FORMAT = "project-os/test-run"
CI_FORMAT = "project-os/ci-status"
#: The format versions this reader understands. TEST-RUNS.md: a change that
#: would break a reader raises `version`, and a reader shows a version it does
#: not know as unreadable rather than guessing.
KNOWN_VERSIONS = frozenset({1})

SSE_EVENT = "cockpit:test-run"
LOG_ROUTE = "/api/cockpit/test-run/log"

#: The terminal view's symbols (`test-status.py`), so the page and a second
#: terminal read alike. `interrupted` is the command that was running when the
#: runner stopped. `stopped` never comes from the file: it is this reader's
#: name for a `running` command whose runner is gone (see `_runner_gone`).
SYMBOLS: dict[str, str] = {
    "passing": "■",
    "failing": "✗",
    "timed_out": "⧗",
    "unrunnable": "?",
    "running": "▶",
    "waiting": "□",
    "interrupted": "‖",
}
UNKNOWN_SYMBOL = "·"

#: How each state reads in a row. A state the format adds later is shown as
#: its own word, never dropped: an unknown state is still a command.
LABELS: dict[str, str] = {
    "passing": "passing",
    "failing": "failing",
    "timed_out": "timed out",
    "unrunnable": "unrunnable",
    "running": "running",
    "waiting": "waiting",
    "interrupted": "interrupted",
}

#: The commands that get a row under the grid. A passing or waiting command
#: is fully told by its block; these each have something to read.
LISTED_STATES = frozenset({"failing", "timed_out", "unrunnable", "running", "interrupted"})

#: The command states that mean a command has ended (TEST-RUNS.md).
FINISHED_COMMAND_STATES = frozenset({"passing", "failing", "timed_out", "unrunnable", "interrupted"})

#: The run states that mean the runner has finished (TEST-RUNS.md).
RUN_FINISHED = frozenset({"passing", "failing", "interrupted"})

#: A CI workflow is red while its last finished run ended in one of these.
CI_RED = frozenset({"failure", "timed_out", "startup_failure"})

NO_RUN = "No test run yet. `python3 tools/scripts/run-tests.py` writes one."
NO_CI = "No CI result yet. `python3 tools/scripts/ci-status.py` fetches one."

#: The largest log the route sends whole. Past this it sends the end, which is
#: where a failure is, and says how much it left out. A connected-test log can
#: run to hundreds of megabytes, and a page is not where to read all of it.
LOG_TAIL_BYTES = 4 * 1024 * 1024


def runs_dir(project_root: Path) -> Path:
    return Path(project_root) / ".project-os" / "runs"


def ci_dir(project_root: Path) -> Path:
    return Path(project_root) / ".project-os" / "ci"


# ---- small readers ----------------------------------------------------------


def _parse_time(value: Any) -> datetime | None:
    """An ISO-8601 time as an aware datetime, or None for anything else."""
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def format_duration(seconds: float | None) -> str:
    """`45s`, `3m32s`, `1h10m`, `2d4h`: the run's own grain, never `0h3m`."""
    if seconds is None or seconds < 0:
        return ""
    s = int(round(seconds))
    if s < 60:
        return f"{s}s"
    m, s = divmod(s, 60)
    if m < 60:
        return f"{m}m{s:02d}s" if s else f"{m}m"
    h, m = divmod(m, 60)
    if h < 24:
        return f"{h}h{m:02d}m" if m else f"{h}h"
    d, h = divmod(h, 24)
    return f"{d}d{h}h" if h else f"{d}d"


def format_ago(seconds: float | None) -> str:
    """`just now`, `12m ago`, `3h ago`, `2d ago`."""
    if seconds is None:
        return ""
    s = max(0, int(seconds))
    if s < 60:
        return "just now"
    if s < 3600:
        return f"{s // 60}m ago"
    if s < 86400:
        return f"{s // 3600}h ago"
    return f"{s // 86400}d ago"


def _strings(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(v) for v in value if isinstance(v, (str, int)) and str(v).strip()]


def _short_host(name: str) -> str:
    """`edwins-mac.local` and `edwins-mac` are one machine.

    macOS answers `gethostname()` with or without the `.local` suffix
    depending on the network, so a runner and the sidecar on one Mac can
    spell it two ways.
    """
    return (name or "").strip().lower().split(".")[0]


def pid_alive(pid: int) -> bool:
    """Whether a process with this id exists on this machine."""
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True        # it exists; it is someone else's
    except OSError:
        return True        # cannot tell, so do not call it gone
    return True


def _read_json(path: Path, expected_format: str) -> tuple[str, Any]:
    """`("absent"|"unreadable"|"ok", data-or-message)` for one file."""
    try:
        raw = path.read_bytes()
    except FileNotFoundError:
        return "absent", ""
    except OSError as exc:
        return "unreadable", f"could not be read: {exc.strerror or exc}"
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return "unreadable", "is not valid JSON"
    if not isinstance(data, dict):
        return "unreadable", "is not a JSON object"
    if data.get("format") != expected_format:
        return "unreadable", f"is not a {expected_format} file"
    version = data.get("version")
    if isinstance(version, bool) or version not in KNOWN_VERSIONS:
        return "unreadable", (
            f"is format version {version!r}, which this cockpit does not read"
        )
    return "ok", data


# ---- the run file -----------------------------------------------------------


def _log_url(rel: str) -> str:
    return f"{LOG_ROUTE}?path={urllib.parse.quote(rel, safe='')}"


def _progress_text(progress: Any) -> str:
    """`12/60 AddRiderFlowTest`, `12/60 · 1 failed`, or `` for none."""
    if not isinstance(progress, dict):
        return ""
    parts: list[str] = []
    done, total = _number(progress.get("done")), _number(progress.get("total"))
    if done is not None and total is not None:
        parts.append(f"{int(done)}/{int(total)}")
    elif done is not None:
        parts.append(f"{int(done)} done")
    now = progress.get("now")
    if isinstance(now, str) and now.strip():
        parts.append(now.strip())
    failed = _number(progress.get("failed"))
    if failed:
        parts.append(f"· {int(failed)} failed")
    return " ".join(parts)


def _runner_gone(data: dict[str, Any], *, host: str, alive: Callable[[int], bool]) -> bool:
    """A `running` run from this machine whose runner process has gone.

    TEST-RUNS.md: a reader that finds `running` on the same `host` with a
    `pid` that is no longer alive shows the run as stopped. A run from another
    machine (a CI artifact, a run over ssh) cannot be checked, so it is shown
    as the file says.
    """
    if data.get("state") != "running":
        return False
    pid = data.get("pid")
    if isinstance(pid, bool) or not isinstance(pid, int):
        return False
    file_host = data.get("host")
    if not isinstance(file_host, str) or _short_host(file_host) != _short_host(host):
        return False
    return not alive(pid)


def run_payload(
    project_root: Path,
    *,
    now: datetime | None = None,
    host: str | None = None,
    alive: Callable[[int], bool] = pid_alive,
) -> dict[str, Any]:
    """The latest test run as the Tests page draws it.

    ``state`` is ``absent`` (no file), ``unreadable`` (``message`` says why,
    in a phrase that follows the file's name) or ``ok`` (``run`` is filled).
    ``now``, ``host`` and ``alive`` are parameters so the tests can fix the
    clock, the machine and which processes exist.
    """
    root = Path(project_root)
    path = runs_dir(root) / "latest.json"
    shown = ".project-os/runs/latest.json"
    status, data = _read_json(path, RUN_FORMAT)
    if status == "absent":
        return {"state": "absent", "message": NO_RUN, "file": shown}
    if status == "unreadable":
        return {"state": "unreadable", "message": f"{shown} {data}.", "file": shown}

    now = now or datetime.now(timezone.utc)
    host = host if host is not None else socket.gethostname()
    stopped = _runner_gone(data, host=host, alive=alive)

    raw_state = data.get("state") if isinstance(data.get("state"), str) else ""
    run_state = "stopped" if stopped else (raw_state or "running")
    started = _parse_time(data.get("started"))
    updated = _parse_time(data.get("updated"))
    finished = _parse_time(data.get("finished"))
    if started and finished:
        elapsed = (finished - started).total_seconds()
    elif started and (stopped or raw_state in RUN_FINISHED) and updated:
        elapsed = (updated - started).total_seconds()
    elif started:
        elapsed = (now - started).total_seconds()
    else:
        elapsed = None

    commands_in = data.get("commands")
    if not isinstance(commands_in, list):
        commands_in = []
    commands: list[dict[str, Any]] = []
    counts: dict[str, int] = {}
    for position, entry in enumerate(commands_in, start=1):
        if not isinstance(entry, dict):
            continue
        state = entry.get("state") if isinstance(entry.get("state"), str) else "waiting"
        if stopped and state == "running":
            # The runner died between writes, so nothing marked this command.
            # It is what TEST-RUNS.md calls `interrupted`, said by the reader.
            state = "interrupted"
        counts[state] = counts.get(state, 0) + 1
        index = entry.get("index")
        if isinstance(index, bool) or not isinstance(index, int):
            index = position
        cmd_started = _parse_time(entry.get("started"))
        seconds = _number(entry.get("seconds"))
        if seconds is None and state == "running" and cmd_started:
            seconds = (now - cmd_started).total_seconds()
        tests = _strings(entry.get("tests"))
        reason = entry.get("reason") if isinstance(entry.get("reason"), str) else ""
        log_rel = entry.get("log") if isinstance(entry.get("log"), str) else ""
        log_path = log_file(root, log_rel, data) if log_rel else None
        label = LABELS.get(state, state.replace("_", " "))
        took = format_duration(seconds)
        title = " ".join(tests) or (entry.get("command") or f"command {index}")
        commands.append({
            "index": index,
            "tests": tests,
            "command": entry.get("command") if isinstance(entry.get("command"), str) else "",
            "state": state,
            "symbol": SYMBOLS.get(state, UNKNOWN_SYMBOL),
            "label": label,
            "seconds": seconds,
            "took": took,
            "exit": entry.get("exit") if isinstance(entry.get("exit"), int) else None,
            "reason": reason.strip().splitlines()[0] if reason.strip() else "",
            "progress": _progress_text(entry.get("progress")),
            "log": log_rel if log_path else "",
            "log_url": _log_url(log_rel) if log_path else "",
            "listed": state in LISTED_STATES or state not in SYMBOLS,
            #: The block's tooltip: everything a row would say, in one line.
            "tip": " · ".join(p for p in (str(title), label, took) if p),
        })

    total = len(commands)
    #: Only a state the format says is an end counts as finished: an unknown
    #: one might be a new kind of waiting.
    done = sum(n for s, n in counts.items() if s in FINISHED_COMMAND_STATES)
    repo = data.get("repo") if isinstance(data.get("repo"), str) else ""
    source = data.get("source") if isinstance(data.get("source"), str) else ""
    header_parts = [
        repo or root.name,
        source,
        format_duration(elapsed),
        f"{done} of {total} command{'s' if total != 1 else ''}",
    ]
    commit = data.get("commit") if isinstance(data.get("commit"), str) else ""
    state_line = {
        "running": "running",
        "passing": "finished: every command passed",
        "failing": "finished with failures",
        "interrupted": "interrupted",
        "stopped": (f"stopped: runner {data.get('pid')} is no longer running "
                    "and the run never finished"),
    }.get(run_state, run_state)
    return {
        "state": "ok",
        "file": shown,
        "run": {
            "id": data.get("id") if isinstance(data.get("id"), str) else "",
            "repo": repo,
            "source": source,
            "commit": commit[:7],
            "branch": data.get("branch") if isinstance(data.get("branch"), str) else "",
            "host": data.get("host") if isinstance(data.get("host"), str) else "",
            "state": run_state,
            "state_line": state_line,
            "live": run_state == "running",
            "started": data.get("started") or "",
            "updated": data.get("updated") or "",
            "elapsed": format_duration(elapsed),
            "done": done,
            "total": total,
            "counts": counts,
            "header": " · ".join(p for p in header_parts if p),
            "commands": commands,
        },
    }


def log_file(project_root: Path, rel: str, run: dict[str, Any] | None = None) -> Path | None:
    """The log at ``rel``, only if the run file names it and it is a log.

    The rules, each a refusal on its own:

    1. ``rel`` is exactly the ``log`` of one command in the run file. Nothing
       else is served, so the route cannot be used to read any other file the
       sidecar can see.
    2. It is relative, and it resolves -- symlinks followed -- under
       ``.project-os/runs/``. A run file is written by a script in the repo
       and could be wrong; this keeps a wrong one from naming `../../.ssh`.
    3. It is a regular file.

    ``run`` is the run file's data when the caller has it already; otherwise
    the current ``latest.json`` is read, so a link from a run that has since
    been replaced by a new one is refused rather than served.
    """
    if not isinstance(rel, str) or not rel or "\x00" in rel:
        return None
    if run is None:
        status, data = _read_json(runs_dir(project_root) / "latest.json", RUN_FORMAT)
        if status != "ok":
            return None
        run = data
    commands = run.get("commands") if isinstance(run, dict) else None
    named = {
        c.get("log") for c in (commands or [])
        if isinstance(c, dict) and isinstance(c.get("log"), str)
    }
    if rel not in named:
        return None
    if rel.startswith("/") or Path(rel).is_absolute():
        return None
    base = runs_dir(project_root).resolve()
    try:
        target = (Path(project_root) / rel).resolve()
        target.relative_to(base)
    except (OSError, ValueError):
        return None
    if not target.is_file():
        return None
    return target


def read_log(path: Path, limit: int = LOG_TAIL_BYTES) -> bytes:
    """A log's bytes, or its last ``limit`` bytes with a line saying so."""
    size = path.stat().st_size
    if size <= limit:
        return path.read_bytes()
    with path.open("rb") as fh:
        fh.seek(size - limit)
        tail = fh.read()
    # Start on a line boundary, so the first line shown is a whole one.
    cut = tail.find(b"\n")
    if 0 <= cut < 4096:
        tail = tail[cut + 1:]
    note = (f"[the first {size - len(tail):,} bytes of this log are left out; "
            f"the whole log is {path}]\n\n").encode("utf-8")
    return note + tail


# ---- the CI file ------------------------------------------------------------


def _ci_run_state(run: dict[str, Any]) -> str:
    """`running`, `passing`, `failed`, or GitHub's own word (`cancelled`)."""
    status = run.get("status")
    if isinstance(status, str) and status and status != "completed":
        return "running"
    conclusion = run.get("conclusion")
    if conclusion == "success":
        return "passing"
    if conclusion in CI_RED:
        return "failed"
    if isinstance(conclusion, str) and conclusion:
        return conclusion.replace("_", " ")
    return "unknown"


CI_SYMBOLS = {"passing": "■", "failed": "✗", "running": "▶"}


def _ci_run(run: Any, now: datetime) -> dict[str, Any] | None:
    if not isinstance(run, dict):
        return None
    state = _ci_run_state(run)
    when = _parse_time(run.get("updated")) or _parse_time(run.get("created"))
    commit = run.get("commit") if isinstance(run.get("commit"), str) else ""
    url = run.get("url") if isinstance(run.get("url"), str) else ""
    return {
        "state": state,
        "symbol": CI_SYMBOLS.get(state, UNKNOWN_SYMBOL),
        "commit": commit[:7],
        "event": run.get("event") if isinstance(run.get("event"), str) else "",
        "ago": format_ago((now - when).total_seconds()) if when else "",
        #: Only an http(s) link is offered; the shell opens nothing else.
        "url": url if url.startswith(("https://", "http://")) else "",
        "failing_tests": _strings(run.get("failing_tests")),
        "failing_jobs": _strings(run.get("failing_jobs")),
    }


def ci_payload(project_root: Path, *, now: datetime | None = None) -> dict[str, Any]:
    """The latest CI run of each workflow, as the Tests page draws it.

    Each workflow carries its ``latest`` run's reading. While that run is
    still going and the one before it failed, ``previous`` carries the failed
    one: TEST-RUNS.md keeps a workflow red until a later run succeeds, and a
    running row that hid the failure would read as recovered.
    """
    root = Path(project_root)
    shown = ".project-os/ci/latest.json"
    status, data = _read_json(ci_dir(root) / "latest.json", CI_FORMAT)
    if status == "absent":
        return {"state": "absent", "message": NO_CI, "file": shown}
    if status == "unreadable":
        return {"state": "unreadable", "message": f"{shown} {data}.", "file": shown}
    now = now or datetime.now(timezone.utc)
    workflows: list[dict[str, Any]] = []
    for wf in data.get("workflows") if isinstance(data.get("workflows"), list) else []:
        if not isinstance(wf, dict):
            continue
        latest = _ci_run(wf.get("latest"), now)
        finished = _ci_run(wf.get("last_finished"), now)
        if latest is None:
            latest = finished
        if latest is None:
            continue
        last_conclusion = (wf.get("last_finished") or {}).get("conclusion") \
            if isinstance(wf.get("last_finished"), dict) else None
        previous = None
        if latest["state"] == "running" and finished and finished["state"] == "failed":
            previous = finished
        workflows.append({
            "name": wf.get("name") if isinstance(wf.get("name"), str) else "",
            "red": last_conclusion in CI_RED,
            **latest,
            "previous": previous,
        })
    fetched = _parse_time(data.get("fetched"))
    error = data.get("error") if isinstance(data.get("error"), str) else ""
    return {
        "state": "ok",
        "file": shown,
        "branch": data.get("branch") if isinstance(data.get("branch"), str) else "",
        "fetched_ago": format_ago((now - fetched).total_seconds()) if fetched else "",
        "error": error.strip().splitlines()[0] if error.strip() else "",
        "workflows": workflows,
    }


def payload(project_root: Path, **kwargs: Any) -> dict[str, Any]:
    """Both readings, for ``GET /api/cockpit/test-run``."""
    ci_kwargs = {k: v for k, v in kwargs.items() if k == "now"}
    return {
        "run": run_payload(project_root, **kwargs),
        "ci": ci_payload(project_root, **ci_kwargs),
    }


# ---- the watcher ------------------------------------------------------------


class _LatestHandler(FileSystemEventHandler):
    """One folder's ``latest.json``: created, replaced, changed or removed."""

    def __init__(self, what: str, on_change: Callable[[str], None]) -> None:
        self._what = what
        self._on_change = on_change

    def on_any_event(self, event: FileSystemEvent) -> None:
        if event.is_directory:
            return
        # The writers replace the file by renaming a temporary file over it,
        # so the name is often only on the move's destination.
        for raw in (event.src_path, getattr(event, "dest_path", None)):
            if raw and Path(str(raw)).name == "latest.json":
                self._on_change(self._what)
                return


class TestRunWatcher:
    """Publishes ``cockpit:test-run`` when either ``latest.json`` changes.

    ``.project-os/`` sits beside ``docs/``, outside the main watcher, as
    ``SNAPSHOT.yaml`` does, so this is its own observer, like the validation
    runner's.

    **Not recursive.** ``runs/`` holds each run's logs, which grow on every
    line a test prints; a recursive watch would wake on each of them to find
    one file it cares about. ``runs/`` and ``ci/`` are each watched alone.

    **The folders may not exist yet.** A repo that has never run
    ``run-tests.py`` has no ``.project-os/``, and this must not create it. So
    every ``rearm_seconds`` a small thread watches any folder that has
    appeared, and publishes once if it already holds a ``latest.json``: the
    first run's file is usually written before the watch can attach.
    """

    __test__ = False   # a class named Test* is not a pytest case

    def __init__(
        self,
        project_root: Path,
        bus: EventBus,
        *,
        debounce_seconds: float = 0.25,
        rearm_seconds: float = 3.0,
    ) -> None:
        # Canonical case, as the validation runner's observer: FSEvents is
        # case-sensitive and a miscased root never fires (ISS-0072).
        self.project_root = canonical_case(Path(project_root))
        self._bus = bus
        self._debounce = debounce_seconds
        self._rearm = rearm_seconds
        self._lock = threading.Lock()
        self._observer: Observer | None = None
        self._watches: dict[str, Any] = {}
        self._pending: set[str] = set()
        self._timer: threading.Timer | None = None
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def _folders(self) -> dict[str, Path]:
        return {"run": runs_dir(self.project_root), "ci": ci_dir(self.project_root)}

    def start(self) -> None:
        if self._observer is not None:
            return
        observer = Observer()
        observer.daemon = True
        observer.start()
        self._observer = observer
        self._stop.clear()
        self.arm(announce=False)
        thread = threading.Thread(
            target=self._rearm_loop, name="cockpit-test-run-rearm", daemon=True,
        )
        thread.start()
        self._thread = thread
        log.info("test runs: watching %s/.project-os/{runs,ci}", self.project_root)

    def stop(self) -> None:
        self._stop.set()
        with self._lock:
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None
        if self._observer is not None:
            self._observer.stop()
            self._observer.join(timeout=2.0)
            self._observer = None
            self._watches.clear()

    def arm(self, *, announce: bool = True) -> None:
        """Watch each folder that exists and is not watched yet.

        A folder that has gone is unwatched, so it is watched again when it
        comes back. ``announce`` publishes for a newly watched folder that
        already holds a ``latest.json``.
        """
        observer = self._observer
        if observer is None:
            return
        for what, folder in self._folders().items():
            watch = self._watches.get(what)
            if watch is not None and not folder.is_dir():
                try:
                    observer.unschedule(watch)
                except (KeyError, ValueError, OSError):
                    pass
                self._watches.pop(what, None)
                self.changed(what)
                continue
            if watch is None and folder.is_dir():
                try:
                    self._watches[what] = observer.schedule(
                        _LatestHandler(what, self.changed), str(folder), recursive=False,
                    )
                except OSError:
                    log.exception("test runs: could not watch %s", folder)
                    continue
                if announce and (folder / "latest.json").exists():
                    self.changed(what)

    def _rearm_loop(self) -> None:
        while not self._stop.wait(self._rearm):
            try:
                self.arm()
            except Exception:  # noqa: BLE001 -- the loop must outlive one bad pass
                log.exception("test runs: re-arm failed")

    def changed(self, what: str) -> None:
        """Note that ``what`` (``run`` or ``ci``) changed; publish soon.

        Coalesced: the runner may rewrite its file several times a second
        while progress lines arrive, and one event per burst is enough for a
        page that re-fetches the whole reading.
        """
        with self._lock:
            self._pending.add(what)
            if self._timer is not None:
                return
            timer = threading.Timer(self._debounce, self._flush)
            timer.daemon = True
            timer.name = "cockpit-test-run-debounce"
            self._timer = timer
            timer.start()

    def _flush(self) -> None:
        with self._lock:
            what = sorted(self._pending)
            self._pending.clear()
            self._timer = None
        if what:
            self._bus.publish(ControlEvent(SSE_EVENT, {"what": what}))
