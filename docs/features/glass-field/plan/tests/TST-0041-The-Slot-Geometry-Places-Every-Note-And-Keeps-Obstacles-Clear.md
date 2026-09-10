---
type: "[[test]]"
id: TST-0041
aliases: ["TST-0041"]
title: "The slot geometry places every note, gives a thousand quiet tiles a stated shape, keeps an obstacle clear at any yaw, and deals nothing on a turn"
status: active
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[TASK-0030-The-Slot-Geometry]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/slots.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh slots"
covers: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
issues: []
tasks: ["[[TASK-0030-The-Slot-Geometry]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]"]
artifacts: []
adequacy: "Measured 2026-09-10 against the built modules, five mutations and five killed. A quiet band of twenty rows fails 1. Dealing the front band without excluding obstacles fails 2. A turn that assigns fails 1. Anchoring the card at its top fails 1. A heading that does not start a new column fails 1. After ISS-0058, the obstacle margin taken straight ahead fails the random-placement test."
mutation_score: "6 mutations, 6 killed (2026-09-10)"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[REFERENCE-DES-0002-REVIEW]]"]
---
# The slot geometry places every note and keeps obstacles clear

## Purpose

`desktop/src/shared/slots.ts` turns the bands into positions on a cylinder. The DES-0002 review found two defects in the prototype's geometry: a card anchored one way in the slot test and another in the renderer, and obstacles tested at the yaw of the last deal. Both are rules here, and this suite holds them.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh slots`.

## Expected results

- 2660 notes, Your Trainer's size, all get positions and no two coincide.
- The quiet band's shape is forty to a row and twenty-five rows to a layer, each layer further back, and it is out of sight from the front and in sight when the person turns round.
- No slot inside an obstacle is dealt, at six yaws, and no dealt card's box is drawn under the pane.
- An obstacle uses the spares first, and past them the band counts what did not fit.
- The card box is anchored at its centre by the transform, and the stylesheet's `transform-origin` agrees.
- 120 turn steps deal nothing; a turn's end deals once when a pane is on screen and not at all when none is.
- The compass counts every dealt note out of sight.
- A heading of three or more starts a new column in the middle band.

## Evidence

2026-09-10: 10 of 10 pass; the random-placement test was added for ISS-0058.

## Adequacy (who verifies this test?)

See `adequacy:` above.
