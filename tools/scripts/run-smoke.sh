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

# **The binary, not the package.** `run-desktop-tests.sh` installs with
# ELECTRON_SKIP_BINARY_DOWNLOAD=1, because the 321 node checks never need a
# ~100MB download — which leaves `node_modules/electron` present and its
# executable absent, and the failure that produces is a stack trace rather than
# a sentence. `path.txt` is the file the package writes to say where its binary
# went, so its presence is the question.
have_electron() {
  [ -s node_modules/electron/path.txt ] \
    && [ -e "node_modules/electron/dist/$(cat node_modules/electron/path.txt)" ]
}

if [ ! -d node_modules ] || ! have_electron; then
  # Fetch it rather than refusing. This script is TST-0037's `command:`, so it
  # runs in whatever environment `run-tests.py` runs in — including the
  # template-owned CI job, which installs nothing itself (ISS-0049).
  #
  # The retry with a cache of our own is `run-desktop-tests.sh`'s, for the same
  # reason: a shared npm cache this user cannot write is a setup problem rather
  # than a test failure. Without it, the first `npm ci` had already removed
  # `node_modules` before failing, which left the checkout worse than it found
  # it.
  if ! npm ci --no-audit --no-fund >/dev/null 2>&1; then
    tmp_cache="$(mktemp -d)"
    if ! npm ci --no-audit --no-fund --cache "$tmp_cache" >/dev/null; then
      echo "run-smoke: could not install Deck's dependencies" >&2
      exit 127
    fi
  fi
fi

if ! have_electron; then
  echo "run-smoke: Electron's binary is not installed and could not be fetched" >&2
  exit 127
fi

# **A display, on Linux.** macOS always has one. Rather than refuse, put one
# there: `xvfb-run` is on GitHub's ubuntu images and on most desktop Linux.
# Re-exec rather than wrap each command, so both configurations share one
# server and the LAN run's network binding is unaffected.
if [ "$(uname -s)" = "Linux" ] && [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
  if [ -n "${DECK_SMOKE_UNDER_XVFB:-}" ]; then
    echo "run-smoke: still no display under xvfb-run" >&2
    exit 127
  fi
  if command -v xvfb-run >/dev/null 2>&1; then
    exec env DECK_SMOKE_UNDER_XVFB=1 xvfb-run --auto-servernum bash "${BASH_SOURCE[0]}" "$WHICH"
  fi
  echo "run-smoke: no display and no xvfb-run; install xvfb, or run this where there is a screen" >&2
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
    // **EVERY block, not the last one** (ISS-0051). Reading only the final
    // verdict meant a failing one followed by any later object beginning "ok"
    // exited 0 in silence — and parsing the JSON at all was because the exit
    // code was not enough.
    const bad = [];
    let ok = true;
    for (const block of blocks) {
      let v;
      try { v = JSON.parse(block); } catch { ok = false; bad.push("a verdict that will not parse"); continue; }
      if (v.ok !== true) ok = false;
      bad.push(...(v.failures || []), ...(v.skipped || []));
    }
    console.log(ok && bad.length === 0 ? "OK" : "BAD " + bad.join("; "));
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
