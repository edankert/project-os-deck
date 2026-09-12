---
type: "[[task]]"
id: TASK-0073
aliases: ["TASK-0073"]
title: "Each band's shape follows what it holds: one pure function from a band's population to its depth, rows, columns and box size, recomputed on a view or workspace change and never inside a deal"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]"]
parent: "FEAT-0018"
effort: "M"
due: ""
depends: []
blocks: ["TASK-0075"]
related: ["[[TASK-0030-The-Slot-Geometry]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]"]
tests: ["[[TST-0054-Each-Bands-Shape-Follows-How-Much-It-Holds]]"]
---

# Each band's shape follows what it holds

## Objective

**One geometry serves three workspaces that differ eightfold in what they draw, and it was sized for the largest.** `FRONT`, `MID` and `QUIET` in `desktop/src/shared/slots.ts` are frozen constants. The only adaptivity there is runs one way: a corpus larger than a layer steps back a layer, and a smaller one never comes forward. This repository puts 35 tiles on a shelf built for a thousand. This task makes each band's shape a pure function of how many notes that band holds.

## Detail

**The input is the band's own population in this deal, not the project's note count.** The Issues view's quiet band and the Phases view's quiet band differ by two orders of magnitude inside one repository, and `dealField` knows both numbers before anything is placed.

**The function.** One entry point beside the constants — `bandShapeFor(band, count)` is a suggestion, the names are the implementer's — returning the shape that band's slot generator needs: depth, rows, columns (or columns a side), the steps between them, and the box a note is drawn in. Today's `FRONT`, `MID` and `QUIET` are its value at the large end, so a large workspace draws exactly what it draws now.

**It adapts by size and detail, never by depth.** Edwin's steer on [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]: a small quiet band's tiles grow until they are readable and the band stays where it is. Depth carries priority in Glass, so a quiet band that walked forward would make done work read as active. The quiet band's depth, 760, is fixed; its columns, rows and tile size are what move. The same holds for the outer field: its depth sits between the middle's 620 and the quiet band's 760 and does not move with its population.

**It is computed once per view.** The renderer calls it when the view changes or the workspace changes, and never inside a deal that moved one note ([[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], decision 5). Marking one issue fixed must not reshape the field underneath a person. The function is pure, so where it is called is a property of the renderer and is checked in [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]].

**Both ends are clamped.** Below the small end a band stops growing its boxes, or forty finished notes would be drawn as large as the front band and would read as urgent. Above the large end it is today's shape, stepping back a layer at a time as it does now.

**The front and middle bands are in the same pass**, as ISS-0076 asks. They are already close to their natural size — 20 and 64 slots — so the expected change there is small, and a shape function that skipped them would leave the one thing that does not adapt unexplained. If the measurement or the picture says they should stay constant, say so in the Outcome with the reason.

## Acceptance

- `bandShapeFor` is pure and has no import from the DOM.
- Its behaviour is a table in the suite: a quiet band of 40, 300, 1,000 and 2,700 notes, and both clamps.
- At the large end it returns today's `FRONT`, `MID` and `QUIET` exactly, so a large workspace's field is unchanged to the pixel.
- A quiet band of 40 notes draws tiles larger than today's 58 by 16, at the same depth of 760.
- No band's depth varies with its population.
- The outer field's depth is between the middle's and the quiet band's, at every population.
- Every slot the generators produce is inside the band's visible span, at every population in the table.
- Two deals of the same view produce the same shape, and a deal that moves one note between bands produces the same shape as the deal before it.
- `desktop/tests/slots.test.mjs` asserts all of the above, and [[TST-0054-Each-Bands-Shape-Follows-How-Much-It-Holds]] names it.

## Steps

- [ ] Write `bandShapeFor` in `desktop/src/shared/slots.ts` with the four bands and both clamps.
- [ ] Make `frontSlots`, `midSlots`, the new outer-field generator and `quietSlot` take a shape rather than reading the constants.
- [ ] Keep the constants exported as the large-end value, so existing callers and tests have something to name.
- [ ] Extend `desktop/tests/slots.test.mjs` with the population table.
- [ ] Break the function on purpose, one break per run, and record which checks fail in [[TST-0054-Each-Bands-Shape-Follows-How-Much-It-Holds]]: adapt by depth instead of size; drop the small clamp; drop the large clamp; return a shape whose slots leave the visible span.
- [ ] Write the chosen numbers — the outer field's depth, both clamps, and the tile size at each end — in the Outcome.
- [ ] Commit the suite and [[TST-0054-Each-Bands-Shape-Follows-How-Much-It-Holds]] together.

## Notes

The orbit places its own slots through `FieldModel.place`, so it never calls these generators and no shape reaches it.

`project()` is unchanged. A shape decides where a slot is; the projection decides where that slot lands on screen, and every existing check of the projection stays valid.
