---
type: "[[task]]"
id: TASK-0051
aliases: ["TASK-0051"]
title: "The changed-under-you mark: a write makes every other window stale, and the change is announced rather than applied"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0013-The-First-Write]]"]
parent: "FEAT-0013"
effort: ""
due: ""
depends: ["TASK-0047", "TASK-0039"]
blocks: []
related: ["[[FEAT-0013-The-First-Write]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]", "[[TASK-0039-The-Index-Watches-And-Carries-A-Revision]]", "[[PHASE-0002-Glass]]", "[[PHASE-0004-Parity]]"]
tests: ["[[TST-0033-The-Write-Channel-Exists-In-The-Shell-And-Not-When-Served]]"]
---

# The changed-under-you mark

## Objective

When the record changes — because Deck wrote, because the cockpit wrote, or because a person edited a file in Obsidian — every window showing that record says so. Nothing is re-drawn underneath a person; the new state arrives when they ask for it.

## Detail

**A write is the first time Deck needs this rule, and the rule is already written down.** [[PHASE-0002-Glass]] requires that a change arriving mid-view is announced, never applied silently, and [[PHASE-0004-Parity]] repeats it for live changes. Until now Deck never changed anything, so the question never arose. It arises the moment [[TASK-0049-The-Actuator-Row-And-One-Transition]] moves a status while a second window is showing it.

**Announcing, then applying on the person's action, is deliberate.** The cockpit reloads on server-sent events, and a page that re-arranges itself while somebody is reading it loses their place. Deck marks: a line saying what changed and a control that takes it. Glass makes the same choice for a card moving band mid-view.

**The signal is the index revision.** [[TASK-0039-The-Index-Watches-And-Carries-A-Revision]] raises a number on every accepted change and the store broadcasts it. A window compares the revision it drew from against the current one. That works for changes Deck did not make, which is the majority of them.

**One case is different and should behave differently: the window that made the write.** The person who ticked a criterion expects to see it ticked, not to be told that something changed. So the writing window re-reads and redraws the note it wrote to, and every other window is marked.

## Acceptance

- A change to a record raises the revision, and a window drawing from an older revision shows a mark saying what changed.
- The mark is not applied automatically: the view redraws when the person takes the offered action.
- The window that made the write re-reads and redraws the note it wrote, without a mark.
- A change made outside Deck — in the cockpit, or by editing a file — produces the same mark.
- A burst of changes produces one mark, not one per file.
- The mark clears when the view is redrawn, and does not survive a view switch as a stale message.

## Steps

- [ ] Carry the revision a window drew from, in the renderer's own state.
- [ ] Compare it against the store's revision on every broadcast and set the mark.
- [ ] Draw the mark and its action in the navigator and in the reader.
- [ ] Special-case the writing window's own note.
- [ ] Test with two windows in the store suite, and with a file changed on disk.

## Notes

This is the seam [[PHASE-0002-Glass]] and [[PHASE-0004-Parity]] both build on. Getting the shape right here — a mark plus an action, never a silent redraw — is worth more than the two verbs it currently serves.
