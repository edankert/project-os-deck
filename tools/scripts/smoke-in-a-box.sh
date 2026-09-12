#!/usr/bin/env bash
# Run the smoke checks in a Linux container, where nothing competes for the
# keyboard (ISS-0075, TASK-0078).
#
# Usage: bash tools/scripts/smoke-in-a-box.sh [loopback|lan|both]
#
# Why this exists: on a machine somebody is working at, the smoke run and the
# person fight for the system's focus, and the run's result depends on who won.
# CI already runs this suite on Linux under `xvfb` and passes; this is the same
# thing locally, so verifying a deliberate break costs two minutes instead of a
# push and twelve.
#
# What it does NOT replace: the frame-rate measurement (TASK-0079). Electron in
# a container renders through software GL, so a number taken here answers a
# different question from the one PHASE-0002's criterion asks, which is whether
# Glass holds up on the machine Edwin actually uses.
set -euo pipefail

WHICH="${1:-both}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IMAGE="project-os-deck-smoke"

if ! command -v docker >/dev/null 2>&1; then
  cat >&2 <<'MSG'
smoke-in-a-box: no `docker` command.

  brew install colima docker
  colima start --cpu 4 --memory 8

Colima is a Linux VM; the Docker CLI talks to it. Neither needs Docker
Desktop, and nothing about the box touches the host's display.
MSG
  exit 127
fi

if ! docker info >/dev/null 2>&1; then
  echo "smoke-in-a-box: docker is installed but no daemon is running. Try: colima start" >&2
  exit 127
fi

# Built once, and again only when package.json or the Dockerfile changes: the
# dependency install is its own layer.
echo "smoke-in-a-box: building the image (first time downloads Electron, later runs are cached)"
docker build -q -f "$ROOT/tools/docker/smoke.Dockerfile" -t "$IMAGE" "$ROOT" >/dev/null

# The repository is MOUNTED, so a break is one edit on the host. `node_modules`
# is masked by an anonymous volume, because the host's holds a macOS Electron
# binary the container cannot run.
echo "smoke-in-a-box: running ${WHICH} with no display of its own"
exec docker run --rm -t \
  -v "$ROOT:/deck" \
  -v "/deck/desktop/node_modules" \
  -w /deck \
  "$IMAGE" \
  bash tools/scripts/run-smoke.sh "$WHICH"
