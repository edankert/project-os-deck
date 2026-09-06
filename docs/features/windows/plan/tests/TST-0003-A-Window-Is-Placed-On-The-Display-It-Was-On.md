---
type: "[[test]]"
id: TST-0003
aliases: ["TST-0003"]
title: "A window is placed on the display it was on, and on the primary display when that monitor is gone"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/window-placement.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh window-placement"
covers: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
issues: []
tasks: []
artifacts: []
adequacy: "Removing the display-presence check fails the unplugged-monitor case; removing the clamp fails the oversized-bounds case."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
---

# A window is placed on the display it was on

## Purpose

The placement decision is a pure function of the saved bounds and the displays present. This suite runs that function over display sets a laptop cannot always produce, including a monitor that has been unplugged.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0003` reproduces it locally without writing anything.

## Procedure

- Place a window whose saved display is present and assert the bounds are kept.
- Remove that display from the set and assert the window is centred on the primary display.
- Offer bounds that lie entirely off every display and assert they are corrected onto one.
- Offer bounds larger than the target display and assert they are clamped.
- Assert two different panels keep separate saved rectangles.

## Expected results

- Bounds are kept when the display they were on is still connected.
- A window is never placed where no display can show it.
- One panel's geometry never overwrites another's.

## Evidence (fill after running)

- `bash tools/scripts/run-desktop-tests.sh window-placement`, run from the repository root.

## Adequacy (who verifies this test?)

Removing the display-presence check fails the unplugged-monitor case; removing the clamp fails the oversized-bounds case.
