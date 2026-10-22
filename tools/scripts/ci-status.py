#!/usr/bin/env python3
"""Fetch the latest CI run of each workflow on the current branch, and say
which failed.

Uses `gh run list` and, for a failed run, the `project-os-test-run-*` artifact
the workflow uploaded (the run file run-tests.py wrote in CI), so a red run
names its failing tests. The result is saved to `.project-os/ci/latest.json`
(format in tools/instructions/TEST-RUNS.md), which the status-line segment, the
project-os mod's line and the cockpit read without calling the network
(project-os-dev FEAT-0042, REQ-0039).

With no `gh`, no network, no login, or an `origin` that is not on GitHub, it
says so in one sentence and exits 0: CI's state is unknown, and nothing fails
because of that. PROJECT_OS_CI_STATUS=0 turns it off.

Usage:
  ci-status.py [--repo-root DIR]        fetch, save, and print each workflow's state
  ci-status.py --max-age 300            reuse a saved result younger than 300 s
  ci-status.py --session-line           a line per workflow that failed or is running;
                                        silent otherwise, and within a few seconds
  ci-status.py --wait                   wait for the runs on HEAD to end, then report;
                                        exits 1 when one failed
  ci-status.py --json                   print the saved result
"""

from __future__ import annotations

import argparse
import calendar
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

FORMAT = "project-os/ci-status"
VERSION = 1
# A conclusion that makes a workflow red until a later run of it succeeds.
RED = {"failure", "timed_out", "startup_failure"}
ARTIFACT_PATTERN = "project-os-test-run*"
RUN_FIELDS = "databaseId,workflowName,status,conclusion,headSha,event,createdAt,updatedAt,url"
SESSION_BUDGET = 4.0
FAILING_STATES = ("failing", "timed_out", "interrupted", "unrunnable")


class Unavailable(Exception):
    """CI's state cannot be fetched; the message says why, in one sentence."""


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def parse_time(text):
    if not text:
        return None
    try:
        return calendar.timegm(time.strptime(text.replace(".000Z", "Z"), "%Y-%m-%dT%H:%M:%SZ"))
    except (TypeError, ValueError):
        return None


def ago(stamp, now=None):
    t = parse_time(stamp)
    if t is None:
        return "some time ago"
    s = int(max(0, (now or time.time()) - t))
    if s < 90:
        return "just now"
    if s < 3600:
        return "%dm ago" % (s // 60)
    if s < 172800:
        return "%dh ago" % (s // 3600)
    return "%dd ago" % (s // 86400)


# ---------------------------------------------------------------------------
# The saved file


def path_for(root):
    return root / ".project-os" / "ci" / "latest.json"


def load(root):
    """The saved result, or None when there is none or its version is unknown."""
    try:
        with open(path_for(root), encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict) or data.get("version") != VERSION:
        return None
    return data


def save(root, data):
    d = root / ".project-os"
    d.mkdir(exist_ok=True)
    ignore = d / ".gitignore"
    if not ignore.exists():
        with open(ignore, "w", encoding="utf-8") as fh:
            fh.write("# Runtime state from project-os scripts (tools/instructions/TEST-RUNS.md); never committed.\n*\n")
    out = d / "ci"
    out.mkdir(exist_ok=True)
    target = out / "latest.json"
    tmp = out / (".latest.json.%d.tmp" % os.getpid())
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=1, ensure_ascii=False)
        fh.write("\n")
    os.replace(tmp, target)


def is_red(wf):
    """Red until a later run of the workflow succeeds: the newest finished run
    failed (TEST-RUNS.md, "The CI file")."""
    done = wf.get("last_finished") or {}
    return done.get("conclusion") in RED


def is_running(wf):
    return (wf.get("latest") or {}).get("status") not in (None, "", "completed")


def segment_text(data):
    """`CI ✗ android-tests 8bf1562` for a red workflow, `CI ▶ ...` for one still
    running; "" when every workflow is green or nothing is known. Workflows red
    on the same commit share it: `CI ✗ android-tests, ios-tests 8bf1562`."""
    if not data:
        return ""
    red, running = {}, {}
    for wf in data.get("workflows") or []:
        if is_red(wf):
            sha = ((wf.get("last_finished") or {}).get("commit") or "")[:7]
            red.setdefault(sha, []).append(wf.get("name") + (" ▶" if is_running(wf) else ""))
        elif is_running(wf):
            sha = ((wf.get("latest") or {}).get("commit") or "")[:7]
            running.setdefault(sha, []).append(wf.get("name"))
    for mark, groups in (("✗", red), ("▶", running)):
        if groups:
            return "CI %s " % mark + ", ".join("%s %s" % (", ".join(n), sha) for sha, n in groups.items()).rstrip()
    return ""


def names(ids, most=5):
    if len(ids) <= most:
        return ", ".join(ids)
    return "%s and %d more" % (", ".join(ids[:most]), len(ids) - most)


def why(run):
    if run.get("failing_tests"):
        return ": " + names(run["failing_tests"])
    if run.get("failing_jobs"):
        return ": job " + names(run["failing_jobs"])
    return ""


def session_lines(data, now=None):
    """One line per workflow whose latest run failed or is still running."""
    out = []
    for wf in (data or {}).get("workflows") or []:
        latest, done = wf.get("latest") or {}, wf.get("last_finished") or {}
        if is_red(wf):
            line = "CI: %s failed on %s, %s%s. %s" % (
                wf.get("name"), (done.get("commit") or "")[:7], ago(done.get("updated"), now), why(done), done.get("url") or "")
            if is_running(wf):
                line += " A new run on %s is running." % (latest.get("commit") or "")[:7]
            out.append(line.rstrip())
        elif is_running(wf):
            out.append("CI: %s is running on %s, started %s. %s" % (
                wf.get("name"), (latest.get("commit") or "")[:7], ago(latest.get("created"), now), latest.get("url") or ""))
    return out


def summary_lines(data, now=None):
    out = []
    if data.get("error"):
        out.append("ci-status: %s" % data["error"])
    workflows = data.get("workflows") or []
    if not workflows and not data.get("error"):
        out.append("ci-status: no CI runs on %s" % (data.get("branch") or "this branch"))
    for wf in workflows:
        latest, done = wf.get("latest") or {}, wf.get("last_finished") or {}
        if is_red(wf):
            text = "✗ %s failed on %s, %s%s" % (wf.get("name"), (done.get("commit") or "")[:7], ago(done.get("updated"), now), why(done))
            url = done.get("url")
        elif done:
            text = "■ %s %s on %s, %s" % (wf.get("name"), done.get("conclusion") or "finished",
                                         (done.get("commit") or "")[:7], ago(done.get("updated"), now))
            url = done.get("url")
        else:
            text, url = "", ""
        if is_running(wf):
            text = (text + "; " if text else "") + "▶ %s running on %s, started %s" % (
                wf.get("name"), (latest.get("commit") or "")[:7], ago(latest.get("created"), now))
            url = latest.get("url")
        out.append("%s  %s" % (text, url or ""))
    return [line.rstrip() for line in out]


# ---------------------------------------------------------------------------
# Fetching


def git(root, *args):
    try:
        out = subprocess.run(["git", *args], cwd=str(root), capture_output=True, text=True, timeout=5)
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return out.stdout.strip() if out.returncode == 0 else ""


def gh(root, args, timeout):
    """gh's output, or Unavailable saying in one sentence why there is none."""
    if not shutil.which("gh"):
        raise Unavailable("gh is not installed, so CI's state is unknown (https://cli.github.com)")
    if timeout <= 0.2:
        raise Unavailable("no time left to ask GitHub")
    try:
        out = subprocess.run(["gh", *args], cwd=str(root), capture_output=True, text=True,
                             timeout=timeout, stdin=subprocess.DEVNULL)
    except subprocess.TimeoutExpired:
        raise Unavailable("GitHub did not answer within %ds" % max(1, int(timeout)))
    except OSError as exc:
        raise Unavailable("gh could not run: %s" % exc)
    if out.returncode != 0:
        err = (out.stderr or out.stdout or "").strip()
        low = err.lower()
        if "auth login" in low or "not logged" in low or "authentication" in low:
            raise Unavailable("gh is not logged in (gh auth login), so CI's state is unknown")
        if any(w in low for w in ("could not resolve", "no such host", "network", "timeout", "connection")):
            raise Unavailable("GitHub could not be reached, so CI's state is unknown")
        raise Unavailable("gh %s failed: %s" % (args[0] if args else "", (err.splitlines() or [""])[0][:160]))
    return out.stdout


def on_github(root):
    url = git(root, "remote", "get-url", "origin")
    return "github" in url.lower()


def run_entry(r):
    return {
        "id": r.get("databaseId"), "url": r.get("url") or "", "commit": r.get("headSha") or "",
        "event": r.get("event") or "", "status": r.get("status") or "", "conclusion": r.get("conclusion") or "",
        "created": r.get("createdAt") or "", "updated": r.get("updatedAt") or "",
        "failing_tests": [], "failing_jobs": [], "details": "",
    }


def list_runs(root, branch, timeout, commit=""):
    args = ["run", "list", "--branch", branch, "--limit", "40", "--json", RUN_FIELDS]
    text = gh(root, args, timeout)
    try:
        runs = json.loads(text or "[]")
    except ValueError:
        raise Unavailable("gh run list gave output that is not JSON")
    runs = [r for r in runs if isinstance(r, dict)]
    if commit:
        runs = [r for r in runs if r.get("headSha") == commit]
    runs.sort(key=lambda r: r.get("createdAt") or "", reverse=True)
    return runs


def group(runs):
    """Per workflow, in the order of each one's newest run: the newest run and
    the newest finished one."""
    out, seen = [], {}
    for r in runs:
        name = r.get("workflowName") or "?"
        wf = seen.get(name)
        if wf is None:
            wf = seen[name] = {"name": name, "latest": run_entry(r), "last_finished": None}
            out.append(wf)
        if wf["last_finished"] is None and r.get("status") == "completed":
            wf["last_finished"] = run_entry(r)
    return out


def failing_from_artifacts(folder):
    """The test IDs a downloaded run file names as failing, across every
    artifact in `folder`."""
    ids = []
    for path in sorted(Path(folder).rglob("latest.json")):
        try:
            with open(path, encoding="utf-8") as fh:
                run = json.load(fh)
        except (OSError, ValueError):
            continue
        if not isinstance(run, dict) or run.get("version") != 1:
            continue
        for c in run.get("commands") or []:
            if c.get("state") in FAILING_STATES:
                for tid in c.get("tests") or []:
                    if tid not in ids:
                        ids.append(tid)
    return ids


def add_details(root, run, deadline):
    """Fill a failed run's failing tests from its artifact, or its failing jobs
    from `gh run view`. Leaves `details` empty when time ran out."""
    with tempfile.TemporaryDirectory(prefix="ci-status-") as tmp:
        try:
            gh(root, ["run", "download", str(run["id"]), "-p", ARTIFACT_PATTERN, "-D", tmp], deadline - time.monotonic())
            ids = failing_from_artifacts(tmp)
            if ids:
                run["failing_tests"], run["details"] = ids, "artifact"
                return
        except Unavailable:
            if time.monotonic() >= deadline:
                return
    try:
        text = gh(root, ["run", "view", str(run["id"]), "--json", "jobs"], deadline - time.monotonic())
        jobs = (json.loads(text or "{}") or {}).get("jobs") or []
    except (Unavailable, ValueError):
        return
    run["failing_jobs"] = [j.get("name") or "?" for j in jobs if j.get("conclusion") in RED]
    run["details"] = "jobs"


def fetch(root, budget, previous=None):
    """The current state, fetched from GitHub. Raises Unavailable."""
    if os.environ.get("PROJECT_OS_CI_STATUS", "").strip() == "0":
        raise Unavailable("turned off (PROJECT_OS_CI_STATUS=0)")
    if not on_github(root):
        raise Unavailable("this repo's origin is not on GitHub, so there is no CI run to fetch")
    branch = git(root, "rev-parse", "--abbrev-ref", "HEAD")
    if not branch or branch == "HEAD":
        raise Unavailable("HEAD is not on a branch, so there is no branch to ask CI about")
    deadline = time.monotonic() + budget
    workflows = group(list_runs(root, branch, deadline - time.monotonic()))
    # A finished run does not change, so its details are fetched once.
    known = {}
    for wf in (previous or {}).get("workflows") or []:
        for key in ("latest", "last_finished"):
            r = wf.get(key) or {}
            if r.get("id") and r.get("details"):
                known[(r["id"], r.get("updated"))] = r
    for wf in workflows:
        done = wf["last_finished"]
        if done and done["conclusion"] in RED:
            old = known.get((done["id"], done["updated"]))
            if old:
                done.update(failing_tests=old.get("failing_tests") or [], failing_jobs=old.get("failing_jobs") or [],
                            details=old.get("details"))
            elif time.monotonic() < deadline - 0.5:
                add_details(root, done, deadline)
        if done and wf["latest"]["id"] == done["id"]:
            wf["latest"] = done
    return {"format": FORMAT, "version": VERSION, "repo": root.name, "branch": branch,
            "fetched": now_iso(), "error": "", "workflows": workflows}


def refresh(root, max_age, budget):
    """(data, fresh): the saved result when younger than `max_age`, else a new
    fetch, saved. When the fetch cannot happen, the old workflows are kept with
    the reason in `error`."""
    previous = load(root)
    branch = git(root, "rev-parse", "--abbrev-ref", "HEAD")
    if previous and max_age is not None and previous.get("branch") == branch:
        t = parse_time(previous.get("fetched"))
        if t is not None and time.time() - t < max_age:
            return previous, False
    try:
        data = fetch(root, budget, previous)
    except Unavailable as exc:
        data = dict(previous or {"format": FORMAT, "version": VERSION, "repo": root.name,
                                 "branch": branch, "workflows": []})
        if (previous or {}).get("branch") != branch:
            data["workflows"] = []
        data.update(branch=branch, fetched=now_iso(), error=str(exc))
    try:
        save(root, data)
    except OSError:
        pass
    return data, True


# ---------------------------------------------------------------------------
# Waiting for the runs of a push


def wait(root, interval, timeout, appear):
    """Poll until every run on HEAD's commit has finished, then report. Returns
    the exit code: 1 when one of them failed."""
    if os.environ.get("PROJECT_OS_CI_STATUS", "").strip() == "0":
        print("ci-status: turned off (PROJECT_OS_CI_STATUS=0)")
        return 0
    commit = git(root, "rev-parse", "HEAD")
    branch = git(root, "rev-parse", "--abbrev-ref", "HEAD")
    if not on_github(root) or not commit or branch in ("", "HEAD"):
        print("ci-status: this repo's origin is not on GitHub, or HEAD is not on a branch; nothing to wait for")
        return 0
    print("ci-status: waiting for CI on %s (%s)" % (commit[:7], branch), flush=True)
    start = time.monotonic()
    last = None
    while True:
        try:
            runs = list_runs(root, branch, 30, commit)
        except Unavailable as exc:
            print("ci-status: %s" % exc)
            return 0
        if runs:
            states = ", ".join("%s %s" % (r.get("workflowName"), r.get("conclusion") or r.get("status")) for r in runs)
            if states != last:
                print("   %s" % states, flush=True)
                last = states
            if all(r.get("status") == "completed" for r in runs):
                break
        elif time.monotonic() - start > appear:
            print("ci-status: no CI run started for %s after %ds; is the commit pushed, and does a workflow run on %s?"
                  % (commit[:7], appear, branch))
            return 0
        if time.monotonic() - start > timeout:
            print("ci-status: still running after %ds; run ci-status.py --wait again later" % timeout)
            return 0
        time.sleep(interval)
    data, _fresh = refresh(root, None, 120)
    if data.get("error"):
        print("ci-status: %s" % data["error"])
        return 0
    red = False
    for wf in data.get("workflows") or []:
        done = wf.get("last_finished") or {}
        if done.get("commit") != commit:
            continue
        if done.get("conclusion") in RED:
            red = True
            print("✗ %s failed on %s%s  %s" % (wf["name"], commit[:7], why(done), done.get("url") or ""))
        else:
            print("■ %s %s on %s  %s" % (wf["name"], done.get("conclusion") or "finished", commit[:7], done.get("url") or ""))
    return 1 if red else 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="Fetch and show the latest CI run of each workflow on this branch.")
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--max-age", type=float, default=None, help="reuse a saved result younger than this many seconds")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--session-line", action="store_true", help="print a line per failed or running workflow, or nothing")
    mode.add_argument("--wait", action="store_true", help="wait for the runs on HEAD to finish and report them")
    mode.add_argument("--json", action="store_true", help="print the saved result as JSON")
    ap.add_argument("--quiet", action="store_true", help="fetch and save; print nothing")
    ap.add_argument("--budget", type=float, default=None, help="seconds the fetch may take in total")
    ap.add_argument("--interval", type=float, default=15.0, help="--wait: seconds between polls")
    ap.add_argument("--timeout", type=float, default=3600.0, help="--wait: give up after this many seconds")
    ap.add_argument("--appear", type=float, default=120.0, help="--wait: how long to wait for a run to start")
    args = ap.parse_args(argv)
    root = Path(args.repo_root).resolve()

    if args.wait:
        return wait(root, args.interval, args.timeout, args.appear)
    if args.session_line:
        # Session start never waits long and never prints an error: a line
        # that cannot be fetched is simply left out (RISK-0007).
        try:
            data, _fresh = refresh(root, 300 if args.max_age is None else args.max_age, args.budget or SESSION_BUDGET)
        except Exception:
            return 0
        for line in session_lines(data):
            print(line)
        return 0
    data, _fresh = refresh(root, args.max_age, args.budget or 60.0)
    if args.quiet:
        return 0
    if args.json:
        print(json.dumps(data, indent=1, ensure_ascii=False))
        return 0
    for line in summary_lines(data):
        print(line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
