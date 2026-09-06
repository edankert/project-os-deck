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
  exec node --test --test-timeout 30000 tests/*.test.mjs
fi

FILE="tests/${SUITE}.test.mjs"
if [ ! -f "$FILE" ]; then
  echo "run-desktop-tests: no suite called '${SUITE}' (looked for desktop/${FILE})" >&2
  exit 2
fi
exec node --test --test-timeout 30000 "$FILE"
