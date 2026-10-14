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

- Requests preserve the configured actor, ids, platform, release, result and required reason.
- The sidecar’s refusal reaches the caller in its own words.
- Cancelled or disabled controls and served-host actions send no write.
- These tests prove Deck’s request/refusal behavior; they do not certify the real sidecar’s agent guards.

## Evidence

2026-10-14: the full `cd desktop && npm test` run passed 745 tests with no failures or skips. This suite contributed 19 passing tests. Advertised transitions are checked again before writes; unsupported actions stay unavailable. Acceptance stamps send reconciled counts as skipped and leave status alone. Saved steps survive changed commits and stay separate by workspace, release, platform and content. Dropped stale results are removed from storage and cannot reappear on reload. The executable check holds no verdict in its note status. Claude reviews the repairs in round two.

## Adequacy

2026-10-14: a fresh-context implementation check ran the combined 35 scene/action tests. Removing the action-time transition guard or persisted stale-result deletion made the corresponding test fail. Mutations used an isolated worktree-local copy and were discarded. Claude’s formal round-two verdict is still pending.
