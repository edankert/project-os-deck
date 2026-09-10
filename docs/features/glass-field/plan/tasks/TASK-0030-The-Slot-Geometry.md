---
type: "[[task]]"
id: TASK-0030
aliases: ["TASK-0030"]
title: "The slot geometry: a cylinder of slots dealt from the bands, a shape for a thousand quiet tiles, and an obstacle that is a sector rather than a rectangle"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-10
source: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
parent: "FEAT-0009"
effort: ""
due: ""
depends: ["TASK-0029"]
blocks: ["TASK-0031"]
related: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]"]
tests: ["[[TST-0041-The-Slot-Geometry-Places-Every-Note-And-Keeps-Obstacles-Clear]]"]
---

# The slot geometry

## Objective

A pure function turns the three bands into positions on a cylinder the person stands inside. Twelve slots in front, forty in the middle, and a shape for a thousand quiet tiles behind. An obstacle, which is anything the field must flow around, is a sector of the cylinder rather than a rectangle on the screen, so turning does not rotate cards underneath it.

## Detail

DES-0002's stage dealt cards into 122 slots and wrapped the quiet band past 70, so no artifact ever showed a thousand notes with a shape. The review named that a design question: whether the quiet band is a texture or a stack decides what the far field is. This task answers it in geometry rather than in the renderer. The quiet band is rows or a spiral on the far side of the cylinder, with a stated number of tiles per row and a stated count of rows, so 2000 tiles have positions and the renderer draws what falls into view.

The review found two geometry defects in the prototype and both are rules here. The slot test treated the projected y as a card's centre while the renderer used it as the card's top, so four near cards sat under the console at rest; the card box is anchored the same way in the slot test and in the renderer. And slots were tested for obstacles at the yaw of the last assignment, so after a 70-degree turn three cards had rotated under the console; an obstacle is a sector, and assignment runs again on turn end.

Slot assignment runs on view change, on panel move and on turn end. It never runs inside the frame loop, which is why turning stays smooth while the card set stays put.

## Acceptance

- The function is pure, takes the bands, the obstacles and the viewport, returns a position per note, and is tested without Electron.
- With 2660 notes (Your Trainer's size) every note has a position and no two positions coincide.
- A quiet band of a thousand notes has a stated shape, and the test asserts the row and column each tile lands in.
- An obstacle is given as an angular sector and a depth, and no slot inside it is dealt to a card, at any yaw.
- The card box is anchored identically in the slot test and in the renderer's transform, asserted by one shared constant rather than two.
- Assignment is not called from the turn handler; the test asserts the call count across a simulated turn is zero.

## Steps

- [x] Choose the quiet band's shape (rows or a spiral) and write its arithmetic with the tile counts stated.
- [x] Implement the function over the band function's output, with obstacles as sectors.
- [x] Share the card box anchor with the renderer as one constant.
- [x] Add the suite: capacity, uniqueness, obstacle exclusion at several yaws, the quiet band's shape, and the no-assignment-on-turn rule.
- [x] Write the automated test note and link it from `tests:`.

## Notes

The starting numbers are DES-0002's: twelve front, forty mid. They are inputs to the function, not constants inside it, because [[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]] may move them and the obstacles later include a console ([[PHASE-0004-Parity]]) that takes a sector of its own.

## Outcome

**Done 2026-09-10.** `desktop/src/shared/slots.ts` places every banded note on a cylinder. The front band is four rows in five columns 34 degrees apart at depth 380; twelve slots are used and the rest are spares for obstacles. The middle band is four rows in eight columns a side, from 50 degrees out, at depth 620, dealt a heading to a column when the heading has three notes or more. The quiet band is rows, not a spiral: forty tiles to a row across 156 degrees behind the person and twenty-five rows to a layer, a thousand tiles a layer, each further layer 150 units back. Rows, because a person looking for one note scans a shelf.

**The two prototype defects are rules.** One function, `cardTransform`, anchors a card at its centre for the tests and the renderer alike, and the stylesheet's `transform-origin` is checked against it. An obstacle is an angular sector with a depth range, and `obstaclesFor` turns a pane on the screen into one sector per band depth.

**A turn deals nothing.** `FieldModel.turn` changes the yaw and nothing else; assignment runs on a view change, a pane move and a turn's end when a pane is on screen.

**Evidence.** [[TST-0041-The-Slot-Geometry-Places-Every-Note-And-Keeps-Obstacles-Clear]], 9 of 9; five mutations, five killed. 2660 notes all have distinct positions. The one reading of the acceptance that needed a decision: "every note has a position" is read as every note the band function dealt; a note past a band's capacity is counted as overflow and listed in the navigator, which is TASK-0029's rule.
