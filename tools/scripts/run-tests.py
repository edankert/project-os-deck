#!/usr/bin/env python3
"""Run every TST-* note's `command:` and report the outcome.

A test that carries a `command:` records no verdict on its note (project-os-dev
ADR-0025; STATUSES.md [[test]]): this script runs it, prints passing / failing /
unrunnable per test, and exits 1 on any failure. In CI that exit code is the
verdict. It never writes to a note. An unrunnable command (exit 127, a missing
tool, a timeout) is an environment gap locally, reported and not counted as a
failure; in CI (the `CI` variable set) it fails the run, because a test CI
cannot run has no verdict, unless PROJECT_OS_ALLOW_UNRUNNABLE=1 accepts that.

Notes that share a `command:` run it once and share the outcome: a second run of
the same command in the same tree cannot reach a different verdict.

A note at `status: retired` is skipped, even when `--filter` names it: its subject
is gone (STATUSES.md [[test]]), and its command often names a file deleted with it
(project-os-dev ISS-0105).

While it runs it keeps a progress file, `.project-os/runs/latest.json`, and one
log per command beside it, so another terminal, the status line or the cockpit
can see how far it has got (project-os-dev FEAT-0042). The format is defined in
tools/instructions/TEST-RUNS.md. The progress file is runtime state, not a
verdict, and `.project-os/` is never committed.

Usage: run-tests.py [--repo-root DIR] [--filter TST-0001 ...] [--timeout SECONDS]
                    [--source pre-push|local|ci]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

DEFAULT_TIMEOUT = 600
# How much of a failing command's output to echo, so CI says *why* it failed.
FAILURE_OUTPUT_LINES = 40
# How long a timed-out command's process group gets between TERM and KILL.
KILL_GRACE = float(os.environ.get("PROJECT_OS_TEST_KILL_GRACE", "10"))
# How often a running command's progress line is looked at.
PROGRESS_POLL = 1.0
RUNS_KEPT = 5
FORMAT = "project-os/test-run"
VERSION = 1


def split_frontmatter(text):
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    return text[:4], text[4:end], text[end:]


def fm_get(fm, key):
    m = re.search(r"^%s:\s*(.*)$" % re.escape(key), fm, re.M)
    if not m:
        return ""
    return m.group(1).strip().strip('"').strip("'")


def ci_suite_command(root):
    """The one command CI runs for this repo, or "" when none is declared.

    **A repo's test notes usually carry filtered commands, and CI should not run
    them one by one.** your-health has 26 notes whose command is the same Gradle
    task with different `--tests` filters, each a subset of the whole suite: 26
    cold runs for an answer one run already gives. A repo declares the covering
    command in `SNAPSHOT.yaml`, and CI runs that instead:

        ci:
          suite_command: "./gradlew test --rerun-tasks"

    Declaring nothing keeps the old behaviour — every command runs — so a repo
    that has not thought about this loses no checking.
    """
    try:
        text = (root / "SNAPSHOT.yaml").read_text(encoding="utf-8")
    except OSError:
        return ""
    block = re.search(r"^ci:[ \t]*$((?:\n(?:[ \t]+.*)?)*)", text, re.M)
    if not block:
        return ""
    line = re.search(r"^[ \t]+suite_command:[ \t]*(.+?)[ \t]*$", block.group(1), re.M)
    if not line:
        return ""
    return line.group(1).strip().strip('"').strip("'")


def discover(root, only=None):
    out = []
    docs = root / "docs"
    if not docs.is_dir():
        return out
    for path in sorted(docs.rglob("*.md")):
        if "__templates__" in path.parts:
            continue
        if not re.match(r"^TST-\d+", path.name):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        parts = split_frontmatter(text)
        if not parts:
            continue
        _pre, fm, _post = parts
        cmd = fm_get(fm, "command")
        if not cmd:
            continue
        if fm_get(fm, "status") == "retired":
            continue
        tid = fm_get(fm, "id") or path.name.split("-")[0] + "-" + path.name.split("-")[1]
        if only and tid not in only:
            continue
        out.append((path, tid, cmd))
    return out


# ---------------------------------------------------------------------------
# The progress file (tools/instructions/TEST-RUNS.md)


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def save_json(path, data):
    """Write `data` to `path` so a reader never sees half a file: a temporary
    file in the same folder, then a rename over the old one."""
    tmp = path.with_name(".%s.%d.tmp" % (path.name, os.getpid()))
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    os.replace(tmp, path)


def state_dir(root):
    """`.project-os/`, created with a `.gitignore` of `*`: the repo's own
    `.gitignore` belongs to the project and the sync never edits it, so the
    folder keeps itself out of git."""
    d = root / ".project-os"
    d.mkdir(exist_ok=True)
    ignore = d / ".gitignore"
    if not ignore.exists():
        with open(ignore, "w", encoding="utf-8") as fh:
            fh.write("# Runtime state from project-os scripts (tools/instructions/TEST-RUNS.md); never committed.\n*\n")
    return d


def git_line(root, *args):
    try:
        out = subprocess.run(["git", *args], cwd=str(root), capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return out.stdout.strip() if out.returncode == 0 else ""


def default_source():
    ci_value = (os.environ.get("CI") or "").strip().lower()
    return "ci" if ci_value not in ("", "0", "false", "no") else "local"


def newest_progress(path):
    """The newest line in a command's progress file that parses, keeping only
    the keys TEST-RUNS.md names, or None."""
    if path is None:
        return None
    try:
        size = path.stat().st_size
        with open(path, "rb") as fh:
            fh.seek(max(0, size - 8192))
            chunk = fh.read()
    except OSError:
        return None
    for raw in reversed(chunk.splitlines()):
        try:
            obj = json.loads(raw.decode("utf-8", "replace"))
        except ValueError:
            continue
        if not isinstance(obj, dict):
            continue
        line = {}
        for key in ("done", "total", "failed"):
            if isinstance(obj.get(key), int) and not isinstance(obj.get(key), bool):
                line[key] = obj[key]
        if isinstance(obj.get("now"), str):
            line["now"] = obj["now"][:120]
        if line:
            return line
    return None


class Progress:
    """The run's progress file and its folder: `.project-os/runs/<id>/` with
    `run.json`, `logs/` and `progress/`, and `runs/latest.json` beside them."""

    def __init__(self, root, source, groups):
        self.root = root
        self.runs = state_dir(root) / "runs"
        self.runs.mkdir(exist_ok=True)
        run_id = "%s-%d" % (time.strftime("%Y%m%dT%H%M%SZ", time.gmtime()), os.getpid())
        self.dir = self.runs / run_id
        for sub in ("logs", "progress"):
            (self.dir / sub).mkdir(parents=True, exist_ok=True)
        # A runner started by one of this runner's own commands, on the same
        # repo, keeps its own folder and leaves latest.json to the outer run.
        self.nested = os.environ.get("PROJECT_OS_TEST_RUN_ROOT") == str(root)
        self.data = {
            "format": FORMAT,
            "version": VERSION,
            "id": run_id,
            "repo": root.name,
            "source": source,
            "commit": os.environ.get("GITHUB_SHA") or git_line(root, "rev-parse", "HEAD"),
            "branch": os.environ.get("GITHUB_HEAD_REF") or os.environ.get("GITHUB_REF_NAME")
                      or git_line(root, "rev-parse", "--abbrev-ref", "HEAD"),
            "host": socket.gethostname(),
            "pid": os.getpid(),
            "started": now_iso(),
            "updated": now_iso(),
            "finished": None,
            "state": "running",
            "commands": [],
        }
        for n, (cmd, tids) in enumerate(groups, 1):
            self.data["commands"].append({
                "index": n, "tests": tids, "command": cmd, "state": "waiting",
                "started": None, "seconds": None, "exit": None, "reason": "",
                "log": self.rel(self.log_path(n)), "progress": None,
            })
        self.save()
        if not self.nested:
            self.prune()

    def rel(self, path):
        return path.relative_to(self.root).as_posix()

    def log_path(self, n):
        return self.dir / "logs" / ("%03d.log" % n)

    def progress_path(self, n):
        return self.dir / "progress" / ("%03d.jsonl" % n)

    def entry(self, n):
        return self.data["commands"][n - 1]

    def save(self):
        self.data["updated"] = now_iso()
        try:
            save_json(self.dir / "run.json", self.data)
            if not self.nested:
                save_json(self.runs / "latest.json", self.data)
        except OSError:
            # A progress file that cannot be written must not fail the tests.
            pass

    def finish(self, state):
        self.data["state"] = state
        self.data["finished"] = now_iso()
        self.save()

    def prune(self):
        dirs = sorted((p for p in self.runs.iterdir() if p.is_dir()), key=lambda p: p.name)
        for old in dirs[:-RUNS_KEPT]:
            shutil.rmtree(old, ignore_errors=True)


# ---------------------------------------------------------------------------
# Running one command


class Interrupted(Exception):
    """The runner was sent INT, TERM or HUP."""

    def __init__(self, signum):
        super().__init__(signum)
        self.signum = signum


def _raise_interrupted(signum, _frame):
    raise Interrupted(signum)


def stop_group(proc, grace):
    """Stop the command and everything it started: TERM to its whole process
    group, then KILL after `grace` seconds. Each command starts a session of its
    own, so its group is its pid. Killing only the shell `shell=True` starts left
    ./gradlew and its test worker running for 18 hours in your-trainer
    (project-os-dev TASK-0212)."""
    pgid = proc.pid
    for sig, wait in ((signal.SIGTERM, grace), (signal.SIGKILL, 5.0)):
        try:
            os.killpg(pgid, sig)
        except (ProcessLookupError, PermissionError):
            break
        end = time.monotonic() + wait
        while time.monotonic() < end:
            proc.poll()
            try:
                os.killpg(pgid, 0)
            except (ProcessLookupError, PermissionError):
                proc.poll()
                return
            time.sleep(0.1)
    proc.poll()


def tail_lines(path, n):
    try:
        size = path.stat().st_size
        with open(path, "rb") as fh:
            fh.seek(max(0, size - 65536))
            chunk = fh.read()
    except OSError:
        return []
    return chunk.decode("utf-8", "replace").strip().splitlines()[-n:]


def run_one(root, cmd, timeout, progress=None, n=0):
    """Return (outcome, exit_code, detail, output_lines), where outcome is
    passing, failing, unrunnable or timed_out. The command's whole output goes
    to its log; its entry in the progress file follows it as it runs."""
    entry = progress.entry(n) if progress else None
    log_path = progress.log_path(n) if progress else None
    progress_path = progress.progress_path(n) if progress else None
    env = {**os.environ, "PROJECT_OS_TEST_RUN": "1", "PROJECT_OS_TEST_RUN_ROOT": str(root)}
    if progress_path:
        env["PROJECT_OS_TEST_PROGRESS"] = str(progress_path)
    if entry is not None:
        entry.update(state="running", started=now_iso())
        progress.save()
    began = time.monotonic()

    def done(outcome, code, detail, lines):
        if entry is not None:
            entry.update(state=outcome, exit=code, reason=detail[:200],
                         seconds=round(time.monotonic() - began, 1))
            entry["progress"] = newest_progress(progress_path) or entry["progress"]
            progress.save()
        return outcome, code, detail, lines

    # Without a progress folder the output still needs somewhere to go and be
    # read back from; a temporary log stands in.
    scratch = None
    if log_path is None:
        import tempfile
        fd, scratch = tempfile.mkstemp(prefix="run-tests-", suffix=".log")
        os.close(fd)
        log_path = Path(scratch)
    try:
        with open(log_path, "wb") as log:
            try:
                proc = subprocess.Popen(cmd, shell=True, cwd=str(root), stdout=log, stderr=subprocess.STDOUT,
                                        env=env, start_new_session=True)
            except OSError as exc:
                return done("unrunnable", None, "could not execute: %s" % exc, [])
            deadline = began + timeout
            seen = None
            try:
                while True:
                    try:
                        code = proc.wait(timeout=max(0.0, min(PROGRESS_POLL, deadline - time.monotonic())))
                        break
                    except subprocess.TimeoutExpired:
                        if time.monotonic() >= deadline:
                            stop_group(proc, KILL_GRACE)
                            return done("timed_out", None, "timed out after %ss" % timeout, [])
                        line = newest_progress(progress_path)
                        if entry is not None and line and line != seen:
                            seen = entry["progress"] = line
                            progress.save()
            except (Interrupted, KeyboardInterrupt):
                stop_group(proc, min(KILL_GRACE, 5.0))
                if entry is not None:
                    entry.update(state="interrupted", reason="the runner was stopped",
                                 seconds=round(time.monotonic() - began, 1))
                raise
        lines = tail_lines(log_path, FAILURE_OUTPUT_LINES)
    finally:
        if scratch:
            os.unlink(scratch)
    # 127 is the shell's "command not found"; treat as environmental, not a failure.
    if code == 127:
        head = lines[:1]
        return done("unrunnable", 127, "command not found%s" % (": " + head[0] if head else ""), [])
    tail = lines[-1:]
    outcome = "passing" if code == 0 else "failing"
    # A verdict nobody can diagnose is a poor verdict. On a failure the logged
    # output is what says whether the code is wrong or the runner is missing a
    # toolchain -- a CI run reported only "failing  ./gradlew test" and the log
    # held nothing else.
    if outcome == "failing" and lines:
        return done(outcome, code, (tail[0] if tail else ""), lines)
    return done(outcome, code, (tail[0] if tail else ""), [])


def printed(outcome):
    """A timed-out command prints and counts as unrunnable, as before the
    progress file existed; only the progress file tells the two apart."""
    return "unrunnable" if outcome == "timed_out" else outcome


def ci_strict():
    ci_value = (os.environ.get("CI") or "").strip().lower()
    return ci_value not in ("", "0", "false", "no") and not os.environ.get("PROJECT_OS_ALLOW_UNRUNNABLE")


def open_progress(root, source, groups):
    """The run's progress file, or None when `.project-os/` cannot be written:
    watching a run is a convenience, and must never stop the tests running."""
    try:
        progress = Progress(root, source, groups)
    except OSError as exc:
        print("   note: no progress file (%s)" % exc)
        return None
    if not progress.nested:
        print("   progress: %s (watch it with python3 tools/scripts/test-status.py)"
              % progress.rel(progress.runs / "latest.json"))
    return progress


def main(argv=None):
    ap = argparse.ArgumentParser(description="Run every TST-* command: and report; CI is the verdict (ADR-0025).")
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--filter", action="append", default=None, help="Only these TST ids")
    ap.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    ap.add_argument("--ci", action="store_true",
                    help="Run the repo's declared ci.suite_command once instead of every "
                         "TST-* command; falls back to running them all when none is declared.")
    ap.add_argument("--source", choices=("pre-push", "local", "ci"), default=None,
                    help="What started this run, recorded in the progress file "
                         "(default: ci when CI is set, else local).")
    args = ap.parse_args(argv)
    # Each line reaches a file or pipe as it is printed. Fully buffered, the
    # pre-push hook's log grew in 8 KB steps, and a failure in the first minutes
    # was not seen for over an hour (project-os-dev TASK-0212).
    try:
        sys.stdout.reconfigure(line_buffering=True)
    except (AttributeError, ValueError):
        pass

    root = Path(args.repo_root).resolve()
    if not (root / "SNAPSHOT.yaml").is_file():
        print("run-tests: no SNAPSHOT.yaml at %s" % root, file=sys.stderr)
        return 2

    tests = discover(root, set(args.filter) if args.filter else None)
    if not tests:
        print("run-tests: %s — no TST-* notes declare a `command:`" % root.name)
        return 0

    # Each command runs in a process group of its own, so Ctrl-C at the
    # terminal no longer reaches it. The runner stops it instead (RISK-0008).
    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        try:
            signal.signal(sig, _raise_interrupted)
        except (ValueError, OSError):
            pass
    try:
        return run_all(root, tests, args, args.source or default_source())
    except (Interrupted, KeyboardInterrupt) as exc:
        print("   interrupted: the running command and everything it started were stopped")
        return 128 + int(getattr(exc, "signum", signal.SIGINT))


def run_all(root, tests, args, source):
    # ADR-0025 (project-os-dev): the runner never writes to a note. A test
    # with a command: records no verdict; this exit code, in CI, is the verdict.
    suite = ci_suite_command(root) if args.ci else ""
    if suite:
        # The declared command covers what the filtered ones check, so running it
        # is the verdict for all of them. The notes still exist and still run in
        # full locally; this is the one non-bypassable run, not a smaller one.
        print("== RUN  %s (ci: the declared suite, covering %d test note(s)) =="
              % (root.name, len(tests)))
        progress = open_progress(root, source, [(suite, [tid for _p, tid, _c in tests])])
        try:
            outcome, _code, detail, output = run_one(root, suite, args.timeout, progress, 1)
        except (Interrupted, KeyboardInterrupt):
            if progress:
                progress.finish("interrupted")
            raise
        outcome = printed(outcome)
        print("   %-12s %-10s %s%s"
              % ("ci.suite", outcome, suite[:48], ("  — " + detail[:60]) if detail else ""))
        for line in output:
            print("      | %s" % line)
        if outcome == "passing":
            verdict = 0
        elif outcome == "failing":
            verdict = 1
        elif ci_strict():
            print("   CI could not run the declared suite, so it has no verdict")
            verdict = 1
        else:
            print("   note: an unrunnable suite is an environment gap, not a failure")
            verdict = 0
        if progress:
            progress.finish("passing" if verdict == 0 else "failing")
        return verdict
    if args.ci:
        print("   note: no ci.suite_command in SNAPSHOT.yaml; running every command")

    # Two notes may carry the same command:, and several usually do — a suite-wide
    # command belongs on every test it verifies. Running it a second time cannot
    # reach a different verdict, so the first run's outcome is reused. Nine repos
    # ran one Gradle suite twenty-nine times before this existed; at the default
    # timeout that is hours of CI for one answer.
    groups = {}
    for _path, tid, cmd in tests:
        groups.setdefault(cmd, []).append(tid)
    order = {cmd: n for n, cmd in enumerate(groups, 1)}

    counts = {"passing": 0, "failing": 0, "unrunnable": 0}
    already = {}
    print("== RUN  %s ==" % root.name)
    progress = open_progress(root, source, list(groups.items()))
    try:
        for _path, tid, cmd in tests:
            seen = already.get(cmd)
            if seen is None:
                outcome, _code, detail, output = run_one(root, cmd, args.timeout, progress, order[cmd])
                outcome = printed(outcome)
                already[cmd] = (outcome, detail, tid)
                note = ""
            else:
                outcome, detail, first = seen
                note = "  (same command as %s)" % first
                output = []
            counts[outcome] += 1
            print("   %-12s %-10s %s%s%s" % (
                tid, outcome, cmd[:48], ("  — " + detail[:60]) if detail and not note else "", note))
            for line in output:
                print("      | %s" % line)
    except (Interrupted, KeyboardInterrupt):
        if progress:
            progress.finish("interrupted")
        raise

    print("   passing=%(passing)d failing=%(failing)d unrunnable=%(unrunnable)d" % counts)
    if len(already) < len(tests):
        print("   %d command(s) ran; %d note(s) shared a result"
              % (len(already), len(tests) - len(already)))
    # Locally an unrunnable command (a missing sibling checkout, a missing
    # tool, a timeout) is an environment gap and not a failure. In CI it is a
    # red build, because CI is the verdict and a test CI cannot run has none;
    # set PROJECT_OS_ALLOW_UNRUNNABLE=1 to accept the gap deliberately.
    in_ci = ci_strict()
    if counts["unrunnable"]:
        if in_ci:
            print("   CI cannot run these tests, so they have no verdict; check out what they need "
                  "(a sibling ../project-os for cross-repo commands) or set PROJECT_OS_ALLOW_UNRUNNABLE=1")
        else:
            print("   note: an unrunnable test is an environment gap, not a failure")
    verdict = 1 if counts["failing"] or (in_ci and counts["unrunnable"]) else 0
    if progress:
        progress.finish("passing" if verdict == 0 else "failing")
    return verdict


if __name__ == "__main__":
    sys.exit(main())
