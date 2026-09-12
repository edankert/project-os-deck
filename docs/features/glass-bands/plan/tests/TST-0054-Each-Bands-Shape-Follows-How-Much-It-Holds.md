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
adequacy: ""
mutation_score: ""
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

## Evidence (fill after running)

- <the table, as the suite asserts it>

## Adequacy (who verifies this test?)

Four breaks, one per run, recorded by [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]: adapt by depth instead of size; drop the small clamp; drop the large clamp; return a shape whose slots leave the visible span. Each must fail at least one check, and which one is written here.
