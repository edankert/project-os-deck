---
type: "[[feature]]"
id: FEAT-0005
aliases: ["FEAT-0005"]
title: "Spread: notes as cards on a desk, and a desk you can save and come back to"
status: doing
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[PHASE-0001-Deck]]"]
goal: "Deck's first view shows notes as cards a person arranges, rather than as a list they scroll. An arrangement is a desk; a desk has a name, is saved, and reopens as it was left."
requirements: []
tasks: ["[[TASK-0015-Notes-Become-Cards]]", "[[TASK-0016-A-Desk-Is-Saved-And-Reopened]]", "[[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]", "[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]", "[[TASK-0025-Cards-Are-Dragged-And-Removed]]", "[[TASK-0027-Search-And-Filter-In-The-Renderer]]", "[[TASK-0028-A-Card-Face-Per-Type]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-PHASE-0001-REVIEW]]"]
---

# Spread

## Goal

Deck's first view shows notes as cards a person arranges, rather than as a list they scroll. An arrangement is a desk; a desk has a name, is saved, and reopens as it was left.

## Scope

**In scope.** Cards built from the list the sidecar already returns, so a card shows what the cockpit's row shows: id, title, type and status band. Several cards visible at once. A desk that records which cards are on it and where, saved by name into Deck's store and restored on demand.

**Added 2026-09-07, after the review Edwin accepted ([[REFERENCE-PHASE-0001-REVIEW]]).** The groups the sidecar already sends are drawn rather than flattened away, so Needs you comes first, phases hold their features and tasks, severity bands and test tiers are headings, and finished work folds away. The navigator list and the desk become two different surfaces: the desk starts empty and holds what a person put on it. Cards are dragged with the pointer and removed. The renderer owns search and filtering, because the pooled DOM means the browser's own find cannot see an undrawn note. A card's face depends on its type: progress for phases and features, severity for issues, staleness for tests.

**Out of scope.** The three depth bands, the console as furniture and the neighbourhood ring. Those are Glass, and they are [[PHASE-0002-Glass]].

**Out of scope.** Editing a note from a card. Deck reads.

## Acceptance

- A view lists its notes in the navigator, grouped as the sidecar grouped them, with what is owed at the top and finished work folded away.
- A card's status band matches what the sidecar reports for that note, checked against the same note in the cockpit.
- The desk starts empty; a note reaches it because a person put it there, and leaves it because a person took it off.
- A card is moved with the pointer and stays where it was released.
- A desk saved by name reopens with the same cards in the same places, across a restart.
- A desk that names a note the workspace no longer has opens without that card and without failing.
- Typing in the search box narrows the navigator to matching notes, including notes the pool had not drawn.
- A phase or feature card shows its progress, an issue card its severity, and a test card how stale its last walk is.

**2026-09-07:** the first criterion changed. It used to say a view shows its notes as cards on the desk. The desk is now a chosen subset, so the view's notes are listed in the navigator instead.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0015-Notes-Become-Cards]], [[TASK-0016-A-Desk-Is-Saved-And-Reopened]], [[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]], [[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]], [[TASK-0025-Cards-Are-Dragged-And-Removed]], [[TASK-0027-Search-And-Filter-In-The-Renderer]], [[TASK-0028-A-Card-Face-Per-Type]]
- Plan: `docs/features/spread/plan/PLAN.md`

## Where this stands

**2026-09-07: the status went back to `doing`, because five new tasks are in backlog.** A feature at `review` is waiting on a walk and nothing else. This one is waiting on work again, so `review` would be a false reading of it, and `STATUSES.md` puts `doing` before `review` for exactly this. It returns to `review` when TASK-0023, TASK-0024, TASK-0025, TASK-0027 and TASK-0028 are done and only the walks are owed.

**Why the tasks were added.** A review on 2026-09-07 found that what Spread shows is a flat grid of identical cards with a reader beside it, and that nothing on the desk can be arranged, grouped or searched ([[REFERENCE-PHASE-0001-REVIEW]]). Deck's own state file held zero saved desks after a day of use, because a desk saved wherever the flow layout had put the cards. Edwin accepted the finding the same day.

**2026-09-06: built and tested; the acceptance walk is owed.** One criterion here can only be settled by a person doing something a machine cannot: opening this repository in the cockpit and in Deck side by side and comparing the ids, the order and the statuses. That walk is [[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]], and its Procedure needs rewording once TASK-0024 lands, because it tells a person to open a view and watch the desk fill.
