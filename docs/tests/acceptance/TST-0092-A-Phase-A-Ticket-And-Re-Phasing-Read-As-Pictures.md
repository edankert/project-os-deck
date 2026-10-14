---
type: "[[test]]"
id: TST-0092
aliases: ["TST-0092"]
title: "A phase shows what it owes as a web, an exit ring and a depth field, a ticket shows where it is in its life and what it is joined to, and re-phasing shows where unplaced tickets would go, each without reading a list"
status: active
owner: user:edwin
created: 2026-10-14
updated: 2026-10-14
source: ["[[TASK-0127-A-Phase-Opens-As-Its-Web-Its-Exit-Ring-And-Its-Depth-Field]]"]
phase: "[[PHASE-0005-Overview]]"
scope: system
level: acceptance
entrypoint: "The overview in Deck desktop"
command: ""
last_verified: ""
covers: ["[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
issues: []
tasks: ["[[TASK-0127-A-Phase-Opens-As-Its-Web-Its-Exit-Ring-And-Its-Depth-Field]]", "[[TASK-0128-A-Ticket-Opens-As-Its-Lifecycle-And-Its-Neighbours]]", "[[TASK-0129-Unplaced-Tickets-Drift-Toward-Their-Suggested-Phase]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0005-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]]"]
area: "overview"
---
# A phase, a ticket and re-phasing read as pictures

## Purpose

Edwin checks the three screens behind the wheel: a phase (S2), a ticket (S3) and re-phasing (S4). Each must answer its question at a glance, as PHASE-0005's table of screens states it.

## Setup

As for [[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]], on Deck and on your-trainer.

## Steps

1. Open your-trainer's PHASE-021 from the wheel. Say which kind of work dominates it, how many exit criteria are met, and which tickets need you, before pointing at anything. Then point at the web's corners, the exit segments and the front glyphs.
2. Open the failed test in the front band. Read where it is in its life and which notes it is joined to. Click a neighbour, then press Escape twice.
3. Open a feature in Deck's PHASE-0002 and compare its track with its status in the cockpit.
4. Open re-phasing from the wheel's core. Find the phase most unplaced tickets would join. Accept one group.
5. Leave the overview and come back to re-phasing. Check whether the accepted group is still moved. Check `git status` in the workspace.

## Expect

- Each screen's question is answered from the picture; the callouts confirm it.
- A glyph's shape says its kind and its colour its state, the same everywhere.
- A ticket's neighbours re-centre the screen on click, and Escape goes back one screen.
- Accepting a re-phase group moves its particles into the sector and changes no file: `git status` is unchanged. The move lasts for the session only.
