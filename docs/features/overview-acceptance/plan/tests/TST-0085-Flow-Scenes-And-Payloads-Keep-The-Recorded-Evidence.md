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
- '[[TASK-0143]]'
artifacts: []
adequacy: "The checks distinguish unknown evidence, every result word, incomplete printed steps, cross-platform keys and malformed reads. Recorded payloads reproduce the six scene fixtures."
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

2026-10-14: the full `cd desktop && npm test` run passed 745 tests with no failures or skips. This suite contributed 16 passing tests. Unknown and malformed evidence explains its gaps; empty lamps stay hollow and do not supply readiness. Scalar and list reviewer provenance agree. Only the selected design plate contains an image. The executable check holds no verdict in its note status. Claude reviews the repairs in round two.

## Adequacy

2026-10-14: a fresh-context implementation check ran the combined 35 scene/action tests. Removing the positive-total lamp guard made the empty-lamp test fail. Mutations used an isolated worktree-local copy and were discarded. Claude’s formal round-two verdict is still pending.
