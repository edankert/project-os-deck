---
type: "[[task]]"
id: TASK-0028
aliases: ["TASK-0028"]
title: "A card face per type, so a phase shows progress, an issue shows severity and a test shows how stale its last walk is"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[REFERENCE-PHASE-0001-REVIEW]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
parent: "FEAT-0005"
effort: ""
due: ""
depends: ["TASK-0023"]
blocks: []
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[DES-0002-The-Glass-Cockpit]]"]
tests: []
---

# A card face per type

## Objective

A card stops looking the same whatever it holds. A phase and a feature show how much of their work is finished, an issue shows its severity, and a test shows whether its last walk has gone stale.

## Detail

Every card today shows id, title, type and a status band, which is `desktop/src/renderer/cards.ts`. That is the cockpit's row with rounded corners. The information the faces need is already in the payload: the features view sends a phase group's children, and the tests view sends adequacy, stale and last_verified per item. DES-0002 drew these faces; this task builds the flat version of them.

## Acceptance

- A phase card shows how many of its items are finished out of how many it has, and the fraction matches what the cockpit reports for the same phase.
- A feature card shows the same for its tasks.
- An issue card shows its severity in a way a person can sort by at a glance, distinct from its status.
- A test card shows when it was last verified and marks it when that has gone stale.
- A note whose type has no special face still draws, with the id, title, type and status band it has now.
- The faces are drawn by the same pooled element, so a view of four hundred cards is no slower than it is today.

## Steps

- [ ] Carry adequacy, stale, last_verified and the child counts through the client into the card model.
- [ ] Add a face per type to the card renderer, with one default face for the types that have none.
- [ ] Keep every face in one pooled element so the pool's arithmetic is unchanged.
- [ ] Add a check that each type draws its own face and that an unknown type falls back rather than failing.

## Notes

Hue is left saying what a note is rather than how urgent it is, which is the decision DES-0002 records. Priority is carried by the Needs-you group in TASK-0023, not by colour.
