---
type: '[[test]]'
id: TST-0089
title: Run a release test from its captures
status: active
owner: user:edwin
created: '2026-10-14'
updated: '2026-10-14'
source:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
phase: '[[PHASE-0005-Overview]]'
scope: feature
level: acceptance
entrypoint: Deck desktop overview flow
command: ''
covers:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
issues: []
tasks:
- '[[TASK-0120-Draw-The-Acceptance-Flows-From-Recorded-Evidence]]'
- '[[TASK-0122-Send-A-Persons-Flow-Actions-Through-The-Shell]]'
artifacts: []
adequacy: ''
mutation_score: ''
reviewed_by: ''
review_date: ''
review_verdict: ''
review_round: ''
related:
- '[[DES-0005-The-Overview-Is-Drawn-Not-Written]]'
last_verified: ''
area: overview
after: []
---

# Run a release test from its captures

## Purpose

Edwin checks the flow’s picture, controls and recorded verdict against the cockpit.

## Setup

Edwin opens the built Deck desktop with Deck and your-trainer registered. Use a disposable copy for verdict-changing steps and a sidecar whose own cockpit can show the same notes. Keep the original sibling repositories read-only during the Codex implementation run.

## Steps

1. Open Deck’s test-run flow with no release and inspect the empty platform rings.
2. Open your-trainer REL-0017’s test-run flow at `step=android`, then `step=ios` and a section such as `step=android.3`.
3. Open a workout-selection check that has before and after captures. Compare the action and expected line with the release test.
4. In the disposable workspace, mark one printed check Pass and another Fail with a reason. Complete every printed step that cites each corresponding test note, then compare the aggregated note results in the cockpit.
5. Open More, select another supported result and cancel its reason, then repeat with a reason.
6. Copy and reopen the platform and section addresses; reach a bead and result controls using the keyboard list.
7. Configure Deck with an `agent:` identity in the disposable workspace and try the same mark-check verb. Record Deck’s refusal and verify that no request reaches the sidecar.
8. Open the same flow through Deck’s served host and try its unavailable result controls.

## Expect

- Deck says there is no release and draws empty rings. It does not invent checks.
- Android and iOS retain their own checks and results; the section address restores its section.
- The open check shows both captures when present, its action and expected result. Missing captures are stated plainly.
- Printed-step progress stays local until every step citing a test note has a result. The note then receives its most serious result in the cockpit. Cancelling a reason sends no write; sidecar refusals keep their wording.
- Deck refuses the agent’s verdict before sending a request. A refused person request displays the sidecar’s own words. This does not prove a server guard against direct agent calls.
- The served host records nothing and forwards no write.

## Not this check

Design decisions are TST-0088; feature acceptance is TST-0100. Release preparation and sealing stay in the cockpit.

## Evidence

Not run by Edwin. No acceptance verdict was recorded during implementation.
