---
type: "[[issue]]"
id: ISS-0030
aliases: ["ISS-0030"]
title: "A change to any file at all rebuilds Deck's index and tells every window its notes changed, so saving an Obsidian layout raises the changed-under-you mark"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The independent review of PHASE-0001, 2026-09-09, whose verdicts and findings are in the `## Independent review — 2026-09-09` section of each feature note"]
severity: low
component: main
parent: ""
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[TASK-0039-The-Index-Watches-And-Carries-A-Revision]]", "[[TASK-0051-The-Changed-Under-You-Mark]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# Something changed, and it was not a note

## Problem

`NoteIndex.noticed` in `desktop/src/main/note-index.ts` treats anything that is not one Markdown file as a full rebuild, and `build()` raises the revision unconditionally. So a write to `.obsidian/workspace.json` — which Obsidian does whenever a pane moves — re-walks the whole tree and raises the number that [[TASK-0051-The-Changed-Under-You-Mark]] uses to say "These notes changed on disk", when no note did.

**The rebuild-on-anything rule is right and the raise-on-anything rule is not.** A directory renamed, or a watcher event with no name, genuinely cannot be attributed to one file and a rebuild is the honest answer. But a rebuild that produces the same records should not tell anybody their picture is old, and a change under an excluded directory should not even cause the rebuild.

**Cost today: a banner nobody can act on.** On a large vault the cost is also the walk itself, repeated for every layout save.

## Expected

An excluded path is ignored. A rebuild that changes no record raises no revision.

## Next Actions
- [ ] Ignore a change under a directory the walk does not read
- [ ] Raise the revision only when the records actually differ

## Fixed, 2026-09-09

**A change under a directory the walk does not read is ignored entirely** — no re-walk and no revision. Obsidian writes `.obsidian/workspace.json` whenever a pane moves, and that is not a change to anybody's notes.

**A rebuild that finds the same records raises nothing.** Compared by path and modification time, which is what a change to a note moves; comparing every frontmatter value of 2715 notes would be answering a question the file system already answered. The FIRST build always raises, because a window drawing from revision 0 has drawn nothing.

**One check had to be corrected rather than added**, and it is worth saying which: "the revision is monotonic, and a rebuild does not send it backwards" called `build()` twice and asserted the number rose each time. That asserted the defect. It now says what is actually wanted — the revision never falls, and only a real change raises it.

**Evidence.** `bash tools/scripts/run-desktop-tests.sh index`. Reverting the guard fails four checks.
