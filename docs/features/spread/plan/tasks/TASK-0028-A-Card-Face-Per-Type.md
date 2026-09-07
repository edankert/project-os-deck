---
type: "[[task]]"
id: TASK-0028
aliases: ["TASK-0028"]
title: "A card face per type, so a phase shows progress, an issue shows severity and a test shows how stale its last walk is"
status: done
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
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: approved
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[DES-0002-The-Glass-Cockpit]]"]
tests: ["[[TST-0018-A-Card-Shows-What-Its-Note-Is]]"]
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

- [x] Carry adequacy, stale, last_verified and the child counts through the client into the card model.
- [x] Add a face per type to the card renderer, with one default face for the types that have none.
- [x] Keep every face in one pooled element so the pool's arithmetic is unchanged.
- [x] Add a check that each type draws its own face and that an unknown type falls back rather than failing.

## Notes

Hue is left saying what a note is rather than how urgent it is, which is the decision DES-0002 records. Priority is carried by the Needs-you group in TASK-0023, not by colour.

## Where this stands

**2026-09-07: built.** `shared/faces.ts` decides a card's face from the note: a phase or feature shows how much of its work is finished, an issue shows its severity, a test shows its last walk and whether it has gone stale, and anything else draws what every card has. One pooled element draws every face, so a view of four hundred cards costs what it did before.

The automated check is [[TST-0018-A-Card-Shows-What-Its-Note-Is]], and the whole suite passes: 143 checks across the desktop suites on 2026-09-07.

## Independent review — 2026-09-07

**Verdict: approved.** Clean context, separate session. `faceFor` decides from the note and nothing else, the payload's own progress is preferred over a recount, an unknown type falls back to what every card has, and [[TST-0018-A-Card-Shows-What-Its-Note-Is]] fails under each of the mutations its adequacy line names. The pool's arithmetic is unchanged: one `.face` node is repainted for every face, including the progress bar.

Two criteria rest on reading rather than on a check. That a phase's fraction matches what the cockpit reports for the same phase is settled by the walk, not by the suite — the suite counts children with Deck's own status vocabulary, which is `shared/faces.ts`'s list and not the cockpit's. And "no slower than it is today" is asserted rather than measured; the code supports it.
