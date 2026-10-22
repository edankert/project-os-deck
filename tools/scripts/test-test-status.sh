#!/usr/bin/env bash
# test-status.py: the terminal view and the status-line segment, from
# hand-written run and CI files (project-os-dev FEAT-0042, TASK-0213; TST-0049).
# Exit 0 = all hold.
set -uo pipefail
export PYTHONDONTWRITEBYTECODE=1
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIEW="$HERE/test-status.py"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
assertions=0; failures=0
check() { assertions=$((assertions + 1)); if [[ -z "$2" || "$2" -ne 0 ]]; then failures=$((failures + 1)); echo "  FAIL $1${3:+: $3}"; fi; }
has() { [[ "$1" == *"$2"* ]]; }

R="$TMP/fixture"; mkdir -p "$R/.project-os/runs" "$R/.project-os/ci"; printf 'version: 1\n' > "$R/SNAPSHOT.yaml"
sleep 0 & dead=$!; wait "$dead"   # a pid that has ended
# run <state> <pid> [version]: a five-command run file, started 70 minutes ago
run() {
  python3 - "$R/.project-os/runs/latest.json" "$1" "$2" "${3:-1}" <<'PY'
import json, socket, sys, time
path, state, pid, version = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
now = time.time(); iso = lambda t: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(t))
cmd = lambda i, tid, st, **kw: {"index": i, "tests": tid, "command": "c%d" % i, "state": st,
    "started": iso(now - 600), "seconds": 1.0, "exit": None, "reason": "", "progress": None,
    "log": ".project-os/runs/R1/logs/%03d.log" % i, **kw}
cmds = [cmd(1, ["TST-0001"], "passing"),
        cmd(2, ["TST-0002", "TST-0005"], "failing", reason="iOS app killed before the test runner connected"),
        cmd(3, ["TST-0003"], "timed_out", reason="timed out after 600s"),
        cmd(4, ["TST-0004"], "running" if state == "running" else "passing", started=iso(now - 510),
            progress={"done": 12, "total": 60, "now": "AddRiderFlowTest"}),
        cmd(5, ["TST-0006"], "waiting" if state == "running" else "passing")]
d = {"format": "project-os/test-run", "version": version, "id": "R1", "repo": "fixture", "source": "pre-push",
     "commit": "8bf1562c0d", "branch": "main", "host": socket.gethostname(), "pid": pid,
     "started": iso(now - 4200), "updated": iso(now - 5), "finished": None if state == "running" else iso(now),
     "state": state, "commands": cmds}
json.dump(d, open(path, "w"))
PY
}
# ci <conclusion of the newest finished run> [status of the newest run]
ci() {
  python3 - "$R/.project-os/ci/latest.json" "$1" "${2:-completed}" <<'PY'
import json, sys
path, conclusion, status = sys.argv[1], sys.argv[2], sys.argv[3]
done = {"id": 1, "url": "https://github.com/o/r/actions/runs/1", "commit": "8bf1562c0d", "event": "push",
        "status": "completed", "conclusion": conclusion, "created": "2026-10-22T10:00:00Z",
        "updated": "2026-10-22T10:20:00Z", "failing_tests": ["TST-0022"] if conclusion == "failure" else [],
        "failing_jobs": [], "details": "artifact" if conclusion == "failure" else ""}
latest = done if status == "completed" else {**done, "id": 2, "commit": "9ab1234ef0", "status": status, "conclusion": ""}
d = {"format": "project-os/ci-status", "version": 1, "repo": "fixture", "branch": "main",
     "fetched": "2026-10-22T11:00:00Z", "error": "",
     "workflows": [{"name": "android-tests", "latest": latest, "last_finished": done}]}
json.dump(d, open(path, "w"))
PY
}

# --- the terminal view of a run in progress -----------------------------------
run running $$
out="$(python3 "$VIEW" --once --repo-root "$R")"
check "the header names repo, source, time and progress" "$(has "$out" "fixture · pre-push · 1h10m · 3 of 5 commands"; echo $?)" "$out"
check "one block per command, in order" "$(has "$out" "■✗⧗▶□"; echo $?)" "$out"
check "the failing command is listed with its reason and both its tests" "$(has "$out" "✗ TST-0002 +1 failing  iOS app killed"; echo $?)" "$out"
check "the timed-out command is listed" "$(printf '%s\n' "$out" | grep -qE '^⏱ TST-0003 +timed out +after 600s$'; echo $?)" "$out"
check "the running command shows its time and progress line" "$(printf '%s\n' "$out" | grep -qE '^▶ TST-0004 +running +8m3[0-9]s +12/60 AddRiderFlowTest$'; echo $?)" "$out"
check "a waiting or passing command is not listed" "$(! printf '%s\n' "$out" | grep -qE 'TST-0001|TST-0006'; echo $?)" "$out"
check "the logs folder is named" "$(has "$out" "logs: .project-os/runs/R1/logs/"; echo $?)" "$out"
check "printing once without a terminal is the default" "$([[ "$(python3 "$VIEW" --repo-root "$R" | head -2)" == "$(printf '%s\n' "$out" | head -2)" ]]; echo $?)"

# --- the segment ---------------------------------------------------------------
out="$(python3 "$VIEW" --segment --repo-root "$R")"
check "segment during a run" "$([[ "$out" == "tests 3/5 ✗1 ⏱1 ▶ TST-0004 12/60 8m" ]]; echo $?)" "$out"
ci failure
out="$(python3 "$VIEW" --segment --repo-root "$R")"
check "segment adds a red CI workflow" "$([[ "$out" == "tests 3/5 ✗1 ⏱1 ▶ TST-0004 12/60 8m · CI ✗ android-tests 8bf1562" ]]; echo $?)" "$out"
ci failure in_progress
out="$(python3 "$VIEW" --segment --repo-root "$R")"
check "CI stays red while a newer run runs" "$(has "$out" "CI ✗ android-tests ▶ 8bf1562"; echo $?)" "$out"
ci success in_progress
out="$(python3 "$VIEW" --segment --repo-root "$R")"
check "a running workflow after a green one" "$(has "$out" "CI ▶ android-tests 9ab1234"; echo $?)" "$out"
ci success

# --- a stopped runner, and a finished run ----------------------------------------
run running "$dead"
out="$(python3 "$VIEW" --once --repo-root "$R")"
check "a run whose runner is gone is shown as stopped" "$(printf '%s\n' "$out" | head -1 | grep -q ' · stopped$'; echo $?)" "$out"
out="$(python3 "$VIEW" --segment --repo-root "$R")"
check "and its segment says stopped" "$([[ "$out" == "tests stopped 3/5 ✗1 ⏱1" ]]; echo $?)" "$out"
run failing "$dead"
out="$(python3 "$VIEW" --segment --repo-root "$R")"
check "a finished failing run names its first failure" "$([[ "$out" == "tests ✗1 ⏱1 TST-0002 +1" ]]; echo $?)" "$out"
run passing "$dead"
out="$(python3 "$VIEW" --segment --repo-root "$R")"
check "nothing to show prints nothing" "$([[ -z "$out" ]]; echo $?)" "$out"

# --- finding the repo from Claude Code's status-line JSON ----------------------
run running $$
out="$(cd "$TMP" && printf '{"workspace": {"project_dir": "%s", "current_dir": "%s/sub"}}' "$R" "$R" | python3 "$VIEW" --segment)"
check "the status-line JSON names the repo" "$(has "$out" "tests 3/5"; echo $?)" "$out"
mkdir -p "$R/docs/deep"
out="$(cd "$R/docs/deep" && python3 "$VIEW" --segment </dev/null)"
check "from a folder inside the repo, with nothing on stdin" "$(has "$out" "tests 3/5"; echo $?)" "$out"

# --- files it cannot show ---------------------------------------------------------
run running $$ 2
out="$(python3 "$VIEW" --once --repo-root "$R")"; code=$?
check "an unknown format version is named, not guessed" "$(has "$out" "format version 2"; echo $?)" "$out"
check "and exits 0" "$([[ $code -eq 0 ]]; echo $?)"
out="$(python3 "$VIEW" --segment --repo-root "$R")"
check "the segment leaves an unknown version out" "$([[ -z "$out" ]]; echo $?)" "$out"
rm -f "$R/.project-os/runs/latest.json"
out="$(python3 "$VIEW" --once --repo-root "$R")"; code=$?
check "no run file: says how to make one, exit 0" "$(has "$out" "run-tests.py writes one" && [[ $code -eq 0 ]]; echo $?)" "$out"

echo "test-test-status: $assertions assertions, $failures failure(s)"
[[ "$failures" -eq 0 ]]
