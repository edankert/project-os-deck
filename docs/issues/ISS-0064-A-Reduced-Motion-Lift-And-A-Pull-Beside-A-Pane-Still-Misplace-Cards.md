---
type: "[[issue]]"
id: ISS-0064
aliases: ["ISS-0064"]
title: "A reduced-motion lift leaves cards under a pane, a pull beside a pane still vanishes while the label counts it, and two smaller things in the throw"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["The second independent review of FEAT-0009, FEAT-0010 and FEAT-0014, 2026-09-10"]
severity: medium
component: renderer
parent: ""
related: ["[[ISS-0058-A-Card-Can-Be-Drawn-Under-A-Pane]]", "[[ISS-0059-The-Front-Band-Hides-What-A-Hand-Or-A-Lift-Asked-For]]", "[[ISS-0061-Reduced-Motion-Is-Missing-From-A-Lift-And-A-View-Switch]]", "[[TASK-0055-Throw-To-A-Screen]]"]
tests: ["[[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]]", "[[TST-0044-The-Neighbourhood-Is-Read-Once-And-A-Throw-Is-Recognised]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# A reduced-motion lift and a pull beside a pane still misplace cards

## Problem

- **A lift under reduced motion leaves cards under a pane when the field faced away from the front.** The branch ISS-0061 added to `redeal()` in `desktop/src/renderer/glass.ts` faces the front and highlights the neighbours but never ends the turn, so the pane's sectors stay computed for the old angle. Over the built slot model with a default pane on a 1,000-pixel field, a lift at yaw 0.6 left 12 cards under the pane, at 1.0 left 16, and none once the turn was ended.
- **A pull into a full front band still vanishes while a pane is held on a narrow field.** The pane takes the spare slots the pull needs. The label then reads "1 placed by hand", counted before the slots were dealt, while the front plane says the band is full. Free front slots with one pane: 8 at 800 pixels, 12 at 1,000.
- **An unnamed display is numbered by its place in Electron's list**, not by the number macOS gives it: the display macOS calls " (1)" read as "display 4".
- **The reduced-motion landing names the target but does not highlight it**, which TASK-0055 says it does.

## Fix

End the turn after a reduced-motion lift. When panes leave fewer front slots than the band holds, keep the note a hand just pulled in view and count an owed note instead; the owed count and the navigator still show every owed note. Count "placed by hand" from the slots dealt. Take a display's number from its name when it has one. Under reduced motion, keep the strip for a moment with the target highlighted.

## Acceptance

- [x] A reduced-motion lift from any yaw leaves no card under a pane.
- [x] A pull with a pane held on an 800-pixel field stands in front, and the label and the message agree.
- [x] " (1)" reads "display 1".
- [x] Under reduced motion the landing highlights the target's name.

## Fixed, 2026-09-10

- **A reduced-motion lift ends its turn.** In `redeal()` the cut to the front now calls `turnEnd()` before it highlights, so the pane's sectors are dealt for the angle the field now faces. The smoke run lifts a second card from a turned field with a pane held and finds no card under the pane, looking in the page on the first turn of the event loop after the cut. **That check cannot fail when this fix is reverted, and the note should not claim it does.** A lift sends three store updates, each of which starts its own wait for the lifted note's neighbourhood. The first wait to finish makes the cut; the next deals the field again at the new angle a microtask later, before any check can look. So in the running app the stale deal the review reproduced over the slot model is never painted. The fix stays: it makes the cut correct on its own rather than by the accident of a second deal. `redeal()` lives in the renderer, which `node --test` cannot load, so no unit test reaches it either.
- **A pull beside a pane keeps its slot.** `frontForSlots()` in `desktop/src/shared/field.ts` orders the front band for the slots: notes joined to the desk first, then notes a hand pulled, then owed notes. So when a pane leaves fewer free slots than the band holds, an owed note is the one counted off the field, and the owed count and the navigator still list it. "Placed by hand" is counted from the slots dealt, so the label and the front plane agree. [[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]] has the test: a pull beside a pane on an 800-pixel field stands in front.
- **" (1)" reads "display 1"**: `displayName()` takes the number from the name when macOS gives only a number ([[TST-0044-The-Neighbourhood-Is-Read-Once-And-A-Throw-Is-Recognised]]).
- **Under reduced motion the landing highlights the target's name** in the strip for 1.2 seconds. A strip shown by a later drag clears that timer, so it cannot hide a strip a person has just opened. The smoke run reads the highlighted name ("desk on LG HDR WQHD").
