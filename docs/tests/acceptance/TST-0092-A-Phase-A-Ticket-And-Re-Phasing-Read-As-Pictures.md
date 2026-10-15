---
type: "[[test]]"
id: TST-0092
aliases: ["TST-0092"]
title: "A phase shows what it owes as a web, an exit ring and a depth field, a ticket shows where it is in its life and what it is joined to, and re-phasing shows where unplaced tickets would go, each without reading a list"
status: active
owner: user:edwin
created: 2026-10-14
updated: 2026-10-15
source: ["[[TASK-0127-A-Phase-Opens-As-Its-Web-Its-Exit-Ring-And-Its-Depth-Field]]"]
phase: "[[PHASE-0005-Overview]]"
scope: system
level: acceptance
entrypoint: "The overview in Deck desktop"
command: ""
last_verified: ""
covers: ["[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
issues: []
tasks: ["[[TASK-0127-A-Phase-Opens-As-Its-Web-Its-Exit-Ring-And-Its-Depth-Field]]", "[[TASK-0128-A-Ticket-Opens-As-Its-Lifecycle-And-Its-Neighbours]]", "[[TASK-0129-Unplaced-Tickets-Drift-Toward-Their-Suggested-Phase]]", "[[TASK-0147]]", "[[TASK-0148]]"]
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

1. Open your-trainer's PHASE-021 from the wheel. Say which kind of work dominates it, how many exit criteria are met, and which tickets need you, before pointing at anything. Then point at the web's corners and the exit segments, and read the rows on the right: needs you in front, open and in progress behind, closed folded at the back. Open the closed strip. Move the pointer across the plane.
2. Open the failed test from the front rows. Read its id, title and full text, where it is in its life, and the tickets it links to and is linked from. Click a linked ticket, then press Escape twice.
3. Open a feature in Deck's PHASE-0002 and compare its track, its rows and its five gate chips with the same feature in the cockpit.
4. Open re-phasing from the wheel's core. Find the phase most unplaced tickets would join. Accept one group.
5. Leave the overview and come back to re-phasing. Check whether the accepted group is still moved. Check `git status` in the workspace.

## Expect

- Each screen's question is answered from the picture; the callouts confirm it.
- A row looks like a row in the cockpit's navigator: the same mark, id, title and status word. Its colour says its type and its fill its state, the same on every screen and in the cockpit.
- On S2 every row is readable, near or far, and no row falls outside the tilted plane, on Deck and on your-trainer's largest phase. The plane tilts a little with the pointer, and not under reduced motion.
- On S3 the ticket's text is all there and scrolls. The linked tickets are split into "links to" and "linked from" and grouped by type. Each gate chip says what it counts ("Requirements 0 / 8") and shows a mark per item.
- **Edwin's judgement, recorded with the verdict:** are the strange round marks he called "solar systems" gone?
- A ticket's neighbours re-centre the screen on click, and Escape goes back one screen.
- Accepting a re-phase group moves its particles into the sector and changes no file: `git status` is unchanged. The move lasts for the session only.
