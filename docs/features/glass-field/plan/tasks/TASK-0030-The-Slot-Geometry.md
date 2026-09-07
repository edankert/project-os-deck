---
type: "[[task]]"
id: TASK-0030
aliases: ["TASK-0030"]
title: "The slot geometry: a cylinder of slots dealt from the bands, a shape for a thousand quiet tiles, and an obstacle that is a sector rather than a rectangle"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
parent: "FEAT-0009"
effort: ""
due: ""
depends: ["TASK-0029"]
blocks: ["TASK-0031"]
related: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]"]
tests: []
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

- [ ] Choose the quiet band's shape (rows or a spiral) and write its arithmetic with the tile counts stated.
- [ ] Implement the function over the band function's output, with obstacles as sectors.
- [ ] Share the card box anchor with the renderer as one constant.
- [ ] Add the suite: capacity, uniqueness, obstacle exclusion at several yaws, the quiet band's shape, and the no-assignment-on-turn rule.
- [ ] Write the automated test note and link it from `tests:`.

## Notes

The starting numbers are DES-0002's: twelve front, forty mid. They are inputs to the function, not constants inside it, because [[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]] may move them and the obstacles later include a console ([[PHASE-0004-Parity]]) that takes a sector of its own.
