---
type: '[[test]]'
id: TST-0100
title: Accept a feature from its five lamps
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

# Accept a feature from its five lamps

## Purpose

Edwin checks the flow’s picture, controls and recorded verdict against the cockpit.

## Setup

Edwin opens the built Deck desktop with Deck and your-trainer registered. Use a disposable copy for verdict-changing steps and a sidecar whose own cockpit can show the same notes. Keep the original sibling repositories read-only during the Codex implementation run.

## Steps

1. Open `?flow=accept&note=FEAT-0024` in Deck. Inspect the five lamps and point at each unlit lamp.
2. Compare the named requirements, tasks, automated results, acceptance results and independent reviews with the cockpit and source notes.
3. Use the keyboard list to inspect the same gate. Copy and reopen its address.
4. In a disposable workspace with complete evidence, use Accept and compare the sidecar response and cockpit record.
5. On a feature that opted into acceptance, verify that Accept records an acceptance run and stamps `acceptance: accepted`. Its lifecycle status stays at review because the sidecar does not move it to done.
6. With the current cockpit, inspect the unavailable Accept and Send back controls and their explanation. On a sidecar that advertises feature transitions, choose Send back, cancel its reason, then repeat with a reason and inspect the cockpit record.
7. Configure Deck with an `agent:` identity in the disposable workspace and try an otherwise available acceptance action. Record Deck’s refusal and verify that no request reaches the sidecar.
8. Open S7 on the served host and try its unavailable actions.

## Expect

- Every nonempty lamp depicts its count and lights only for complete evidence. Known empty lamps are hollow and say “nothing to check”; empty requirements and tasks explain that no items are recorded. Unknown or unreadable evidence stays unlit and is explained.
- Accept needs at least one known item and every nonempty lamp complete. Empty lamps supply no evidence. Each unknown or incomplete lamp names its missing evidence on hover or focus.
- A supported person transition is reflected in the cockpit. Unsupported transitions stay unavailable with a hover saying the cockpit does not yet move a feature out of review. The opted-in stamp says on screen that it records acceptance without changing status.
- Cancelling a reason sends no write. The served host records nothing.
- Deck refuses an agent’s verdict before sending a request. A refused person request displays the sidecar’s own words. Direct sidecar agent guards remain cockpit work.
- The gate reads as a picture at rest; the list and address preserve the same subject and actions.

## Not this check

Design decisions are TST-0088 and release check results are TST-0089. This check cannot pass by relabelling an agent as a person or by changing note files outside the sidecar.

## Evidence

Not run by Edwin. No acceptance verdict was recorded during implementation.
