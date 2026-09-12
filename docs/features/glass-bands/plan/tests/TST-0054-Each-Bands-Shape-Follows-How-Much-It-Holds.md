---
type: "[[test]]"
id: TST-0054
aliases: ["TST-0054"]
title: "Each band's shape follows how much it holds: a table of populations from forty to twenty-seven hundred, both ends clamped, no band's depth moving, and today's constants returned at the large end"
status: active
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/slots.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh slots"
covers: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
issues: ["[[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]"]
tasks: ["[[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]"]
artifacts: []
adequacy: "Four deliberate breaks, one per run; all four caught, and each substitution was confirmed applied before its run."
mutation_score: "4/4 breaks caught"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0041-The-Slot-Geometry-Places-Every-Note-And-Keeps-Obstacles-Clear]]", "[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
---

# Each band's shape follows how much it holds

## Purpose

The band geometry becomes a pure function, so its whole behaviour is a table a test can hold: what the quiet band looks like at 40 notes, at 300, at 1,000 and at 2,700, and what both clamps do. Two properties matter more than the numbers. **No band's depth varies with its population** — a band adapts by size and detail, because depth is priority and done work must not read as active. **At the large end the function returns today's constants exactly**, so the field a large workspace draws is unchanged to the pixel and every existing check of the geometry stays valid.

**This note must be committed together with its suite.** `command:` names `slots`, and [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]] extends `desktop/tests/slots.test.mjs`. Written at planning time on 2026-09-12 and not committed then.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh slots`.

## Expected results

- The shape function is pure and imports nothing from the DOM.
- At the large end it returns today's `FRONT`, `MID` and `QUIET` exactly.
- A quiet band of 40 notes draws larger tiles than today, at the same depth of 760.
- No band's depth varies with its population, at any point in the table.
- The outer field's depth lies between the middle's and the quiet band's, at every population.
- Both clamps hold: below the small end boxes stop growing, above the large end the band steps back a layer as it does now.
- Every slot produced is inside the band's visible span, at every population in the table.
- Two deals of the same view produce the same shape.

## Evidence

**Run 2026-09-12, `node --test tests/*.test.mjs`: 448 checks, 448 passing.** `desktop/tests/slots.test.mjs` holds 19 of them; both typechecks clean.

The quiet band's five steps, asserted as one table:

| notes it holds | columns | rows | tile |
|---|---|---|---|
| 40 | 8 | 6 | 140 × 39 |
| 154 | 14 | 11 | 140 × 39 |
| 418 | 22 | 19 | 108 × 30 |
| 800 | 32 | 25 | 73 × 20 |
| 2,700 | 40 | 25 | 58 × 16 |

The last row is today's `QUIET` exactly, so a workspace at Your Trainer's size draws what it drew before the function existed — which is what keeps the 2026-09-10 measurement meaningful. This repository's 35 quiet notes land in the first row: eight columns of tiles more than twice as wide as they are today, at the same depth.

The other checks: no band changes depth with what it holds; the outer field stands between the middle and the quiet band at every population; a tile never grows past 70 per cent of a front card's apparent width; every slot stays inside the band's stated 156-degree span at every population; and a deal carries the shapes it used.

## Adequacy (who verifies this test?)

Four breaks, one per run, applied to `desktop/src/shared/slots.ts` and rebuilt. **All four caught.** Each substitution was confirmed to have applied before its run, after a break in [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]] silently failed to apply and read as a check that could not fail.

| The break | What failed |
|---|---|
| 1. The quiet band walks forward when it holds less — depth derived from the column count, which is the thing Edwin's steer on [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]] ruled out. | 2 checks: "a quiet band of forty notes draws bigger tiles, at the same depth", "no band changes its depth with what it holds" |
| 2. The tile-size clamp is dropped, so an eight-column band asks for a box over 300 wide and finished work reads as urgent. | 3 checks, including "a tile never grows past what a front card would read as" |
| 3. The large end is no longer today's shape — the last step changed to 36 columns. | 3 checks, including [[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]]'s own "the quiet band has a stated shape", which is the right check to break |
| 4. The shape spreads its slots past the band's span, by widening the column step 1.4 times. | 1 check: "every slot a shape produces stays inside the quiet band's stated span" |
