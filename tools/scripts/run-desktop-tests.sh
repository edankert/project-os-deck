#!/usr/bin/env bash
# Run one Deck test suite, building first.
#
# Each TST-* note with a `command:` names one suite here, so a failure in CI
# points at a test note rather than at "the tests". The suites run against the
# BUILT modules under desktop/dist, which is why the build is not optional.
#
# Usage: bash tools/scripts/run-desktop-tests.sh <suite>
#        bash tools/scripts/run-desktop-tests.sh all
set -euo pipefail

SUITE="${1:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP="$(cd "$SCRIPT_DIR/../../desktop" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "run-desktop-tests: node is required but not found" >&2
  exit 127
fi

cd "$DESKTOP"

if [ ! -d node_modules ]; then
  # Electron's binary is only needed for the smoke run, never for these suites,
  # and it is a ~100MB download. CI skips it.
  export ELECTRON_SKIP_BINARY_DOWNLOAD=1
  if ! npm ci --no-audit --no-fund >/dev/null 2>&1; then
    # A shared npm cache that this user cannot write is a setup problem, not a
    # test failure: retry once with a cache of our own.
    tmp_cache="$(mktemp -d)"
    npm ci --no-audit --no-fund --cache "$tmp_cache" >/dev/null
  fi
fi

npm run build >/dev/null

if [ "$SUITE" = "all" ]; then
  FILES=(tests/*.test.mjs)
else
  FILES=("tests/${SUITE}.test.mjs")
  if [ ! -f "${FILES[0]}" ]; then
    echo "run-desktop-tests: no suite called '${SUITE}' (looked for desktop/${FILES[0]})" >&2
    exit 2
  fi
fi

# The output is shown, and then the LAST line names what failed.
#
# tools/scripts/run-tests.py reports each TST-* note's command by its final
# line of output, and node's final line is a duration. A red build that says
# "duration_ms 656" sends the reader to the logs to find out what broke; this
# says it in the line they were already going to read.
set +e
node --test --test-timeout 30000 "${FILES[@]}" 2>&1 | tee /tmp/deck-test-output.$$
status=${PIPESTATUS[0]}
set -e

if [ "$status" -ne 0 ]; then
  failed="$(grep -E '^(not ok|✖)' "/tmp/deck-test-output.$$" | sed -E 's/^(not ok [0-9]+ -|✖)[[:space:]]*//; s/ \([0-9.]+ms\)$//' | grep -v '^failing tests:$' | sort -u | paste -sd '; ' -)"
  # The first thing the failure said, so the one line CI prints carries a
  # reason and not only a name.
  why="$(grep -A 4 -E '^✖' "/tmp/deck-test-output.$$" | grep -E '^[[:space:]]+(Error|AssertionError|TypeError|[A-Za-z]+Error)' | head -1 | sed -E 's/^[[:space:]]+//' | cut -c1-120)"
  rm -f "/tmp/deck-test-output.$$"
  echo "FAILED ${SUITE}: ${failed:-node exited ${status} with no named failure}${why:+ -- ${why}}"
  exit "$status"
fi
rm -f "/tmp/deck-test-output.$$"
exit 0
