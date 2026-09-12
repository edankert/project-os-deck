---
type: "[[plan]]"
title: "Plan — every note has a place, and anything visible can be reached"
status: draft
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]"]
implements: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0014-The-Hands]]"]
---

# Plan — every note has a place, and anything visible can be reached

## Delivery sequence

The pure layer lands first and is tested in node, as everything in this repository does: the deal decides which band a note is in, the geometry decides where a band stands, and the thresholds decide how much of a note is drawn. The renderer then only draws what those three say. The smoke run drives it with a real pointer, the measurement is taken, and the free list is built only if the measurement asks for it.

1. **[[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]** — `desktop/src/shared/description.ts` and `desktop/src/shared/field.ts`: a fourth `Band` value, a capacity per band on `BandTable`, and a `dealField` that places the middle's remainder in the far band instead of dropping it and caps the quiet band the way the others are capped. Extends `desktop/tests/field.test.mjs` and lands with [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]].
2. **[[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]** — `desktop/src/shared/slots.ts`: one pure function from a band's population to its depth, rows, columns and box size, with today's constants as its value at the large end, and slot generators that take a shape. Extends `desktop/tests/slots.test.mjs` and lands with [[TST-0054-Each-Bands-Shape-Follows-How-Much-It-Holds]].
3. **[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]** — new `desktop/src/shared/detail.ts`: apparent width to a detail level, with the promotion threshold in the same table. New `desktop/tests/detail.test.mjs` and [[TST-0055-Detail-Follows-Apparent-Size]]. Independent of tasks 1 and 2, so it can run beside them.
4. **[[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]]** — `desktop/src/renderer/glass.ts` and `deck.css`: the far band's cards, `data-detail` beside `data-band`, the bar's sentence carrying four remainders, the compass's quiet-band count beside its remainder, and the shape recomputed on a view or workspace change only.
5. **[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]** — `glass.ts`: `tileAt` beside `dotAt`, wired into the field's `pointerup` and `pointermove` with a cursor and a callout, and a roving tab stop along the quiet band. The pull that brings a note forward is [[FEAT-0014-The-Hands]]'s and is not rebuilt.
6. **[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]** — `glass.ts`: past the promotion threshold a quiet tile is drawn as an element rather than painted, so it is clickable and tabbable with no code of its own.
7. **[[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]** — `desktop/src/main/smoke-glass.ts`: real pointer and keyboard checks for every acceptance line, each shown to fail with its fix removed, recorded in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].
8. **[[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]** — `desktop/src/main/measure.ts`: frame time, script work per frame, element count and visible tiles on Your Trainer, the cockpit and this repository, throttled and not, written into [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]] beside the 2026-09-10 numbers. This decides [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]].
9. **[[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]]** — **only if task 8 says so.** A free list behind Glass's `cardEls` map, never `CardPool`, with a check that a turn across a large quiet band allocates no element after the first pass and that a note keeps its element across a view switch.

## Dependencies

- **Hard:** task 4 needs tasks 1, 2 and 3. Task 5 needs task 4 for the shapes it hit-tests against. Task 6 needs tasks 3 and 5: a promoted tile is an element, so it inherits the click and the tab stop rather than repeating them. Task 7 needs tasks 4 to 6. Task 8 needs everything before it, or it measures a field nobody is going to ship. Task 9 needs task 8's numbers and is not started without them.
- **Soft:** task 3 has no dependency on tasks 1 and 2 and can be built beside them.
- **Constraint that outranks the ordering:** PHASE-0002 exit criterion 2 is ticked on the evidence that a card keeps its element across a view switch. No task may break that, and task 9 is where it is easiest to break.
- **None outside this repository.** The sidecar is not asked for anything, and the payload Deck reads is unchanged.

## Open questions

- **The fourth band's name.** `'far'` is the plan's choice and Edwin's to overturn; the feature note lists what else was considered. It is one word in `BandName` and one word in the bar's sentence, so a rename is cheap up to task 4 and less cheap after it.
- **What the far band's capacity should be.** It falls out of the derived shape rather than being written down, but the shape function needs a stated intent at both ends: how many cards a far band may hold before it starts counting, and how small its cards may get. Task 2 chooses and writes the numbers in its Outcome.
- **Whether a quiet band's remainder should be reachable at all, or only counted.** The navigator and search already reach it, which is what the front and mid remainders do today. Task 4 keeps that and says so; if Edwin wants the shelf to scroll, that is a separate issue.
- **The promotion threshold.** How large a tile must be drawn before it becomes a card is chosen in task 3, measured in task 8, and may move once. It is one number in a table, not a constant in the renderer.
