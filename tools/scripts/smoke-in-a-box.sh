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

# **The case of the path matters inside the box and not outside it.** macOS is
# case-insensitive, so `cd /Users/Edwin/...` works and `pwd` hands back the
# capital E it was given. The Linux VM is case-sensitive and mounts the home
# directory as the system spells it, `/Users/edwin`. Docker does not refuse an
# unmounted path: it creates an empty directory and mounts that, so the run
# started, found no repository, and said "No such file or directory" about a
# script sitting right there on the host.
if [ "$(printf '%s' "${ROOT:0:${#HOME}}" | tr '[:upper:]' '[:lower:]')" = "$(printf '%s' "$HOME" | tr '[:upper:]' '[:lower:]')" ]; then
  ROOT="${HOME}${ROOT:${#HOME}}"
fi

# The sidecar is a sibling checkout and is mounted beside the repository, so
# `../project-os-cockpit` resolves inside the box exactly as it does outside.
SIBLING="$(cd "$ROOT/.." && pwd)/project-os-cockpit"

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
# A mount that did not land is an empty directory, which reads as a missing
# file much later and much less clearly. Say so here instead.
if [ ! -d "$SIBLING" ]; then
  echo "smoke-in-a-box: no sidecar checkout at ${SIBLING}. Deck reads through it and never vendors it." >&2
  exit 127
fi

if ! docker run --rm -v "$ROOT:/deck" alpine test -f /deck/tools/scripts/run-smoke.sh 2>/dev/null; then
  echo "smoke-in-a-box: ${ROOT} did not mount into the box." >&2
  echo "  Colima shares the home directory; a repository outside it needs: colima start --mount \"<path>:w\"" >&2
  exit 127
fi

echo "smoke-in-a-box: running ${WHICH} with no display of its own"
# **A container's /dev/shm is 64MB and Chromium needs more.** Left at the
# default, the renderer stalls rather than crashing, which reads as a slow
# machine and is not one.
exec docker run --rm -t \
  --shm-size=1g \
  -e DECK_SMOKE_DEBUG="${DECK_SMOKE_DEBUG:-}" \
  -v "$ROOT:/work/project-os-deck" \
  -v "$SIBLING:/work/project-os-cockpit" \
  -v "/work/project-os-deck/desktop/node_modules" \
  -w /work/project-os-deck \
  "$IMAGE" \
  bash tools/scripts/run-smoke.sh "$WHICH"
