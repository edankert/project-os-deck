#!/usr/bin/env bash
# ci-status.py against a fake `gh` on PATH that answers from fixture files and
# logs each call (project-os-dev FEAT-0042, TASK-0214; TST-0050). Exit 0 = all hold.
set -uo pipefail
export PYTHONDONTWRITEBYTECODE=1
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CI_STATUS="$HERE/ci-status.py"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
assertions=0; failures=0
check() { assertions=$((assertions + 1)); if [[ -z "$2" || "$2" -ne 0 ]]; then failures=$((failures + 1)); echo "  FAIL $1${3:+: $3}"; fi; }
has() { [[ "$1" == *"$2"* ]]; }
unset PROJECT_OS_CI_STATUS

# --- the fake gh ----------------------------------------------------------------
mkdir -p "$TMP/bin"
cat > "$TMP/bin/gh" <<'SH'
#!/usr/bin/env bash
# run list: list-N.json for the Nth call, the last one once they run out.
echo "$*" >> "$FAKE_GH/log"
case "${FAKE_GH_MODE:-}" in
  auth) echo "To get started with GitHub CLI, please run:  gh auth login" >&2; exit 4 ;;
  network) echo "error connecting to api.github.com: dial tcp: lookup api.github.com: no such host" >&2; exit 1 ;;
  slow) sleep 10 ;;
esac
case "$1 $2" in
  "run list")
    n=$(( $(cat "$FAKE_GH/calls" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$FAKE_GH/calls"
    f="$FAKE_GH/list-$n.json"; [[ -f "$f" ]] || f="$(ls "$FAKE_GH"/list-*.json | sort -V | tail -1)"
    cat "$f" ;;
  "run download")
    id="$3"; dest=""; while [[ $# -gt 0 ]]; do [[ "$1" == "-D" ]] && dest="$2"; shift; done
    if [[ -d "$FAKE_GH/artifacts/$id" ]]; then cp -R "$FAKE_GH/artifacts/$id/." "$dest/"; else echo "no valid artifacts found to download" >&2; exit 1; fi ;;
  "run view") cat "$FAKE_GH/jobs-$3.json" ;;
  *) echo "fake gh: unexpected $*" >&2; exit 2 ;;
esac
SH
chmod +x "$TMP/bin/gh"
export PATH="$TMP/bin:$PATH" FAKE_GH="$TMP/gh"
mkdir -p "$FAKE_GH"

repo() { # repo <dir> [origin]
  mkdir -p "$1"; printf 'version: 1\n' > "$1/SNAPSHOT.yaml"
  (cd "$1" && git init -q -b main && git add . && git -c user.email=t@t -c user.name=t commit -q -m init \
     && git remote add origin "${2:-https://github.com/o/r.git}")
}
# runs <N> <json rows as python>: write list-N.json; HEAD is the variable `head`
runs() {
  python3 - "$FAKE_GH/list-$1.json" "$(cd "$R" && git rev-parse HEAD)" "$2" <<'PY'
import json, sys
path, head, rows = sys.argv[1], sys.argv[2], sys.argv[3]
def run(i, wf, status, conclusion, sha, created):
    return {"databaseId": i, "workflowName": wf, "status": status, "conclusion": conclusion, "headSha": sha,
            "event": "push", "createdAt": created, "updatedAt": created.replace(":00Z", ":30Z"),
            "url": "https://github.com/o/r/actions/runs/%d" % i}
json.dump(eval(rows), open(path, "w"))
PY
}
reset_gh() { rm -rf "$FAKE_GH"; mkdir -p "$FAKE_GH/artifacts"; : > "$FAKE_GH/log"; }
calls() { grep -c "^$1" "$FAKE_GH/log" 2>/dev/null || true; }

R="$TMP/repo"; repo "$R"
reset_gh
runs 1 '[run(11, "android-tests", "completed", "failure", head, "2026-10-22T10:00:00Z"),
         run(12, "ios-tests", "completed", "failure", head, "2026-10-22T10:00:00Z"),
         run(13, "validate-docs", "completed", "success", head, "2026-10-22T10:00:00Z"),
         run(9, "android-tests", "completed", "success", "old", "2026-10-21T10:00:00Z")]'
# android-tests uploaded its run file: one failing command and one timed out.
mkdir -p "$FAKE_GH/artifacts/11/project-os-test-run-android"
cat > "$FAKE_GH/artifacts/11/project-os-test-run-android/latest.json" <<'JSON'
{"format": "project-os/test-run", "version": 1, "state": "failing", "commands": [
 {"index": 1, "tests": ["TST-0001"], "state": "passing"},
 {"index": 2, "tests": ["TST-0022", "TST-0023"], "state": "failing"},
 {"index": 3, "tests": ["TST-0679"], "state": "timed_out"}]}
JSON
# ios-tests did not: its failed job is named instead.
echo '{"jobs": [{"name": "iOS Unit Tests", "conclusion": "failure"}, {"name": "lint", "conclusion": "success"}]}' > "$FAKE_GH/jobs-12.json"

# --- a fetch ---------------------------------------------------------------------
out="$(python3 "$CI_STATUS" --repo-root "$R")"; code=$?
F="$R/.project-os/ci/latest.json"
get() { python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); w={x["name"]: x for x in d["workflows"]}; print(eval(sys.argv[2]))' "$F" "$1" 2>/dev/null; }
check "exit 0 after a fetch" "$([[ $code -eq 0 ]]; echo $?)" "$code"
check "format and version" "$([[ "$(get 'd["format"], d["version"]')" == "('project-os/ci-status', 1)" ]]; echo $?)"
check "one entry per workflow, newest first" "$([[ "$(get '[x["name"] for x in d["workflows"]]')" == "['android-tests', 'ios-tests', 'validate-docs']" ]]; echo $?)"
check "the failing tests come from the artifact" "$([[ "$(get 'w["android-tests"]["last_finished"]["failing_tests"], w["android-tests"]["last_finished"]["details"]')" == "(['TST-0022', 'TST-0023', 'TST-0679'], 'artifact')" ]]; echo $?)"
check "without an artifact, the failed jobs" "$([[ "$(get 'w["ios-tests"]["last_finished"]["failing_jobs"], w["ios-tests"]["last_finished"]["details"]')" == "(['iOS Unit Tests'], 'jobs')" ]]; echo $?)"
check "a green run fetches no details" "$([[ "$(get 'w["validate-docs"]["last_finished"]["details"]')" == "" ]]; echo $?)"
check "the summary names the failure and its tests" "$(has "$out" "✗ android-tests failed on" && has "$out" "TST-0022, TST-0023, TST-0679" && has "$out" "https://github.com/o/r/actions/runs/11"; echo $?)" "$out"
check ".project-os stays out of git" "$([[ -z "$(cd "$R" && git status --porcelain --untracked-files=all -- .project-os)" ]]; echo $?)"

# --- the session line, and a fresh result reused ---------------------------------
before=$(calls "run list")
out="$(python3 "$CI_STATUS" --repo-root "$R" --session-line)"
check "a result younger than five minutes makes no gh call" "$([[ $(calls "run list") -eq $before ]]; echo $?)"
check "one line per red workflow" "$([[ $(printf '%s\n' "$out" | grep -c '^CI: ') -eq 2 ]]; echo $?)" "$out"
check "the line names workflow, commit, age, tests and URL" "$(printf '%s\n' "$out" | grep -qE "^CI: android-tests failed on [0-9a-f]{7}, [0-9a-z ]+ ago: TST-0022, TST-0023, TST-0679\. https://github.com/o/r/actions/runs/11$"; echo $?)" "$out"
check "a green workflow has no line" "$(! has "$out" validate-docs; echo $?)" "$out"

# --- the session-start orientation ends with the same line ----------------------
mkdir -p "$R/tools/scripts"; cp "$CI_STATUS" "$R/tools/scripts/ci-status.py"
out="$(CLAUDE_PROJECT_DIR="$R" bash "$HERE/../adapters/claude-code/hooks/snapshot-freshness.sh")"
check "the Claude Code session start prints the CI lines last" "$(printf '%s\n' "$out" | tail -2 | head -1 | grep -q '^CI: android-tests failed on'; echo $?)" "$out"
rm -rf "$R/tools"

# --- a finished run's details are fetched once ------------------------------------
downloads=$(calls "run download")
python3 "$CI_STATUS" --repo-root "$R" --max-age 0 --quiet
check "a refetch lists the runs again" "$([[ $(calls "run list") -gt $before ]]; echo $?)"
check "but does not download the same run again" "$([[ $(calls "run download") -eq $downloads ]]; echo $?)"

# --- red until a later run succeeds -----------------------------------------------
runs 2 '[run(21, "android-tests", "in_progress", "", head, "2026-10-22T11:00:00Z"),
         run(11, "android-tests", "completed", "failure", head, "2026-10-22T10:00:00Z")]'
echo 1 > "$FAKE_GH/calls"
python3 "$CI_STATUS" --repo-root "$R" --max-age 0 --quiet
out="$(python3 "$CI_STATUS" --repo-root "$R" --session-line)"
check "a new run in progress keeps the workflow red, and says it runs" "$(has "$out" "CI: android-tests failed on" && has "$out" "A new run on"; echo $?)" "$out"
runs 3 '[run(22, "android-tests", "completed", "success", head, "2026-10-22T12:00:00Z"),
         run(11, "android-tests", "completed", "failure", head, "2026-10-22T10:00:00Z")]'
echo 2 > "$FAKE_GH/calls"
python3 "$CI_STATUS" --repo-root "$R" --max-age 0 --quiet
out="$(python3 "$CI_STATUS" --repo-root "$R" --session-line)"
check "a later green run clears it" "$([[ -z "$out" ]]; echo $?)" "$out"

# --- --wait ---------------------------------------------------------------------------
R="$TMP/wait"; repo "$R"; reset_gh
runs 1 '[]'
runs 2 '[run(31, "android-tests", "in_progress", "", head, "2026-10-22T13:00:00Z")]'
runs 3 '[run(31, "android-tests", "completed", "failure", head, "2026-10-22T13:00:00Z")]'
echo '{"jobs": [{"name": "Unit Tests", "conclusion": "failure"}]}' > "$FAKE_GH/jobs-31.json"
out="$(python3 "$CI_STATUS" --repo-root "$R" --wait --interval 0.1 --appear 5 2>&1)"; code=$?
check "--wait exits 1 when the run failed" "$([[ $code -eq 1 ]]; echo $?)" "$code: $out"
check "--wait says what it waits for, then reports" "$(has "$out" "waiting for CI on" && has "$out" "android-tests in_progress" && has "$out" "✗ android-tests failed on" && has "$out" "job Unit Tests"; echo $?)" "$out"
R="$TMP/wait-green"; repo "$R"; reset_gh
runs 1 '[run(41, "validate-docs", "completed", "success", head, "2026-10-22T13:00:00Z")]'
out="$(python3 "$CI_STATUS" --repo-root "$R" --wait --interval 0.1 --appear 5 2>&1)"; code=$?
check "--wait exits 0 when the run passed" "$([[ $code -eq 0 ]] && has "$out" "■ validate-docs success"; echo $?)" "$code: $out"
reset_gh; runs 1 '[]'
out="$(python3 "$CI_STATUS" --repo-root "$R" --wait --interval 0.1 --appear 0.3 2>&1)"; code=$?
check "--wait gives up, exit 0, when no run starts" "$([[ $code -eq 0 ]] && has "$out" "no CI run started"; echo $?)" "$code: $out"

# --- it fails nothing when CI cannot be asked -------------------------------------------
R="$TMP/nogh"; repo "$R"; reset_gh
# A PATH with python3 and git and nothing else: a CI runner has a real gh in /usr/bin.
mkdir -p "$TMP/nogh-bin"; ln -s "$(command -v python3)" "$TMP/nogh-bin/python3"; ln -s "$(command -v git)" "$TMP/nogh-bin/git"
out="$(PATH="$TMP/nogh-bin" python3 "$CI_STATUS" --repo-root "$R")"; code=$?
check "no gh: says so, exit 0" "$([[ $code -eq 0 ]] && has "$out" "gh is not installed"; echo $?)" "$code: $out"
out="$(PATH="$TMP/nogh-bin" python3 "$CI_STATUS" --repo-root "$R" --session-line --max-age 0)"; code=$?
check "no gh: the session line is silent" "$([[ $code -eq 0 && -z "$out" ]]; echo $?)" "$out"
out="$(FAKE_GH_MODE=auth python3 "$CI_STATUS" --repo-root "$R" --max-age 0)"; code=$?
check "not logged in: says so, exit 0" "$([[ $code -eq 0 ]] && has "$out" "not logged in"; echo $?)" "$code: $out"
out="$(FAKE_GH_MODE=network python3 "$CI_STATUS" --repo-root "$R" --max-age 0)"; code=$?
check "no network: says so, exit 0" "$([[ $code -eq 0 ]] && has "$out" "could not be reached"; echo $?)" "$code: $out"
start=$(date +%s)
out="$(FAKE_GH_MODE=slow python3 "$CI_STATUS" --repo-root "$R" --session-line --max-age 0 --budget 1)"; code=$?
took=$(( $(date +%s) - start ))
check "a slow GitHub: the session line gives up within its budget" "$([[ $code -eq 0 && -z "$out" && $took -le 4 ]]; echo $?)" "${took}s"
R="$TMP/gitlab"; repo "$R" "https://gitlab.com/o/r.git"; reset_gh
out="$(python3 "$CI_STATUS" --repo-root "$R")"
check "an origin not on GitHub: says so, and never calls gh" "$(has "$out" "not on GitHub" && [[ ! -s "$FAKE_GH/log" ]]; echo $?)" "$out"
R="$TMP/off"; repo "$R"; reset_gh
out="$(PROJECT_OS_CI_STATUS=0 python3 "$CI_STATUS" --repo-root "$R")"
check "PROJECT_OS_CI_STATUS=0 turns it off" "$(has "$out" "turned off" && [[ ! -s "$FAKE_GH/log" ]]; echo $?)" "$out"

echo "test-ci-status: $assertions assertions, $failures failure(s)"
[[ "$failures" -eq 0 ]]
