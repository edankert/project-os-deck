#!/usr/bin/env python3
"""Show a test run's progress, in a terminal or as one status-line segment.

Reads only `.project-os/runs/latest.json`, which run-tests.py rewrites as it
goes, and `.project-os/ci/latest.json`, which ci-status.py saves. It never runs
a test and never calls the network, so it can run in a second terminal while a
push sits in the pre-push hook (project-os-dev FEAT-0042). The formats are in
tools/instructions/TEST-RUNS.md.

    your-trainer · pre-push · 1h10m · 44 of 139 commands
    ■■■■■■■■■■■■■■■■■■■■✗■■■■■■■■■■■■■■■■■■■■■■■▶□□□□□□□□□□□□□□□□□□
    ✗ TST-0022  failing  iOS app killed before the test runner connected
    ⏱ TST-0679  timed out  after 600s
    ▶ TST-0270  running    8m30s  12/60 AddRiderFlowTest

Usage:
  test-status.py [--repo-root DIR]            watch on a terminal, else print once
  test-status.py --watch | --once
  test-status.py --segment                    one short line for a status line, or nothing

`--segment` prints e.g. `tests 44/139 ✗1 ⏱2 ▶ TST-0270 8m · CI ✗ android-tests
8bf1562`. Given Claude Code's status-line JSON on stdin, it finds the repo from
the JSON's workspace folder (tools/adapters/claude-code/ADAPTER.md, "Tests and
CI on the status line").
"""

from __future__ import annotations

import argparse
import calendar
import importlib.util
import json
import os
import select
import shutil
import socket
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
VERSION = 1
GLYPH = {"passing": "■", "failing": "✗", "timed_out": "⧗", "unrunnable": "?",
         "running": "▶", "waiting": "□", "interrupted": "‖"}
# The grid keeps to one-column glyphs so its rows wrap evenly; the lines under
# it may use the wider ⏱.
LINE_GLYPH = {**GLYPH, "timed_out": "⏱"}
LABEL = {"timed_out": "timed out", "interrupted": "stopped"}
COLOUR = {"passing": "32", "failing": "31", "timed_out": "33", "unrunnable": "35",
          "running": "36", "waiting": "2", "interrupted": "31"}
# The order of the lines under the blocks: what needs looking at first.
LISTED = ("failing", "interrupted", "timed_out", "unrunnable", "running")


def load_ci_status():
    """ci-status.py, loaded as a module: the rule for when a workflow is red is
    stated there once."""
    spec = importlib.util.spec_from_file_location("_ci_status", HERE / "ci-status.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def parse_time(text):
    if not text:
        return None
    try:
        return calendar.timegm(time.strptime(text, "%Y-%m-%dT%H:%M:%SZ"))
    except (TypeError, ValueError):
        return None


def span(seconds):
    """8m30s, 1h10m or 45s."""
    s = int(max(0, seconds or 0))
    if s < 60:
        return "%ds" % s
    if s < 3600:
        return "%dm%02ds" % (s // 60, s % 60) if s % 60 else "%dm" % (s // 60)
    return "%dh%02dm" % (s // 3600, (s % 3600) // 60)


def short_span(seconds):
    """The status line's spelling: 45s, 8m, 1h10m."""
    s = int(max(0, seconds or 0))
    if s < 60:
        return "%ds" % s
    if s < 3600:
        return "%dm" % (s // 60)
    return "%dh%02dm" % (s // 3600, (s % 3600) // 60)


def find_root(start):
    """The repo root at or above `start`: the first folder holding SNAPSHOT.yaml
    or `.project-os/`."""
    p = Path(start).resolve()
    for d in (p, *p.parents):
        if (d / "SNAPSHOT.yaml").is_file() or (d / ".project-os").is_dir():
            return d
    return p


def read_json(path):
    """(data, problem): the file's content, or None and why it is not shown."""
    try:
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
    except FileNotFoundError:
        return None, "missing"
    except (OSError, ValueError) as exc:
        return None, "unreadable (%s)" % exc
    if not isinstance(data, dict):
        return None, "unreadable"
    if data.get("version") != VERSION:
        return None, "format version %r, which this script does not know" % data.get("version")
    return data, ""


def runner_gone(run):
    """Whether a run that says `running` lost its runner: same host, pid dead."""
    if run.get("state") != "running" or run.get("host") != socket.gethostname():
        return False
    try:
        os.kill(int(run.get("pid")), 0)
    except ProcessLookupError:
        return True
    except (PermissionError, TypeError, ValueError, OSError):
        return False
    return False


def run_state(run):
    return "stopped" if runner_gone(run) else run.get("state") or "running"


def counts(run):
    out = {}
    for c in run.get("commands") or []:
        out[c.get("state")] = out.get(c.get("state"), 0) + 1
    return out


def elapsed(run, now):
    start = parse_time(run.get("started"))
    if start is None:
        return 0
    end = parse_time(run.get("finished"))
    if end is None and run_state(run) == "stopped":
        end = parse_time(run.get("updated"))
    return (end or now) - start


def tests_label(c, width=9):
    ids = c.get("tests") or []
    label = ids[0] if ids else "#%s" % c.get("index")
    if len(ids) > 1:
        label += " +%d" % (len(ids) - 1)
    return label.ljust(width)


def progress_text(c):
    p = c.get("progress") or {}
    parts = []
    if isinstance(p.get("done"), int):
        parts.append("%d/%d" % (p["done"], p["total"]) if isinstance(p.get("total"), int) else "%d done" % p["done"])
    if p.get("failed"):
        parts.append("✗%d" % p["failed"])
    if p.get("now"):
        parts.append(str(p["now"]))
    return " ".join(parts)


def paint(text, state, colour):
    return "\x1b[%sm%s\x1b[0m" % (COLOUR[state], text) if colour and state in COLOUR else text


def view(run, now, width=80, colour=False):
    """The terminal view's lines."""
    commands = run.get("commands") or []
    finished = sum(1 for c in commands if c.get("state") not in ("waiting", "running"))
    state = run_state(run)
    head = [run.get("repo") or "?", run.get("source") or "?", span(elapsed(run, now)),
            "%d of %d commands" % (finished, len(commands))]
    if state != "running":
        head.append(state)
    lines = [" · ".join(head)]
    cells = [paint(GLYPH.get(c.get("state"), "·"), c.get("state"), colour) for c in commands]
    step = max(10, width)
    for i in range(0, len(cells), step):
        lines.append("".join(cells[i:i + step]))
    listed = [c for wanted in LISTED for c in commands if c.get("state") == wanted]
    label_width = max([9] + [len(tests_label(c, 0)) for c in listed])
    for c in listed:
        wanted = c.get("state")
        if wanted == "running":
            started = parse_time(c.get("started"))
            what = "running    %s" % span(now - started if started else 0)
            extra = progress_text(c)
        else:
            what = LABEL.get(wanted, wanted).ljust(10)
            extra = c.get("reason") or ""
            if wanted == "timed_out" and extra.startswith("timed out "):
                extra = extra[len("timed out "):]
        line = "%s %s %s  %s" % (LINE_GLYPH[wanted], tests_label(c, label_width), what.rstrip(), extra)
        lines.append(paint(line.rstrip()[:max(width, 40)], wanted, colour))
    if any(c.get("state") in ("failing", "timed_out", "interrupted") for c in commands):
        lines.append("logs: %s" % os.path.dirname(commands[0].get("log") or "") + "/")
    return lines


def tests_segment(run, now):
    """`tests 44/139 ✗1 ⏱2 ▶ TST-0270 8m` while a run runs; the failures of a
    run that ended failing; "" for a run that passed."""
    commands = run.get("commands") or []
    n = counts(run)
    state = run_state(run)
    marks = []
    if n.get("failing", 0) + n.get("interrupted", 0):
        marks.append("✗%d" % (n.get("failing", 0) + n.get("interrupted", 0)))
    if n.get("timed_out"):
        marks.append("⏱%d" % n["timed_out"])
    if state == "running":
        finished = sum(1 for c in commands if c.get("state") not in ("waiting", "running"))
        parts = ["tests %d/%d" % (finished, len(commands))] + marks
        for c in commands:
            if c.get("state") == "running":
                started = parse_time(c.get("started"))
                parts.append("▶ %s" % tests_label(c, 0))
                p = c.get("progress") or {}
                if isinstance(p.get("done"), int) and isinstance(p.get("total"), int):
                    parts.append("%d/%d" % (p["done"], p["total"]))
                parts.append(short_span(now - started if started else 0))
                break
        return " ".join(parts)
    if state in ("stopped", "interrupted"):
        finished = sum(1 for c in commands if c.get("state") not in ("waiting", "running", "interrupted"))
        return " ".join(["tests stopped %d/%d" % (finished, len(commands))] + marks)
    if state == "failing":
        bad = [c for c in commands if c.get("state") in ("failing", "timed_out", "unrunnable")]
        first = tests_label(bad[0], 0) if bad else ""
        return " ".join(["tests"] + (marks or ["✗"]) + ([first] if first else []))
    return ""


def segment(root, now):
    parts = []
    run, _problem = read_json(root / ".project-os" / "runs" / "latest.json")
    if run:
        text = tests_segment(run, now)
        if text:
            parts.append(text)
    try:
        ci = load_ci_status()
        text = ci.segment_text(ci.load(root))
    except Exception:  # a broken CI file must not take the tests segment with it
        text = ""
    if text:
        parts.append(text)
    return " · ".join(parts)


def status_line_root():
    """The repo a Claude Code status line is drawn for, from the JSON it pipes
    in, or None. Waits a moment at most, so a caller with nothing to say on
    stdin never hangs the line."""
    if sys.stdin is None or sys.stdin.isatty():
        return None
    try:
        ready, _w, _x = select.select([sys.stdin], [], [], 0.2)
        if not ready:
            return None
        data = json.loads(sys.stdin.read() or "{}")
    except (OSError, ValueError):
        return None
    ws = data.get("workspace") or {}
    for key in (ws.get("project_dir"), ws.get("current_dir"), data.get("cwd")):
        if isinstance(key, str) and key:
            return key
    return None


def main(argv=None):
    ap = argparse.ArgumentParser(description="Show a test run's progress from .project-os/runs/latest.json.")
    ap.add_argument("--repo-root", default=None)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--watch", action="store_true", help="redraw every second until Ctrl-C")
    mode.add_argument("--once", action="store_true", help="print the view once")
    mode.add_argument("--segment", action="store_true", help="print one short status-line segment, or nothing")
    ap.add_argument("--file", default=None, help="a run file to show instead of the repo's latest.json")
    ap.add_argument("--interval", type=float, default=1.0)
    args = ap.parse_args(argv)

    start = args.repo_root or (status_line_root() if args.segment else None) or os.getcwd()
    root = find_root(start) if not args.repo_root else Path(args.repo_root).resolve()

    if args.segment:
        text = segment(root, time.time())
        if text:
            print(text)
        return 0

    path = Path(args.file) if args.file else root / ".project-os" / "runs" / "latest.json"
    watch = args.watch or (not args.once and sys.stdout.isatty())
    colour = sys.stdout.isatty() and not os.environ.get("NO_COLOR")
    if not watch:
        run, problem = read_json(path)
        if not run:
            print("test-status: no test run to show: %s is %s. python3 tools/scripts/run-tests.py writes one."
                  % (os.path.relpath(path), problem))
            return 0
        print("\n".join(view(run, time.time(), shutil.get_terminal_size((80, 24)).columns, colour)))
        return 0
    try:
        while True:
            run, problem = read_json(path)
            width = shutil.get_terminal_size((80, 24)).columns
            if run:
                lines = view(run, time.time(), width, colour)
            else:
                lines = ["waiting for a test run: %s is %s" % (os.path.relpath(path), problem)]
            sys.stdout.write("\x1b[H\x1b[J" + "\n".join(lines) + "\n\n(Ctrl-C to stop)\n")
            sys.stdout.flush()
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print()
        return 0


if __name__ == "__main__":
    sys.exit(main())
