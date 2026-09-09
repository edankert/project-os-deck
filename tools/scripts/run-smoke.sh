#!/usr/bin/env bash
# Run Deck's smoke checks, on loopback and again on the network.
#
# The smoke run opens REAL Electron windows and is the only thing that reaches
# the renderer: `node --test` cannot load it (ISS-0008). Three guards live here
# and nowhere else — the content policy that stops a note running script
# (ISS-0038), the reason box on every verb (ISS-0040), and the design verdict
# Deck refuses to pretend it can record (ISS-0039) — and until TST-0037 named
# this script, no gate ran any of them (ISS-0044).
#
# Usage: bash tools/scripts/run-smoke.sh [loopback|lan|both]
#
# It needs Electron's binary and a display. `run-desktop-tests.sh` sets
# ELECTRON_SKIP_BINARY_DOWNLOAD=1 on purpose, because the node suites never
# need a ~100MB download; this one does. A machine without either gets exit 127
# — "command not found" — which `run-tests.py` reports as an environment gap
# locally and fails on in CI, which is the right way round: a check CI cannot
# run has no verdict.
set -euo pipefail

WHICH="${1:-both}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP="$(cd "$SCRIPT_DIR/../../desktop" && pwd)"
cd "$DESKTOP"

if ! command -v node >/dev/null 2>&1; then
  echo "run-smoke: node is required but not found" >&2
  exit 127
fi

if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund >/dev/null
fi

# The binary, not the package. `npm ci` under ELECTRON_SKIP_BINARY_DOWNLOAD=1
# installs the package and no executable, and the failure that produces is a
# stack trace rather than a sentence.
if ! node -e 'require("electron")' >/dev/null 2>&1 \
  || [ ! -e "node_modules/electron/dist" ] && [ ! -e "$(node -p 'try{require("electron")}catch(e){""}' 2>/dev/null)" ]; then
  echo "run-smoke: Electron's binary is not installed here; the smoke run needs it and a display" >&2
  exit 127
fi

# A display, on Linux. macOS always has one.
if [ "$(uname -s)" = "Linux" ] && [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
  echo "run-smoke: no display; run this under xvfb-run" >&2
  exit 127
fi

npm run build >/dev/null

# **The verdict is the JSON, not the exit code alone.** The run prints a final
# object with `ok`, `failures` and `skipped`; a skipped check is not a pass
# (TST-0036), and reading the object here means the one line CI shows names
# what failed instead of saying that Electron exited 1.
one() {
  local mode="$1" script="$2" out status
  out="$(mktemp)"
  set +e
  npm run "$script" >"$out" 2>&1
  status=$?
  set -e
  local verdict
  verdict="$(node -e '
    const fs = require("fs");
    const text = fs.readFileSync(process.argv[1], "utf-8");
    const blocks = text.match(/\{\s*"ok":[\s\S]*?\n\}/g) || [];
    if (blocks.length === 0) { console.log("NOVERDICT"); process.exit(0); }
    const v = JSON.parse(blocks[blocks.length - 1]);
    const bad = [...(v.failures || []), ...(v.skipped || [])];
    console.log(v.ok && bad.length === 0 ? "OK" : "BAD " + bad.join("; "));
  ' "$out")"
  if [ "$verdict" = "OK" ] && [ "$status" -eq 0 ]; then
    rm -f "$out"
    return 0
  fi
  if [ "$verdict" = "NOVERDICT" ]; then
    echo "FAILED smoke ${mode}: the run printed no verdict << $(grep -v '^$' "$out" | tail -n 4 | paste -sd '|' - | cut -c1-300)"
  else
    echo "FAILED smoke ${mode}: ${verdict#BAD }"
  fi
  rm -f "$out"
  return 1
}

failed=0
case "$WHICH" in
  loopback) one loopback smoke || failed=1 ;;
  lan) one lan "smoke:lan" || failed=1 ;;
  both) one loopback smoke || failed=1; one lan "smoke:lan" || failed=1 ;;
  *) echo "run-smoke: expected loopback, lan or both; got '$WHICH'" >&2; exit 2 ;;
esac
exit "$failed"
