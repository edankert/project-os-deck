#!/usr/bin/env bash
# run-tests.py's progress file, logs and process groups (project-os-dev
# FEAT-0042, TASK-0211, TASK-0212; TST-0048). A fixture repo whose test notes
# pass, fail, report progress, and start a child that outlives its shell.
# RUNNER=<path> runs the assertions against another copy of the runner, which
# is how the two fixes were shown to fail on the old one. Exit 0 = all hold.
set -uo pipefail
export PYTHONDONTWRITEBYTECODE=1
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="${RUNNER:-$HERE/run-tests.py}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
assertions=0; failures=0
check() { assertions=$((assertions + 1)); if [[ -z "$2" || "$2" -ne 0 ]]; then failures=$((failures + 1)); echo "  FAIL $1${3:+: $3}"; fi; }
# A CI runner sets these, and the runner prefers them to git's answer.
unset CI PROJECT_OS_TEST_RUN_ROOT PROJECT_OS_TEST_PROGRESS GITHUB_SHA GITHUB_REF_NAME GITHUB_HEAD_REF
export PROJECT_OS_TEST_KILL_GRACE=1

repo() { # repo <dir>: an empty project-os repo under git
  mkdir -p "$1/docs/tests"; printf 'version: 1\n' > "$1/SNAPSHOT.yaml"
  (cd "$1" && git init -q && git add . && git -c user.email=t@t -c user.name=t commit -q -m init)
}
note() { # note <dir> <TST-id> <command>
  printf -- '---\nid: %s\nstatus: active\ncommand: "%s"\n---\n# %s\n' "$2" "$3" "$2" > "$1/docs/tests/$2-T.md"
}
reap() { # reap <dir>: stop what a broken runner left behind, by the pids the fixture wrote
  local f p
  for f in "$1/child.pid" "$1/fg.pid"; do
    p="$(cat "$f" 2>/dev/null)"
    [[ -n "$p" && "$(ps -p "$p" -o command= 2>/dev/null)" == "sleep 300" ]] && kill "$p" 2>/dev/null
  done
}
json() { # json <file> <python expression over d>
  python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print(eval(sys.argv[2]))' "$1" "$2" 2>/dev/null
}

# --- the progress file, its states, shared commands, logs --------------------
R="$TMP/basic"; repo "$R"
note "$R" TST-0001 "echo one-line-of-output; echo second line >&2"
note "$R" TST-0002 "echo broken; exit 3"
note "$R" TST-0003 "echo one-line-of-output; echo second line >&2"
note "$R" TST-0004 "no-such-command-anywhere"
python3 "$RUNNER" --repo-root "$R" --source pre-push > "$TMP/basic.out" 2>&1; code=$?
L="$R/.project-os/runs/latest.json"
check "exit 1 with a failing command" "$([[ $code -eq 1 ]]; echo $?)" "$code"
check "latest.json exists" "$([[ -f "$L" ]]; echo $?)"
check "format and version" "$([[ "$(json "$L" 'd["format"], d["version"]')" == "('project-os/test-run', 1)" ]]; echo $?)"
check "source is pre-push" "$([[ "$(json "$L" 'd["source"]')" == pre-push ]]; echo $?)"
check "the commit is HEAD" "$([[ "$(json "$L" 'd["commit"]')" == "$(cd "$R" && git rev-parse HEAD)" ]]; echo $?)"
check "the run ended failing" "$([[ "$(json "$L" 'd["state"], bool(d["finished"])')" == "('failing', True)" ]]; echo $?)"
check "three commands: shared notes share one entry" "$([[ "$(json "$L" 'len(d["commands"])')" == 3 ]]; echo $?)"
check "the shared entry names both tests" "$([[ "$(json "$L" 'd["commands"][0]["tests"]')" == "['TST-0001', 'TST-0003']" ]]; echo $?)"
check "states: passing, failing, unrunnable" "$([[ "$(json "$L" '[c["state"] for c in d["commands"]]')" == "['passing', 'failing', 'unrunnable']" ]]; echo $?)"
check "a failing command keeps its exit code and reason" "$([[ "$(json "$L" 'd["commands"][1]["exit"], d["commands"][1]["reason"]')" == "(3, 'broken')" ]]; echo $?)"
check "seconds and start are recorded" "$([[ "$(json "$L" 'all(c["started"] and c["seconds"] is not None for c in d["commands"])')" == True ]]; echo $?)"
log="$R/$(json "$L" 'd["commands"][0]["log"]')"
check "the log holds stdout and stderr, whole" "$(grep -q one-line-of-output "$log" && grep -q 'second line' "$log"; echo $?)"
check "run.json in the run's folder matches latest.json" "$(cmp -s "$L" "$R/.project-os/runs/$(json "$L" 'd["id"]')/run.json"; echo $?)"
check "no temporary file is left" "$([[ -z "$(find "$R/.project-os" -name '*.tmp')" ]]; echo $?)"
check ".project-os ignores itself" "$([[ -z "$(cd "$R" && git status --porcelain --untracked-files=all -- .project-os)" ]] && [[ -f "$R/.project-os/runs/latest.json" ]]; echo $?)"
check "printed lines keep their format" "$(grep -qE '^   TST-0002 +failing' "$TMP/basic.out" && grep -q 'same command as TST-0001' "$TMP/basic.out"; echo $?)"
check "the progress file is named on the console" "$(grep -q 'progress: .project-os/runs/latest.json' "$TMP/basic.out"; echo $?)"

# --- the source defaults to ci under CI, and --ci writes one entry -----------
R="$TMP/ci"; repo "$R"
note "$R" TST-0001 "true"; note "$R" TST-0002 "true"
printf 'version: 1\nci:\n  suite_command: "echo suite"\n' > "$R/SNAPSHOT.yaml"
CI=1 python3 "$RUNNER" --repo-root "$R" --ci >/dev/null 2>&1
L="$R/.project-os/runs/latest.json"
check "source is ci when CI is set" "$([[ "$(json "$L" 'd["source"]')" == ci ]]; echo $?)"
check "the suite is one entry naming every note" "$([[ "$(json "$L" '[(c["command"], c["tests"]) for c in d["commands"]]')" == "[('echo suite', ['TST-0001', 'TST-0002'])]" ]]; echo $?)"

# --- progress lines, and readers never see half a file ------------------------
R="$TMP/progress"; repo "$R"
cat > "$R/report.sh" <<'SH'
echo '{"done": 1, "total": 3}' >> "$PROJECT_OS_TEST_PROGRESS"
sleep 1
echo 'not json' >> "$PROJECT_OS_TEST_PROGRESS"
echo '{"done": 2, "total": 3, "now": "AddRiderFlowTest", "x": 1}' >> "$PROJECT_OS_TEST_PROGRESS"
sleep 3
SH
note "$R" TST-0001 "sh report.sh"
python3 "$RUNNER" --repo-root "$R" >/dev/null 2>&1 &
pid=$!
L="$R/.project-os/runs/latest.json"; seen=""; bad=0
for _ in $(seq 1 60); do
  sleep 0.1
  [[ -f "$L" ]] || continue
  v="$(json "$L" 'd["commands"][0]["progress"]')" || v=""
  python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$L" 2>/dev/null || bad=$((bad + 1))
  [[ "$v" == *AddRiderFlowTest* ]] && seen="$v" && break
done
want="{'done': 2, 'total': 3, 'now': 'AddRiderFlowTest'}"
check "a running command's entry shows its newest progress line" "$([[ "$seen" == "$want" ]]; echo $?)" "$seen"
check "the state is running while it runs" "$([[ "$(json "$L" 'd["commands"][0]["state"]')" == running ]]; echo $?)"
check "every read parsed: never half a file" "$([[ $bad -eq 0 ]]; echo $?)" "$bad"
wait "$pid"
check "the progress line is kept when the command ends" "$([[ "$(json "$L" 'd["commands"][0]["progress"]["done"]')" == 2 ]]; echo $?)"

# --- a timed-out command leaves no process behind (TASK-0212) -----------------
# The child sends its output elsewhere, so the old runner reaches its timeout
# instead of waiting on the pipe, and kills only the shell.
R="$TMP/timeout"; repo "$R"
cat > "$R/child.sh" <<'SH'
(sleep 300 >/dev/null 2>&1 & echo $! > child.pid)
sleep 300 & echo $! > fg.pid; wait
SH
note "$R" TST-0001 "sh child.sh"
start=$(date +%s)
python3 "$RUNNER" --repo-root "$R" --timeout 2 > "$TMP/timeout.out" 2>&1
took=$(( $(date +%s) - start ))
child="$(cat "$R/child.pid" 2>/dev/null)"
sleep 0.5
check "the child the command started is gone" "$([[ -n "$child" ]] && ! kill -0 "$child" 2>/dev/null; echo $?)" "pid $child"
reap "$R"
check "the runner returned soon after the timeout" "$([[ $took -lt 30 ]]; echo $?)" "${took}s"
L="$R/.project-os/runs/latest.json"
check "the progress file says timed_out" "$([[ "$(json "$L" 'd["commands"][0]["state"]')" == timed_out ]]; echo $?)"
check "it still prints and counts as unrunnable" "$(grep -qE 'TST-0001 +unrunnable .*timed out after 2s' "$TMP/timeout.out"; echo $?)"

# --- stopping the runner stops the command too (RISK-0008) --------------------
R="$TMP/interrupt"; repo "$R"
cat > "$R/child.sh" <<'SH'
(sleep 300 >/dev/null 2>&1 & echo $! > child.pid)
sleep 300 & echo $! > fg.pid; wait
SH
note "$R" TST-0001 "sh child.sh"
python3 "$RUNNER" --repo-root "$R" >/dev/null 2>&1 &
pid=$!
for _ in $(seq 1 50); do [[ -s "$R/child.pid" ]] && break; sleep 0.1; done
sleep 0.3
kill -TERM "$pid"; wait "$pid"; code=$?
child="$(cat "$R/child.pid" 2>/dev/null)"
sleep 0.5
check "a stopped runner exits 143" "$([[ $code -eq 143 ]]; echo $?)" "$code"
check "and leaves no child behind" "$([[ -n "$child" ]] && ! kill -0 "$child" 2>/dev/null; echo $?)" "pid $child"
reap "$R"
L="$R/.project-os/runs/latest.json"
check "the run and the command are marked interrupted" "$([[ "$(json "$L" 'd["state"], d["commands"][0]["state"]')" == "('interrupted', 'interrupted')" ]]; echo $?)"

# --- the runner's lines reach a file as they are printed (TASK-0212) ----------
R="$TMP/flush"; repo "$R"
note "$R" TST-0001 "true"; note "$R" TST-0002 "sleep 4"
python3 "$RUNNER" --repo-root "$R" > "$TMP/flush.out" 2>&1 &
pid=$!
for _ in $(seq 1 30); do grep -q 'TST-0002' "$R/.project-os/runs/latest.json" 2>/dev/null && [[ "$(json "$R/.project-os/runs/latest.json" 'd["commands"][1]["state"]')" == running ]] && break; sleep 0.1; done
sleep 0.5
check "the first test's line is in the file while the second runs" "$(grep -qE '^   TST-0001 +passing' "$TMP/flush.out"; echo $?)"
wait "$pid"

# --- the five newest runs are kept --------------------------------------------
R="$TMP/prune"; repo "$R"; note "$R" TST-0001 "true"
for _ in 1 2 3 4 5 6 7; do python3 "$RUNNER" --repo-root "$R" >/dev/null 2>&1; done
n=$(find "$R/.project-os/runs" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
check "five run folders are kept" "$([[ $n -eq 5 ]]; echo $?)" "$n"

echo "test-run-progress: $assertions assertions, $failures failure(s)"
[[ "$failures" -eq 0 ]]
