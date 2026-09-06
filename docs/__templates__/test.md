---
type: "[[test]]"
id: TST-0000
title: ""
status: ready
owner: unassigned
created: 2026-01-27
updated: 2026-01-27
source: []
scope: feature
level: system       # values: tools/instructions/TAXONOMY.md, `level` (tests)
entrypoint: ""
command: ""         # a runnable check; when set, the note records no verdict (tools/instructions/STATUSES.md, [[test]]; ADR-0025)
last_verified: ""    # manual tests only (no `command:`) — date the procedure was last performed; goes stale
covers: []           # THE verification link (ADR-0032): [[FEAT-...]] / [[ISS-...]] / [[REQ-...]]. One direction, one encoding.
issues: []           # context only — what this test VERIFIES goes in covers:
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: []
# level: acceptance only; delete on an executable test. Fields explained in SCHEMAS.md, test.md ("Acceptance fields").
area: ""             # the human grouping, one walk's worth of related checks; the verdict lives in the release ledger, not here (ADR-0037)
---

# <Test>

## Purpose
<What does this test verify?>

> **Status is evidence, not intent.** Who writes a test's status, and what a `command:` changes, is stated once in `tools/instructions/STATUSES.md` `[[test]]`; `python3 tools/scripts/run-tests.py --filter TST-####` reproduces an executable test's run locally without writing anything.

## Procedure
- <step-by-step>

## Expected results
- <observable outcomes>

## Evidence (fill after running)
- <paths/log excerpts/screenshots/etc>

## Adequacy (who verifies this test?)
- <For automated tests guarding a fix: evidence the test fails when the fix is reverted/broken (mutation result, revert-run, or reasoning). A test that cannot fail does not guard.>
