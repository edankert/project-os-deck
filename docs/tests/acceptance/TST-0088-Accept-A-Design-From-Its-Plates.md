---
type: '[[test]]'
id: TST-0088
title: Accept a design from its plates
status: active
owner: user:edwin
created: '2026-10-14'
updated: '2026-10-15'
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
- '[[TASK-0149]]'
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

# Accept a design from its plates

## Purpose

Edwin checks the flow’s picture, controls and recorded verdict against the cockpit.

## Setup

Edwin opens the built Deck desktop with Deck and your-trainer registered. Use a disposable copy for verdict-changing steps and a sidecar whose own cockpit can show the same notes. Keep the original sibling repositories read-only during the Codex implementation run.

## Steps

1. Open `?flow=design&note=DES-0004` in Deck and inspect the plates, revision strip, review pins and cockpit status square.
2. Open a proposed design in the disposable workspace. Use the keyboard list to reach the same controls.
3. Choose Decline, cancel the reason, then repeat with a reason and compare the cockpit’s recorded decision.
4. Use another proposed design, choose Accept and compare its status in the cockpit.
5. Open a design without pictures and a design that is no longer proposed. Open the same address on the served host.
6. Configure Deck with an `agent:` identity in the disposable workspace and try the same decision verb. Record Deck’s refusal and verify that no request reaches the sidecar.

## Expect

- The design’s square matches the cockpit’s design type colour, fill and needs-you dot. Point at it and compare its words with the cockpit.
- Plates dominate the screen; the empty design reads “nothing to look at”.
- Cancelling the reason changes no note. A supported decline records the reason; any endpoint refusal appears in the sidecar’s own words.
- A valid person decision appears in the cockpit; a non-proposed design and the served host cannot write.
- Deck refuses the agent’s attempt before sending a request. A refused person request displays the sidecar’s own words. This does not prove a server guard against direct agent calls.
- Copying and reopening the address restores S5. The picture and list offer the same tickets and actions.

## Not this check

Release results are TST-0089; feature gates are TST-0100. This check does not author a verdict during the implementation run.

## Evidence

Not run by Edwin. No acceptance verdict was recorded during implementation.
