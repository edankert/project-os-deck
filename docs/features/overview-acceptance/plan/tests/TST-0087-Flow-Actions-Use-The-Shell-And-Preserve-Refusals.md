---
type: '[[test]]'
id: TST-0087
title: Flow actions use the shell and preserve refusals
status: active
owner: system:codex
created: '2026-10-14'
updated: '2026-10-14'
source:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
phase: '[[PHASE-0005-Overview]]'
scope: feature
level: integration
entrypoint: desktop/tests/overview-flow-writes.test.mjs
command: bash tools/scripts/run-desktop-tests.sh overview-flow-writes
covers:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
issues: []
tasks:
- '[[TASK-0122-Send-A-Persons-Flow-Actions-Through-The-Shell]]'
- '[[TASK-0123-Verify-The-Flows-And-Hand-Them-To-Edwin]]'
artifacts: []
adequacy: ''
mutation_score: ''
reviewed_by: ''
review_date: ''
review_verdict: ''
review_round: ''
related:
- '[[DES-0005-The-Overview-Is-Drawn-Not-Written]]'
---

# Flow actions use the shell and preserve refusals

## Purpose

A person’s flow controls use the shell write boundary and show the sidecar’s refusal unchanged.

## Procedure

- Drive the registered flow action handlers using fake read, write and ask inputs.
- Run the write client against desktop/tests/helpers.mjs’s fake sidecar and inspect every request body.
- Return sidecar refusals, cancel a reason, select a disabled control and use served-host capability.

## Expected results

- Requests preserve the configured actor, ids, platform, release, result and required reason.
- The sidecar’s refusal reaches the caller in its own words.
- Cancelled or disabled controls and served-host actions send no write.
- These tests prove Deck’s request/refusal behavior; they do not certify the real sidecar’s agent guards.

## Evidence

Not run yet. The executable check holds no verdict in its note status.

## Adequacy

The suite must exercise behavior and independent refusal cases, rather than search implementation source for symbol names.
