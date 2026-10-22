#!/usr/bin/env bash
# The project-os plugin's working-tree fingerprint (project-os-dev TASK-0209).
#
# The plugin's own tests fake git, so they cannot tell whether the fingerprint
# notices a change. This runs hooks/shared/fingerprint.sh against a real
# scratch repository and checks that each kind of change moves the first
# digest, that a change under docs/ moves the second, and that nothing
# changed moves neither.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FP="$ROOT/tools/adapters/claude-code/hooks/shared/fingerprint.sh"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT

n=0
failures=0
check() { # check <description> <command...>
  n=$((n + 1))
  if "${@:2}" >/dev/null 2>&1; then echo "  ok   $1"; else echo "  FAIL $1"; failures=$((failures + 1)); fi
}

cd "$T" && git init -q && git config user.email t@t && git config user.name t
mkdir docs && echo one > tracked.txt && echo note > docs/NOTE.md && echo 'project: {}' > SNAPSHOT.yaml
git add -A && git commit -qm initial

all() { bash "$FP" | sed -n 1p; }
docs() { bash "$FP" | sed -n 2p; }

a=$(all); check "two runs on an unchanged tree agree" test "$a" = "$(all)"
echo two >> tracked.txt; b=$(all); check "an edit to a tracked file changes it" test "$a" != "$b"
echo three >> tracked.txt; c=$(all); check "a second edit to the same tracked file changes it" test "$b" != "$c"
echo u > untracked.txt; d=$(all); check "a new untracked file changes it" test "$c" != "$d"
echo u2 >> untracked.txt; e=$(all); check "a second edit to an untracked file changes it" test "$d" != "$e"
mkdir -p new && echo 1 > new/a.md; f=$(all); check "a new untracked folder changes it" test "$e" != "$f"
echo 2 > new/b.md; g=$(all); check "a new file in an untracked folder changes it" test "$f" != "$g"
echo ignored > skip.log && echo '*.log' > .git/info/exclude; h=$(all); echo more >> skip.log
check "an ignored file changes nothing" test "$h" = "$(all)"

d1=$(docs); echo edited >> tracked.txt
check "a change outside the notes leaves the notes' digest alone" test "$d1" = "$(docs)"
echo more >> docs/NOTE.md; d2=$(docs); check "a change under docs/ changes the notes' digest" test "$d1" != "$d2"
echo new > docs/NEW.md; d3=$(docs); check "a new untracked note changes the notes' digest" test "$d2" != "$d3"
echo again >> docs/NEW.md; check "a second edit to an untracked note changes the notes' digest" test "$d3" != "$(docs)"

cd "$(mktemp -d)" && bash "$FP" >/dev/null 2>&1; code=$?
check "outside a git repository it exits 3" test "$code" -eq 3

echo "test-plugin-fingerprint: $n assertions, $failures failure(s)"
[[ "$failures" -eq 0 ]]
