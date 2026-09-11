---
type: "[[test]]"
id: TST-0050
aliases: ["TST-0050"]
title: "Zoom keeps the point under the pointer still, stays between 0.6 and 2.5 times, never loses the field off the screen, and at 1 times changes nothing"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/zoom.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh zoom"
covers: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]"]
issues: []
tasks: ["[[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]"]
---

# Zoom keeps the point under the pointer still

## Purpose

The zoom's arithmetic is a pure module, so its one important promise is checked in node to a fraction of a pixel: what is under the pointer stays under it. The suite also holds the limits, the rule that keeps the field on screen, the inverse the hit tests use, and the guarantee that 1× draws today's field exactly.

**This note must be committed together with its suite.** `command:` names `zoom`, and [[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]] writes `desktop/tests/zoom.test.mjs`. Until that file exists, `python3 tools/scripts/run-tests.py` reports this test failing with exit 2 ("no suite called 'zoom'"), which is the failure [[ISS-0028-A-Test-Note-Names-A-Suite-That-Does-Not-Exist]] recorded. Written at planning time on 2026-09-11 and not committed then.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh zoom`.

## Expected results

- Zooming in and out about points across the field leaves the field point under each within 0.5 px, where the on-screen clamp does not apply.
- The scale never leaves [0.6, 2.5], and a factor past a limit stops at it.
- A factor followed by its inverse at the same pivot returns the starting zoom within 1e-9.
- At a scale of 1 or more the zoomed field covers the field area; below 1 it lies inside it.
- The inverse of an applied zoom returns the original point within 1e-9.
- The identity zoom returns every projection unchanged.
- A card zoomed past the field's edge is not visible.
- The wheel's factor zooms in for a negative delta, is symmetric in sign, and treats a delta in lines and the same distance in pixels alike; a Ctrl wheel uses the pinch's step.

## Evidence

2026-09-11: `bash tools/scripts/run-desktop-tests.sh zoom`, 7 of 7; `npm test`, 428 of 428.

## Adequacy (who verifies this test?)

Measured 2026-09-11, one break per run; each failed a check: zoom about the middle of the field instead of the pivot; no clamp on the scale; no clamp on the offset; `visible` not recomputed after zooming.

The first version missed the first break, a zoom about the middle: its pivot test took any result that differed from the pivot rule for a clamp and skipped it. It now works out what the clamp would do and holds the pivot whenever the clamp would not move it; with that, all four breaks fail it.
