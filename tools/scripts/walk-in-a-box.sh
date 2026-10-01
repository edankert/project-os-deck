#!/usr/bin/env bash
# Run one scripted walk of the real application in the Linux box, and keep its
# pictures and its log (FEAT-0020, TASK-0099).
#
# Usage: bash tools/scripts/walk-in-a-box.sh <walk> [--copy] [--workspace <path>] [--name <name>]
#
#   <walk>              a script under desktop/demos, with or without `.cjs`
#   --copy              run on a throwaway copy of the notes, made inside the
#                       box. A walk that changes notes on disk requires it.
#   --workspace <path>  another project-os repository on this machine. It is
#                       always copied: the box never writes to it.
#   --name <name>       the output directory's name (default: the walk's)
#
# The pictures and `drive.json` land in desktop/dist/walks/<name>, which is
# build output and is not committed. The exit code is the walk's: 0 when every
# check it records held and the workspace it read is unchanged.
#
# What a walk is and is not. The smoke run answers "did every check hold" and
# is the regression gate. A walk drives a route a person takes, with the same
# real pointer and keyboard, records each claim with what was seen, and keeps
# pictures a reader can look at. It is evidence that the route works in the
# real application. It is not a person's acceptance walk, and it records no
# verdict in any ledger.
#
# Why the box: a window on the Mac takes the keyboard from whoever is typing
# (ISS-0075). Rendering here is software GL, so nothing timed in a walk says
# how Glass performs on the Mac.
set -euo pipefail

WALK=""
COPY=0
WORKSPACE=""
NAME=""
while [ $# -gt 0 ]; do
  case "$1" in
    --copy) COPY=1 ;;
    --workspace) WORKSPACE="${2:?--workspace needs a path}"; shift ;;
    --name) NAME="${2:?--name needs a name}"; shift ;;
    -*) echo "walk-in-a-box: unknown option $1" >&2; exit 2 ;;
    *) WALK="$1" ;;
  esac
  shift
done
if [ -z "$WALK" ]; then
  echo "usage: bash tools/scripts/walk-in-a-box.sh <walk> [--copy] [--workspace <path>] [--name <name>]" >&2
  exit 2
fi
WALK="${WALK%.cjs}"
WALK="${WALK##*/}"
NAME="${NAME:-$WALK}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IMAGE="project-os-deck-smoke"

# The Linux VM mounts the home directory as the system spells it; see
# smoke-in-a-box.sh for what a path in the wrong case does.
lower_home() {
  local path="$1"
  if [ "$(printf '%s' "${path:0:${#HOME}}" | tr '[:upper:]' '[:lower:]')" = "$(printf '%s' "$HOME" | tr '[:upper:]' '[:lower:]')" ]; then
    path="${HOME}${path:${#HOME}}"
  fi
  printf '%s' "$path"
}
ROOT="$(lower_home "$ROOT")"
SIBLING="$(cd "$ROOT/.." && pwd)/project-os-cockpit"

if [ ! -f "$ROOT/desktop/demos/$WALK.cjs" ]; then
  echo "walk-in-a-box: no walk at desktop/demos/$WALK.cjs" >&2
  exit 2
fi
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "walk-in-a-box: docker is not running. Try: colima start (see smoke-in-a-box.sh)" >&2
  exit 127
fi
if [ ! -d "$SIBLING" ]; then
  echo "walk-in-a-box: no sidecar checkout at ${SIBLING}. Deck reads through it and never vendors it." >&2
  exit 127
fi

docker build -q -f "$ROOT/tools/docker/smoke.Dockerfile" -t "$IMAGE" "$ROOT" >/dev/null

MOUNTS=(-v "$ROOT:/work/project-os-deck" -v "$SIBLING:/work/project-os-cockpit" -v "/work/project-os-deck/desktop/node_modules" -v "/work/project-os-deck/.cockpit")
PREPARE=""
ARGS=""
if [ -n "$WORKSPACE" ]; then
  WORKSPACE="$(lower_home "$(cd "$WORKSPACE" && pwd)")"
  if [ ! -f "$WORKSPACE/SNAPSHOT.yaml" ]; then
    echo "walk-in-a-box: ${WORKSPACE} carries no SNAPSHOT.yaml, so it is not a project-os repository" >&2
    exit 2
  fi
  # Read-only, and then copied: nothing the box does can reach the original.
  MOUNTS+=(-v "$WORKSPACE:/work/source:ro")
  PREPARE="rm -rf /tmp/deck-copy && mkdir -p /tmp/deck-copy && cp -r /work/source/docs /work/source/SNAPSHOT.yaml /tmp/deck-copy/ && (cp /work/source/CONTEXT.md /tmp/deck-copy/ 2>/dev/null || true) && "
  ARGS="--workspace /tmp/deck-copy"
elif [ "$COPY" = 1 ]; then
  PREPARE="rm -rf /tmp/deck-copy && mkdir -p /tmp/deck-copy && cp -r ../docs ../SNAPSHOT.yaml ../CONTEXT.md /tmp/deck-copy/ && "
  ARGS="--workspace /tmp/deck-copy"
fi

# The commit the walk ran on, for its log: the box has no use for git otherwise.
BUILD="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
if [ -n "$(git -C "$ROOT" status --porcelain -- desktop/src 2>/dev/null)" ]; then BUILD="${BUILD}+uncommitted"; fi

echo "walk-in-a-box: ${WALK}${ARGS:+ on a throwaway copy}; pictures in desktop/dist/walks/${NAME}"
exec docker run --rm --shm-size=1g -e DECK_BUILD="$BUILD" -e DECK_SCALE_VIEW="${DECK_SCALE_VIEW:-}" "${MOUNTS[@]}" -w /work/project-os-deck/desktop "$IMAGE" \
  bash -c "set -o pipefail; npm run build >/dev/null && rm -rf 'dist/walks/$NAME' && ${PREPARE}timeout 1500 npx electron . --drive 'demos/$WALK.cjs' --drive-out 'dist/walks/$NAME' $ARGS 2>&1 | grep -v -E 'bus.cc|viz_main_impl|pip as the'"
