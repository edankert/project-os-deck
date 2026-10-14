---
type: '[[test]]'
id: TST-0085
title: Flow scenes and payloads keep the recorded evidence
status: active
owner: system:codex
created: '2026-10-14'
updated: '2026-10-14'
source:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
phase: '[[PHASE-0005-Overview]]'
scope: feature
level: unit
entrypoint: desktop/tests/overview-flows.test.mjs
command: bash tools/scripts/run-desktop-tests.sh overview-flows
covers:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
issues: []
tasks:
- '[[TASK-0120-Draw-The-Acceptance-Flows-From-Recorded-Evidence]]'
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

# Flow scenes and payloads keep the recorded evidence

## Purpose

The flow pictures preserve the evidence and obey PHASE-0005’s screen rules.

## Procedure

- Load recorded payloads for both workspaces, including incomplete and unfamiliar shapes.
- Map into flow data and draw S5 to S7 at rest, with an open check, with no pictures and without write capability.
- Check each scene for words, counts, addresses and list twins; exercise gate completeness and unknown evidence.

## Expected results

- Every recorded result keeps its platform and meaning; unreadable evidence is unknown rather than passed.
- The three screens pass all four checkScene rules on both workspaces.
- Accept is unavailable for an incomplete gate or non-proposed design; all disabled actions refuse.

## Evidence

Not run yet. The executable check holds no verdict in its note status.

## Adequacy

The suite must exercise behavior and independent refusal cases, rather than search implementation source for symbol names.
