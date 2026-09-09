---
type: "[[task]]"
id: TASK-0039
aliases: ["TASK-0039"]
title: "The index watches the workspace and carries a revision, so a view knows its picture is old"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0011-Decks-Own-Index]]"]
parent: "FEAT-0011"
effort: ""
due: ""
depends: ["TASK-0038"]
blocks: ["TASK-0040"]
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]", "[[TASK-0051-The-Changed-Under-You-Mark]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# The index watches and carries a revision

## Objective

While Deck runs, the index stays current: a note edited in the cockpit, in Obsidian or by an agent changes Deck's record without a restart. Every change raises one number, the index revision, which is how any window finds out its picture is old.

## Detail

**The revision is the point of this task, not the watching.** A watcher that silently updates records leaves every open window drawing a list built from records that no longer exist, with nothing to compare. One monotonic number per workspace, raised on every accepted change, gives the renderer a cheap question: is the revision I drew from still the current one. [[TASK-0051-The-Changed-Under-You-Mark]] in [[FEAT-0013-The-First-Write]] is the first consumer, and Glass's rule that a change arriving mid-view is announced rather than applied is the second.

**Rebuilding the whole index on every keystroke is the failure to avoid.** A workspace of 1537 notes cannot be re-walked because one file was saved. A change to one file re-reads that file. A change that cannot be attributed to one file — a directory renamed, many files arriving at once — coalesces into one rebuild after a short quiet period rather than one rebuild per event.

**The store already broadcasts, so the revision travels the way everything else does.** [[FEAT-0003-One-Store-In-The-Main-Process]] holds the state every window subscribes to and already carries a revision field. This task decides whether the index revision is that field or a second one beside it, and writes the reason down; two revisions that mean different things must not share a name.

## Acceptance

- Editing a note's frontmatter on disk changes its record and raises the revision, with no restart and no re-open of the workspace.
- Adding a note adds a record; deleting one removes it; renaming one is an addition and a removal rather than a record with a stale path.
- A single file's change re-reads that file only, asserted by counting reads rather than by timing.
- A burst of changes raises the revision and rebuilds once, not once per file.
- The revision is monotonic per workspace and never falls, including across a rebuild.
- Every window sees the new revision through the store, and the suite proves it without Electron.

## Steps

- [ ] Decide and record whether the index revision is the store's existing revision or a field beside it.
- [ ] Implement the watcher in the main process, over the walk TASK-0038 built.
- [ ] Coalesce bursts, with the quiet period a named constant rather than a literal.
- [ ] Handle rename, delete and a directory arriving whole.
- [ ] Extend the suite in [[TST-0029-The-Index-Reads-What-Is-On-Disk]] with the change cases, driven by writing real files into a temporary directory.

## Notes

Deck already reuses a sidecar the cockpit started, so two programs will be watching the same directory. That is not a conflict — both are reading — but it is a reason to keep Deck's watcher cheap and to leave the file alone.
