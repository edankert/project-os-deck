---
type: "[[test]]"
id: TST-0091
aliases: ["TST-0091"]
title: "Deck opens on the wheel of phases, the state of every phase is read from it without reading a sentence, and every phase is reached from it by pointer and by keyboard"
status: active
owner: user:edwin
created: 2026-10-14
updated: 2026-10-14
source: ["[[TASK-0126-Deck-Opens-On-The-Wheel]]"]
phase: "[[PHASE-0005-Overview]]"
scope: system
level: acceptance
entrypoint: "The overview in Deck desktop"
command: ""
last_verified: ""
covers: ["[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"]
issues: []
tasks: ["[[TASK-0125-The-Overview-Contracts-And-The-Wheel-As-A-Scene]]", "[[TASK-0126-Deck-Opens-On-The-Wheel]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0005-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]"]
area: "overview"
---
# Deck opens on the wheel, and it reads as a picture

## Purpose

Edwin checks that the overview is what he asked for on 2026-10-14: a screen that shows progress and status as a picture, looks like an instrument rather than a document, and opens Deck. This is the judgement no automated check can make.

## Setup

Start Deck with `npm start` in `desktop/` on a build that includes TASK-0126. Have Deck and your-trainer both added as workspaces. Use a mouse, the keyboard, and the operating system's reduced-motion setting.

## Steps

1. Start Deck. Note what it opens on.
2. Without pointing at anything, say for each sector which phase is furthest along, which has failed or owed-again tests, and where the open work is. Then point at a few sectors, wedges and shelf discs and compare what the callout says with what you said.
3. Switch to your-trainer from the rail. Find the finished phase with the most acceptance tests owed again.
4. Click a sector, then press Escape. Click a shelf disc. Click the backlog tray. Click the core.
5. With the keyboard only: Tab to a sector and press Enter; press Escape; press L and use the list to open a ticket.
6. Press Copy address on the wheel and on a phase, then Open address with each.
7. Press the Overview button in the header to leave the overview, and press it again to come back.
8. Turn on reduced motion and move between the wheel and a phase.

## Expect

- Deck opens on the wheel of the workspace it opened.
- The state of every phase can be read without reading a sentence. The only words on screen at rest are names and short captions.
- Every sector, disc and the tray open their phase; the core opens re-phasing; Escape returns to the wheel.
- Every step can be done with the keyboard, and the list holds the same phases and tickets as the picture.
- A copied address reopens the same screen.
- With reduced motion, screens change without animation and nothing glows in a pulse.
- **Edwin's judgement, recorded with the verdict:** does it read as a picture, and does it look like the instrument he asked for?
