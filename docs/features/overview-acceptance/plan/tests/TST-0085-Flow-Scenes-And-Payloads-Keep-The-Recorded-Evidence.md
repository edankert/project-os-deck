---
type: '[[test]]'
id: TST-0085
title: Flow scenes and payloads keep the recorded evidence
status: active
owner: system:codex
created: '2026-10-14'
updated: '2026-10-15'
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
- '[[TASK-0149]]'
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
- Check the five chip labels, both sizes, one square per gate item and the model’s exact mark for every known ticket.
- Check all ten result displays, their cockpit glyphs and words, and the separation between a check bead and its ticket square.

## Expected results

- Every recorded result keeps its platform and meaning; unreadable evidence is unknown rather than passed.
- The three screens pass all four checkScene rules on both workspaces. Unknown results say “not reported” in neutral framing; empty chips say “nothing to check”.
- No generated status wording says “owed again”. Historical captions and revision prose copied from a design remain verbatim.
- Accept is unavailable for an incomplete gate or non-proposed design; all disabled actions refuse.

## Evidence

2026-10-15: `cd desktop && npm test` passes 764 tests, with zero failures and zero skips. This suite contributes 20 tests. The two acceptance fixtures reproduce from their raw payloads, including every item’s ticket fields. All recorded flow screens pass; Your Trainer’s S6 with More open uses at most 50 words. S5 uses 9 words and S7 30 on each workspace. The executable check holds no verdict in its note status.

## Adequacy

2026-10-15: removing one item square fails both fixture chip tests. Replacing Blocked’s glyph with Pass fails the result-display test. Sources were restored after the mutations. Existing tests still refuse missing count marks, empty evidence as readiness, unsupported transitions and stale saved results.
