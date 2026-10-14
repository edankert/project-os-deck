---
type: "[[test]]"
id: TST-0082
title: "Both fixtures keep every ticket and its counts"
status: active
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
phase: "[[PHASE-0005-Overview]]"
scope: feature
level: unit
entrypoint: "desktop/tests/overview-fixtures.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh overview-fixtures"
covers: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
issues: []
tasks: ["[[TASK-0117-Build-Both-Overview-Fixtures-From-Real-Notes]]"]
artifacts: []
adequacy: "The expected totals come from the recorded source build and comparison. Deleting, duplicating or moving a fixture ticket must break a count or placement assertion."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[PHASE-0005-Overview]]"]
---

# Both fixtures keep every ticket and its counts

## Purpose

Both recorded workspaces preserve their source totals and account for every ticket exactly once.

The test holds no verdict in its status. Its command builds the modules and runs the node suite.

## Procedure

- Load both committed JSON fixtures.
- Check the recorded source heads and expected ticket and phase totals.
- Sum each phase and core by kind and state and compare with their ticket lists.

## Expected results

- Deck and your-trainer match the totals recorded beside the fixture comparison.
- Every ticket has one place, and every listed ID exists.
- Finished and backlog phases are kept outside the open-phase wheel.

## Evidence

2026-10-14: the `overview-fixtures` suite passed 3 tests, with no failures or skips, in `cd desktop && npm test`. The full run passed all 704 tests. TASK-0140 records the first-review repairs; FEAT-0026 remains at review for Claude.

## Adequacy

The expected totals come from the recorded source build and comparison. Deleting, duplicating or moving a fixture ticket must break a count or placement assertion.
