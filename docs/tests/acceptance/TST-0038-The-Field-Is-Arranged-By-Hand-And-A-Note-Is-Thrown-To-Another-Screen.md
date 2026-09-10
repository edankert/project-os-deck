---
type: "[[test]]"
id: TST-0038
aliases: ["TST-0038"]
title: "The field is arranged by hand, a note is thrown to another screen, the tablet shows what the Mac holds, and the record is untouched"
status: active
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[PHASE-0002-Glass]]", "[[FEAT-0014-The-Hands]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0014-The-Hands]]"]
issues: []
tasks: ["[[TASK-0053-Pull-Forward-And-Push-Behind]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0055-Throw-To-A-Screen]]", "[[TASK-0056-Reach]]", "[[TASK-0057-The-Served-Page-Follows-The-Store]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[TST-0023-Glass-Opens-First-And-A-Days-Notes-Are-Read-In-It]]", "[[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]]", "[[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]]", "[[REFERENCE-GLASS-PHASE-REVIEW]]"]
area: "glass"
---

# The field is arranged by hand and a note is thrown to another screen

## Purpose

The walk that judges [[FEAT-0014-The-Hands]] as a thing a person uses. [[TST-0023-Glass-Opens-First-And-A-Days-Notes-Are-Read-In-It]] asks whether the field says what needs you; [[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]] asks whether a lifted note shows its relationships. This one asks whether a person can arrange the field with their hands, send a note to another screen and see it land, see what a card is joined to before taking it, and do all of it without the record changing. It is the walk that says whether Glass is a surface or a skin, which is the question Edwin put on 2026-09-10.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm run start:lan`, so that the tablet can reach Deck's host. Note the port it prints; `ipconfig getifaddr en0` gives the address.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** In the window, the left rail carries **+ add a workspace**; choose Your Trainer, because a field of thirty cards cannot overflow anything and has no neighbourhood worth reaching for.
- **A second display**, and a reader window popped out onto it: **Pop out** in the top bar, choose a note, drag the window to the second display.
- **A tablet on the same network**, with `http://<address>:<port>/` open in Safari and the same workspace chosen. The tablet setup in [[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]] applies.
- **A terminal in the workspace with `git status` ready.** Run it once before you start and confirm the tree is clean, because the last step compares against it.
- **Not before** the five tasks this note lists have landed, and not before [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]'s field and [[FEAT-0010-Lifting-A-Note]]'s lift are built.

## Procedure

- Open the Issues view in Glass on the Mac. Rest the pointer on a mid-band card for a second without clicking. Look for wires, and read the compass.
- Drag that card toward you until it snaps into the front band. Read the front label. Switch to Features and back to Issues; find the card.
- Drag a different mid-band card up and away until it goes behind you. Read the compass. Turn to face the quiet band and find it.
- Drag a card from the Needs-you front band up and away. Watch what happens and read what the front plane says.
- Click a card to lift it. Drag the pane to the right of the window, resize it wider, then lift a second note and drop its pane over the first one's header. Click the lower header.
- Press **widen** on one pane. Watch the field.
- Drag a third card off the right edge of the field toward the second display, slowly enough to read the strip that appears at the edge, and release over the reader window's name. Look at the second display.
- Drag a fourth card off the same edge and release past it with nothing under the pointer. Look at the second display.
- Look at the tablet. Find the desk there and compare it to the Mac's.
- On the tablet, press and hold a card for a second. Look for wires. Release without moving.
- Quit Deck and start it again with the same command. Look at the panes, the front label and the compass.
- Run `git status` in the workspace.

## Expected results

- Resting on a card draws wires from it to its neighbours on screen, and the compass says how many neighbours are behind you; moving off clears them.
- The pulled card is in the front band with a hand mark, the label counts one hand-placed note beside the owed count, and the card is still there after the view switch.
- The pushed card is behind you, the compass count rose by one and says one was pushed by hand, and the card is among the quiet tiles when you turn.
- The owed card springs back to the front band and the front plane says, in words, that what needs a person cannot be pushed away.
- The panes go where they were dragged and resized; the second pane snapped below the first's header; clicking the lower header raised it; widen took the pane to a reading column and the field flowed around it.
- The third card opened in the reader window on the second display; the strip named that window while the drag was near the edge; the card flew toward that edge.
- The fourth card opened a new reader window on the second display.
- The tablet shows the same desk as the Mac, with the same notes, and it showed the thrown note within a second of the throw without a reload.
- Press-and-hold on the tablet drew the same wires, and release cleared them.
- After the restart the panes are where they were and the pulled and pushed sets are empty: the label counts zero hand-placed and the compass counts zero pushed.
- `git status` is clean.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note. Record the number of pulled, pushed, thrown and lifted notes beside it.
