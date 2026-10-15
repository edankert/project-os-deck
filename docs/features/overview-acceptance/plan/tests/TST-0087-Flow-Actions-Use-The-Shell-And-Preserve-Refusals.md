---
type: '[[test]]'
id: TST-0087
title: Flow actions use the shell and preserve refusals
status: active
owner: system:codex
created: '2026-10-14'
updated: '2026-10-15'
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
- '[[TASK-0151]]'
- '[[TASK-0122-Send-A-Persons-Flow-Actions-Through-The-Shell]]'
- '[[TASK-0123-Verify-The-Flows-And-Hand-Them-To-Edwin]]'
- '[[TASK-0143]]'
artifacts: []
adequacy: "Tests execute the built renderer definitions, Host bridge and preload with a stub Electron import. Fake sidecars inspect request bodies and refusal text. They distinguish local steps from ledger results, each result word, stale reads, cancellation and served controls."
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

- S3 can call the same `featureGate` loader as S7, with an optional explicit feature id. Reads leave its address unchanged and never write. Required-read failures return unknown, unwritable model evidence and preserve the failure reason.
- Requests preserve the configured actor, ids, platform, release, result and required reason.
- The sidecar’s refusal reaches the caller in its own words.
- Cancelled or disabled controls and served-host actions send no write.
- These tests prove Deck’s request/refusal behavior; they do not certify the real sidecar’s agent guards.

## Evidence

2026-10-15: the full desktop suite passes 769 tests with no failures or skips; this suite contributes 21. The new loader tests verify S3/S7 evidence parity, optional feature id, unchanged address, no writes and safe fallback on required-read failure. Existing action tests continue to cover advertised transitions, refusals, identity guards, local step storage and acceptance stamps.

## Adequacy

2026-10-15: replacing the shared loader's sidecar read with `gateFromModel` fails the S3/S7 evidence test. The built module was restored and all 60 focused tests passed. Existing regression tests preserve action-time transition guards and persisted stale-result deletion.
