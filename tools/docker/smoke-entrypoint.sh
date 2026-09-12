#!/usr/bin/env bash
# Give the box a screen and a sidecar, then run whatever it was asked to run.
#
# **The display is started here rather than by `xvfb-run`.** `run-smoke.sh`
# re-execs itself under `xvfb-run --auto-servernum` when it finds no display,
# which is the right thing on a CI runner and hung here every time: xvfb-run
# started Xvfb, lost its child, and sat in `sigsuspend` with no node process
# and no output, for half an hour. Exporting DISPLAY means the script finds a
# screen and never takes that branch, so the box has one fewer moving part
# than CI rather than one more.
#
# Deck consumes project-os-cockpit's sidecar from a sibling checkout and never
# vendors it, and `sidecar.ts` starts it with `python -m project_os_cockpit`,
# so the package has to be IMPORTABLE and not merely present. A mounted
# checkout cannot be installed while the image is built, so it is installed
# here, once per run.
set -euo pipefail

if [ ! -d /work/project-os-cockpit ]; then
  echo "smoke-box: no sidecar at /work/project-os-cockpit — mount it beside the repository" >&2
  exit 127
fi
if ! python3 -c 'import project_os_cockpit' >/dev/null 2>&1; then
  echo "smoke-box: installing the sidecar from the mounted sibling"
  python3 -m pip install --quiet --break-system-packages -e /work/project-os-cockpit
fi

# **How Electron draws with no GPU.** Its GPU process fails to initialise in
# a container and Chromium falls back to software COMPOSITING, which is far
# slower than SwiftShader: the field's own animation saturated a core and the
# run made no progress for half an hour. These ask for SwiftShader by name.
export ELECTRON_EXTRA_LAUNCH_ARGS="--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --disable-dev-shm-usage --no-sandbox"

export DISPLAY=:99
Xvfb "$DISPLAY" -screen 0 1600x1000x24 -nolisten tcp >/tmp/xvfb.log 2>&1 &
XVFB=$!
trap 'kill "$XVFB" 2>/dev/null || true' EXIT

# Wait for the screen rather than guessing at a sleep: a run that starts before
# the server is listening fails in a way that reads like a renderer defect.
for _ in $(seq 1 100); do
  if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then break; fi
  sleep 0.1
done
if ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
  echo "smoke-box: Xvfb never came up on $DISPLAY << $(tail -3 /tmp/xvfb.log)" >&2
  exit 127
fi
echo "smoke-box: screen ready on $DISPLAY"

exec "$@"
