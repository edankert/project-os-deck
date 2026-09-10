---
type: "[[issue]]"
id: ISS-0065
aliases: ["ISS-0065"]
title: "Five checks still cannot fail for the defect they are named for, and four notes are stale after the fixes"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["The second independent review of FEAT-0009, FEAT-0010 and FEAT-0014, 2026-09-10"]
severity: low
component: tests
parent: ""
related: ["[[ISS-0063-Checks-And-Notes-Claim-More-Than-They-Measure]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Five checks still cannot fail, and four notes are stale

## Problem

- **Nothing checks that the renderer passes the shared-first set** to the deal. With it removed, the smoke run marked 2 of 8 shared notes and passed: ISS-0059's original defect.
- **The quiet band's count on the compass** is checked for digits, not for the right number; forced to 0 it passed.
- **The measurement records the reach but does not require it.** The reviewer's two runs held no reach; the author's did, and FEAT-0009's numbers are from it.
- **The reduced-motion cut check failed once in two full runs**, and it passes vacuously when the field already faces the note. The likely cause is the earlier keyboard lift turning the field late, once its neighbourhood arrives.
- **A lift under normal motion turning to face the neighbours** is not checked; the reach checks read the renderer's state, not the canvas; the view-switch check under reduced motion requires the row, not the card.
- **Stale notes**: the three features read `planned` with every task done; SNAPSHOT's focus note says the issues are "being fixed now"; `field.ts`'s header says `bandCards` applies the rule, and `dealField` has its own loop now; two TASK-0055 lines still say "second display" and "highlighted".

## Fix

Check that every shared note has a front slot; compare the quiet count with the slots dealt; require the reach in the measurement; let the earlier lift settle, and check the cut from a yaw away from the note; check that a lift turns the field and that the wires are on the canvas; correct the notes.

## Acceptance

- [x] Each of these checks fails when its fix is reverted.
- [x] The notes say what the code does.

## Fixed, 2026-09-10

Each check below was run against a build with its fix broken on purpose, one break per run of the Glass section (`DECK_SMOKE_ONLY=glass DECK_SMOKE_DEBUG=1 electron . --smoke`), and each failed.

| Check | Break | What the failing run printed |
|---|---|---|
| Every shared note is dealt into the front band first | shared notes lose their first rank in `frontRank()` | "2 of 8" |
| The compass's quiet count equals the notes dealt there | the count is one too high | "63 in the quiet band", 62 dealt |
| A lift under normal motion turns the field to face its neighbours | `faceFront()` cuts instead of flying | "0 frames between" |
| The reduced-motion cut, from a yaw away from the note | `flyTo()` flies under reduced motion | "from 0.000 straight to 0.104, held at 0.979" |
| A wire is drawn on the canvas, read back as a pixel | the recorded wire is moved 40 pixels off the drawn one | "alpha 0 at its middle" |
| A reduced-motion view switch highlights the card as well as the row | the card's highlight removed | "row true, card false" |
| A reduced-motion landing highlights the target's name | the `landed` class removed | "" |

- **The measurement requires the reach.** `desktop/src/main/measure.ts` tries each near card in turn and throws when none can be reached, so a measurement with no wires cannot be recorded. Its run after this fix held two panes and a reach on ISS-0065 with seven neighbours.
- **The cut check waits for the earlier lift's turn to settle**, then presses Down until the field has somewhere to cut to; it records the yaw before, straight after and 300 milliseconds after.
- **Overlap checks no longer use a hit test.** `visibleCards()` keeps a card only if the pointer would hit it, and a card wholly under a pane fails that test, so an overlap check built on it could never see such a card. The three overlap checks now use `nearCards()`, every near card drawn in the field.
- **The notes.** FEAT-0009, FEAT-0010 and FEAT-0014 are `review` and FEAT-0001 is `doing`; the snapshot's focus note says what is left; `field.ts`'s header says `dealField` applies the band rule; TASK-0055's first acceptance line says the reader stands in the drag's direction, and its landing line is now true (ISS-0064). [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] says why its `command:` is empty.
- **Two failures seen once, in a run with a break unrelated to them**: the pane section lifted the same card twice and got an empty desk, and the orbit listed 24 of 25 cards in the navigator. Neither came back in four clean runs of the Glass section and two full runs; they are recorded here as leads, not as defects.
