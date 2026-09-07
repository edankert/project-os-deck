---
type: "[[test]]"
id: TST-0023
aliases: ["TST-0023"]
title: "Glass opens first, and a day's notes are read in it: the owed work in front, the quiet work behind, and the same cards moving when the view changes"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[PHASE-0002-Glass]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
issues: []
tasks: ["[[TASK-0029-The-Band-Function]]", "[[TASK-0030-The-Slot-Geometry]]", "[[TASK-0031-The-Field-Renders-And-Turns]]", "[[TASK-0032-A-View-Switch-Re-Arranges]]", "[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]", "[[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0002-Glass]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]]", "[[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]]"]
area: "glass"
---

# Glass opens first, and a day's notes are read in it

## Purpose

The walk that judges [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] as a thing a person uses. Deck now opens on Glass ([[ADR-0002-Glass-Is-The-Main-View]]), so the question is whether the field says what needs you without the person hunting for it, whether the quiet work is still findable behind them, whether switching view reads as the same notes moving, and whether none of it needs a mouse. The suites check each piece; this walk checks that the pieces make a view.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you will need it for the tablet step.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. Use Your Trainer: its Issues view has hundreds of notes, and a field of thirty cannot overflow anything.
- **The surface toggle** sits beside the view buttons in the switcher and reads Spread or Glass. The **compass** is the small dial at the edge of the field that carries the count of notes behind you.
- **A tablet on the same network**, and Deck started with `npm run start:lan` so its host binds beyond loopback, for the last step. The tablet setup in [[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]] applies.
- **Not before** the six tasks this note lists have landed: without the band function, the geometry, the renderer, the re-arrangement, the address and the measurement, the field is a prototype and not a view.

## Procedure

- Open Your Trainer in Deck. Do not touch the surface toggle.
- Note what is in front of you. Open the same repository in the cockpit and compare its Needs-you group for the same view against the front band.
- Drag the field, or hold an arrow key, until you face the quiet band. Read the compass before and after the turn.
- Switch from Issues to Features. Watch the cards.
- Put the mouse away. From the navigator, use Tab and the arrow keys to reach a card in the mid band, and Enter to open it.
- Copy the address. On the tablet, open Deck's host in Safari and paste the address.

## Expected results

- Deck opens on Glass, not on Spread, and the switcher shows Glass as the current surface.
- The front band holds the notes the cockpit's Needs-you group holds for that view, or holds as many as fit and shows how many more there are. No owed note is anywhere but the front band or that count.
- Turning shows the quiet band behind you as small id tiles, and the compass count before the turn equals the number of tiles you turn to face.
- On the view switch, the notes present in both views move to new places, notes that leave fade out, and no card slides from one note's place into another's.
- A mid-band card is reached and opened from the navigator with the keyboard alone, and the field flies to it.
- The pasted address opens the same view on the tablet, on Glass, and a far card there opens by flying to it and then tapping it.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
