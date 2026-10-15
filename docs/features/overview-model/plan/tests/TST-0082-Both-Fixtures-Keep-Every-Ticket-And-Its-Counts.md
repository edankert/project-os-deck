---
type: "[[test]]"
id: TST-0082
title: "Both fixtures keep every ticket and its counts"
status: active
owner: system:codex
created: 2026-10-14
updated: 2026-10-15
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
phase: "[[PHASE-0005-Overview]]"
scope: feature
level: unit
entrypoint: "desktop/tests/overview-fixtures.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh overview-fixtures"
covers: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
issues: []
tasks: ["[[TASK-0144]]", "[[TASK-0117-Build-Both-Overview-Fixtures-From-Real-Notes]]", "[[TASK-0153]]"]
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
- Every ticket has the cockpit’s `type`, `fill` and boolean `needsYou`.
- Every ticket has one place, and every listed ID exists.
- Finished and backlog phases are kept outside the open-phase wheel.

## Evidence

2026-10-15: `cd desktop && npm test` passes 764 tests, with zero failures and zero skips. The overview-fixtures suite passes three tests. Deck has 384 tickets with dirty false; Your Trainer has 2,747 with dirty true. Every ticket carries type, fill and needsYou. Replaying Deck’s archived source at 96955cc with the captured timestamp reproduces its serialized fixture exactly. The executable check holds no verdict in its note status.

## Adequacy

The expected totals come from the recorded source build and comparison. Deleting, duplicating or moving a fixture ticket must break a count or placement assertion.
