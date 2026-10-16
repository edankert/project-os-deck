---
type: "[[test]]"
id: TST-0091
aliases: ["TST-0091"]
title: "Deck opens on the wheel of phases, the state of every phase is read from it without reading a sentence, and every phase is reached from it by pointer and by keyboard"
status: active
owner: user:edwin
created: 2026-10-14
updated: 2026-10-16
source: ["[[TASK-0126-Deck-Opens-On-The-Wheel]]"]
phase: "[[PHASE-0005-Overview]]"
scope: system
level: acceptance
entrypoint: "The overview in Deck desktop"
command: ""
last_verified: ""
covers: ["[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"]
issues: []
tasks: ["[[TASK-0125-The-Overview-Contracts-And-The-Wheel-As-A-Scene]]", "[[TASK-0126-Deck-Opens-On-The-Wheel]]", "[[TASK-0145]]", "[[TASK-0146]]", "[[TASK-0155]]", "[[TASK-0156]]"]
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
2. Without pointing at anything, say which phase is in focus and which feature in it is being worked on, which phase is furthest along by its collar of exit criteria, and where the work that needs you is. Then point at a few plinths, floors, collar cells and shelf blocks and compare what the callout says with what you said.
3. Switch to your-trainer from the rail. Find its biggest feature from the heights of the towers, and the phase with the most red caps.
4. Click a phase's plinth, then press Escape. Click a red cap, then go back. Click a block on the shelf of finished phases. Click the core.
5. With the keyboard only: Tab to a phase and press Enter; press Escape; Tab to a cap and press Enter; press L and use the list to open a ticket.
6. Press Copy address on the wheel and on a phase, then Open address with each.
7. Press the Deck name at the left of the header to leave the overview, and press it again to come back.
8. Turn on reduced motion and move between the wheel and a phase.
9. Switch the wheel between its two colourings, by state and by ticket type. Open the cockpit beside Deck on the same workspace and compare three tickets: one done, one in progress and one the cockpit marks as needing you.
10. Open a phase, then a ticket, then a linked ticket. Press ← three times, then → once. Do the same with ⌘[ and ⌘], and with the mouse's back and forward buttons. Then press Escape on a ticket.
11. (Towers, 2026-10-16.) On your-trainer's wheel, without pointing, find the phase with the most tickets that need you from its red count, and say for one tower roughly how much is done, in progress and open from its floors. Find the ticket marked next. Point at a ticket and follow its wires.
12. Hold the middle mouse button and drag to turn the ring: the front should move the way your hand moves. Hold Shift with the middle button and drag to pan it. Scroll to zoom in and out. Try the three views beside Home, then Home, 0 and Escape. After each, press a floor and a plinth.
13. Turn on reduced motion, open the wheel, and leave the mouse still. Then drag with the middle button.

## Expect

- Deck opens on the wheel of the workspace it opened.
- The state of every phase can be read without reading a sentence. The only words on screen at rest are names and short captions.
- Every plinth and shelf block opens its phase, brought close; a red cap opens the one ticket that needs you, or the phase with those tickets first; the core opens re-phasing; Escape returns to the ring.
- Every step can be done with the keyboard, and the list holds the same phases and tickets as the picture.
- A copied address reopens the same screen.
- With reduced motion, screens change without animation and nothing glows in a pulse.
- A ticket has the same colour and the same mark in Deck as in the cockpit: colour for its type, fill for its state, a corner dot when it needs you. No screen says "owed again".
- ← goes back through the screens in the order they were visited and → returns; each button is disabled when there is nowhere to go. Escape goes up one level, ticket to phase, not back.
- The wheel is towers on a ring: a raised segment per phase still to finish, planned phases low and dim, active ones raised, the phase in focus highest and facing you; a tower per feature, done floors at the bottom and what needs you on top with a red cap; the feature in focus with its beam and the next ticket tagged; the exit criteria as a collar of cells round each rim, lit when met; finished phases as blocks outside the ring; the core round the no-phase button; and the Release test button.
- The ring turns, pans and zooms as the controls say, the front following the hand; labels stay readable when zoomed; a press opens what is under the pointer; Home, 0, Escape and a double-click on empty space return to the starting view, and Home shows only while the camera is moved. Under reduced motion nothing pulses or glides.
- **Edwin's choice, recorded with the verdict:** which colouring the wheel should open in.
- **Edwin's judgement, recorded with the verdict:** does it read as a picture, and does it look like the instrument he asked for?
