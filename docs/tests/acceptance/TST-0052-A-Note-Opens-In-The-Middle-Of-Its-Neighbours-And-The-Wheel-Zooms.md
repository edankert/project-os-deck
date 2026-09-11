---
type: "[[test]]"
id: TST-0052
aliases: ["TST-0052"]
title: "A note opened in Glass or the orbit stands in the middle of its neighbours and Escape puts the field back, and the mouse wheel zooms toward the pointer"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
issues: []
tasks: ["[[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]", "[[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]]", "[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]", "[[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]", "[[TASK-0070-The-Orbit-Opens-A-Note-The-Same-Way]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0002-Glass]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "[[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0048-Each-View-Keeps-Its-Own-Desk-And-Held-Notes-Can-Be-Hidden]]"]
area: "glass"
---

# A note opens in the middle of its neighbours, and the wheel zooms

## Purpose

The walk that judges two features as things a person uses. It answers what Edwin asked on 2026-09-11. Does the mouse wheel zoom Glass and the orbit? When he selects a note in the orbit, does it open with its directly connected notes shown as mini notes? When he selects a note in Glass, does the opened note take the card's place and then move to the middle, with its associated notes around it and their connections shown? It also checks that Escape gets him back, and that nothing was written.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start: `cd desktop && npm start`. To stop: quit the application.
- A mouse with a wheel, and a Mac trackpad if you have one.
- **A terminal in the workspace with `git status` ready.** Run it once before you start and confirm the tree is clean.
- Open this repository (`project-os-deck`) in Deck, Issues view, Glass.
- **Not before** the six tasks this note lists have landed.

## Procedure

**Zoom.**

- Rest the pointer on a card at the side of the front band and turn the wheel toward you three notches. Then away from you until it stops. Then toward you until it stops. Watch the card under the pointer.
- Read the compass. Press the zoom reading on it.
- Pinch on the trackpad over the field. Look at the rest of the window: the top bar, the navigator.
- Hold Shift and turn the wheel.
- Lift a note, so a pane is open. Turn the wheel with the pointer over the pane's text. Press Escape twice.
- Zoom in over a card that sits beside where a pane would be, lift a different note, and look for a card under its pane.
- Press `+` twice, `-` once, then `0`. Click into the navigator's search box and type `0`.
- Double-click the field's background.
- Switch to Orbit. Zoom in on a cluster, rest on a link, then click a dot.

**Opening a note in Glass.**

- On Issues, click a card in the front band. Watch where the pane first appears and where it goes.
- Look at the notes around it. Compare the lines. Rest the pointer on one line and read it. Rest on one mini note.
- Click a mini note. Watch where the note you had open goes, and where it sits on the new ring.
- Click the header at the left edge. Then try to drag it.
- Press Escape once. Look at the panes and the front band. Press Escape again.
- Find a note with many links (a phase or a feature) in the navigator and press Enter on it. Count the mini notes and find "+N more". Press Tab from the pane and walk the ring with Tab, then press Enter on one.
- Lift a note, then press **H**. Press H again.
- Turn on reduced motion (System Settings, Accessibility, Display, Reduce motion) and lift a note. Turn it off again.

**Opening a note in the orbit.**

- Switch to Orbit. Click a dot. Leave the mouse alone for ten seconds. Press Escape and compare the orbit with how it looked before.

**Afterwards.**

- Quit Deck and start it again. Look at the panes.
- Run `git status` in the workspace.

## Expected results

- The card under the pointer stays under the pointer as the field grows and shrinks, and the zoom stops at a limit each way.
- The compass shows the zoom, for example "2.5×", and pressing it returns to normal size; at normal size the reading is gone.
- A pinch zooms the field and nothing else in the window changes size.
- Shift and the wheel turn the field without zooming.
- The wheel over a pane scrolls its text.
- After zooming, no card is left under a pane once the wheel stops.
- `+`, `-` and `0` zoom in, out and back; typed in the search box, `0` is a letter.
- A double-click on the background returns to normal size.
- In the orbit the zoom works the same way, links still show their sentence and a dot can still be clicked.
- The pane first appears where the card was, then moves to the middle within about a second. The card's place is a dashed outline.
- The notes it links to and the notes linking to it stand on a ring around it as small cards with an id and title, none over the pane; lines to what it links to are solid and lines from what links to it are dashed. Resting on a line says which way the link runs and quotes its sentence. Resting on a mini note draws wires to its own neighbours.
- A neighbour that was on the left of the field before the lift is on the left of the ring.
- Clicking a mini note moves it to the middle; the previous note becomes a header at the left edge and, if the two are linked, sits on the opposite side of the new ring.
- Clicking the header swaps it back; dragging it does nothing.
- One Escape takes the note out of the middle: every pane is back where it was and the neighbourhood is in the front band, with the field turned to it. A second Escape empties the desk.
- A note with many links shows 15 mini notes and "+N more"; Tab walks the ring and Enter opens one.
- H takes the note out of the middle and hides the panes; H again shows them, with nothing in the middle.
- With reduced motion nothing moves: the note and its ring appear in place and are highlighted.
- In the orbit, the note opens in the middle over a dimmed orbit that does not drift; after Escape the orbit looks exactly as it did.
- After the restart, the panes are where they were and nothing is in the middle.
- `git status` is clean.

## Evidence (fill after running)

Not yet walked: planned 2026-09-11.
