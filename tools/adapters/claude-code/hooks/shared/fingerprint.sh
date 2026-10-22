#!/usr/bin/env bash
# Two digests of the working tree, one per line: everything, and the part the
# project line reads (SNAPSHOT.yaml and docs/). The project-os plugin runs this
# when a main-loop turn starts and when it stops, and treats a difference as a
# write (HC-006, project-os-dev TASK-0200).
#
# Each digest covers three things, because each alone misses a change:
#   - `git status`, for a file that appears, goes or changes state;
#   - the diff against HEAD, for a tracked file already modified and modified
#     again (its status line does not change);
#   - the content of each untracked file, for an untracked file changed again
#     (its `??` line does not change and the diff leaves it out;
#     project-os-dev TASK-0209).
# A path changed and changed back within one turn is not caught; the check is
# about a file left changed. Exit 3 means "not a git repository".
#
# Run from the repository's root. Reads only; writes nothing.

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 3

state() { # state [pathspec...]
  git status --porcelain=v1 -z -- "$@"
  git diff HEAD --no-ext-diff -- "$@" 2>/dev/null
  git ls-files --others --exclude-standard -- "$@" | git hash-object --stdin-paths 2>/dev/null
}

all=$(state | cksum)
docs=$(state SNAPSHOT.yaml docs | cksum)
printf '%s\n%s\n' "$all" "$docs"
