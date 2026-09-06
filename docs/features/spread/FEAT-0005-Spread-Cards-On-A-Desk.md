---
type: "[[feature]]"
id: FEAT-0005
aliases: ["FEAT-0005"]
title: "Spread: notes as cards on a desk, and a desk you can save and come back to"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
goal: "Deck's first view shows notes as cards a person arranges, rather than as a list they scroll. An arrangement is a desk; a desk has a name, is saved, and reopens as it was left."
requirements: []
tasks: ["[[TASK-0015-Notes-Become-Cards]]", "[[TASK-0016-A-Desk-Is-Saved-And-Reopened]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
---

# Spread

## Goal

Deck's first view shows notes as cards a person arranges, rather than as a list they scroll. An arrangement is a desk; a desk has a name, is saved, and reopens as it was left.

## Scope

**In scope.** Cards built from the list the sidecar already returns, so a card shows what the cockpit's row shows: id, title, type and status band. Several cards visible at once. A desk that records which cards are on it and where, saved by name into Deck's store and restored on demand.

**Out of scope.** The three depth bands, the console as furniture and the neighbourhood ring. Those are Glass, and they are [[PHASE-0002-Glass]].

**Out of scope.** Editing a note from a card. Deck reads.

## Acceptance

- A view shows its notes as cards, several at once, each carrying the note's id, title, type and status band.
- A card's status band matches what the sidecar reports for that note, checked against the same note in the cockpit.
- A desk saved by name reopens with the same cards in the same places, across a restart.
- A desk that names a note the workspace no longer has opens without that card and without failing.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0015-Notes-Become-Cards]], [[TASK-0016-A-Desk-Is-Saved-And-Reopened]]
- Plan: `docs/features/spread/plan/PLAN.md`

## Where this stands

**2026-09-06: built and tested; the acceptance walk is owed.** The status is `review` rather than `done` because one criterion here can only be settled by a person doing something a machine cannot: opening this repository in the cockpit and in Deck side by side and comparing the ids, the order and the statuses. That walk is [[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]].
