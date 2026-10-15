---
type: "[[test]]"
id: TST-0090
aliases: ["TST-0090"]
title: "The wheel, a phase, a ticket and re-phasing are drawn from the overview model, each ticket once, with at most 60 words at rest, every number beside its mark and a list twin holding the same tickets"
status: active
owner: system:claude
created: 2026-10-14
updated: 2026-10-15
source: ["[[TASK-0125-The-Overview-Contracts-And-The-Wheel-As-A-Scene]]"]
phase: "[[PHASE-0005-Overview]]"
scope: feature
level: unit
entrypoint: "desktop/tests/overview-screens.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh overview-screens"
covers: ["[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
issues: []
tasks: ["[[TASK-0125-The-Overview-Contracts-And-The-Wheel-As-A-Scene]]", "[[TASK-0127-A-Phase-Opens-As-Its-Web-Its-Exit-Ring-And-Its-Depth-Field]]", "[[TASK-0128-A-Ticket-Opens-As-Its-Lifecycle-And-Its-Neighbours]]", "[[TASK-0129-Unplaced-Tickets-Drift-Toward-Their-Suggested-Phase]]", "[[TASK-0145]]", "[[TASK-0146]]", "[[TASK-0147]]", "[[TASK-0148]]", "[[TASK-0154]]", "[[TASK-0155]]", "[[TASK-0156]]", "[[TASK-0158]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0005-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
---

# The overview screens are drawn from the model and hold the look

## Purpose

Every overview screen is a pure function from the model to a scene, so the look's rules in [[PHASE-0005-Overview]] can be checked without a window. This suite draws S1 to S4 on Deck's and your-trainer's fixtures and checks each scene.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh overview-screens`.

## Expected results

Added 2026-10-15 for TASK-0145 to TASK-0148; each holds once its task lands:

- Every drawn ticket mark has its type's cockpit colour and its ticket's `fill` and needs-you dot, on every screen of both fixtures, and no text says "owed again".
- The wheel draws in both colourings, and its address says which.
- A run of opens, backs and forwards over the overview history ends on the expected address with the expected buttons enabled; opening a screen after going back drops the forward entries.
- S2 has one row per ticket of the phase, in the section its needs-you flag and fill put it in.
- S3's rows are exactly the model's links, split into links to and linked from, and its text is the note's.

From 2026-10-14:

- The wheel draws every ticket in the model exactly once, and every phase once, on both workspaces.
- Every phase of both workspaces opens: each of its tickets drawn once, its front band exactly its failed and owed-again tickets, one segment per exit criterion.
- A ticket of every kind and state opens, with every neighbour drawn once and its status on the track or branching off it.
- Re-phasing draws every unplaced ticket once, one control per suggested phase with a row in the list twin, and accepting a group removes its control and draws the same tickets.
- On every screen: at most 60 words at rest, ticket ids not counted; every number names a mark with the same count; the marks and the list twin hold the same ticket ids.
