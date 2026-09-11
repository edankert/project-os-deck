---
type: "[[test]]"
id: TST-0048
aliases: ["TST-0048"]
title: "Each view keeps its own desk, a note kept on every view follows every switch, and Hide notes clears the window without taking anything off the desk"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
issues: []
tasks: ["[[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]]", "[[TASK-0059-A-Note-Is-Kept-On-Every-View]]", "[[TASK-0060-Hide-Notes-And-Show-Them-Again]]", "[[TASK-0061-Glass-And-Spread-Draw-The-Views-Own-Desk]]", "[[TASK-0062-Desk-Panels-Throws-And-The-Tablet-Use-The-Right-Views-Desk]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]]"]
area: "glass"
---

# Each view keeps its own desk, and held notes can be hidden

## Purpose

The walk that judges [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]] as a thing a person uses. It asks three questions Edwin raised on 2026-09-11. Can he clear the screen of held notes and get them back without losing their arrangement? Does each view keep its own held notes? Can a note he needs everywhere stay on every view? It also checks that upgrading changed nothing he could see.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- **Before the build that carries this feature**, start Deck from the last commit without it, open Your Trainer, and hold three notes on the Issues view in Glass. Note where each pane is. Quit Deck. This is the state file the upgrade step reads.
- To start the new build: `cd desktop && npm run start:lan`, so the tablet can reach Deck's host. Note the port it prints; `ipconfig getifaddr en0` gives the address.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A tablet on the same network**, with `http://<address>:<port>/` open in Safari, the same workspace chosen and Follow the Mac off. The tablet setup in [[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]] applies.
- **A terminal in the workspace with `git status` ready.** Run it once before you start and confirm the tree is clean.
- **Not before** the five tasks this note lists have landed.

## Procedure

- Start the new build. Look at the three panes on Issues, then switch to Features and look again.
- On Features, press the "on every view" mark on one of the three panes so it is no longer pressed. Switch to Issues.
- On Issues, lift two more notes. Switch to Features and lift one note there. Switch back to Issues. Read the bar.
- Press **Hide notes** in the top bar. Look at the field and at where the panes were. Read the button.
- Press **H**. Then press Hide notes again, switch to Spread, and look at the desk. Press the button again.
- Click into the navigator's search box and type the letter h.
- Hide the notes, then lift a card from the field.
- On one of the Issues notes, press **V** on its pane header. Switch to Tests, a view that does not hold it, and read the pane. Switch to Spread on Tests and find its card.
- Press **Escape** on Tests. Read what the front plane says.
- Open **Pop out** and choose a desk; the window opens on the current view. In the main window switch to another view. Look at the popped-out desk.
- Look at the tablet. Switch the Mac to another view and look at the tablet again.
- Quit Deck and start it again. Look at the panes on Issues and on Features, and at the Hide notes button.
- Run `git status` in the workspace.

## Expected results

- After the upgrade, the three panes are where they were on Issues and the same three are on Features, each with "on every view" pressed.
- After the unmark, that pane is on Features only and is gone from Issues.
- Issues holds its own notes and Features holds its own; each view shows its own after every switch, at the places they were left. The Issues bar names Features and how many notes it holds.
- Hide notes leaves no pane on screen and takes nothing off the desk. Cards fill the space the panes covered. The button reads "Show N notes" with the right N.
- **H** brings every pane back at its place and size. Spread hides and shows its cards the same way.
- Typing h into the search box types a letter and hides nothing.
- Lifting a card while hidden brings every note back.
- On Tests, the note on every view is a pane with its body, and in Spread a card that says "not in this view".
- Escape takes the view's own notes off, keeps the note on every view, and says that one stayed.
- The popped-out desk keeps showing the desk of the view it opened on after the main window switches.
- The tablet shows the desk of the Mac's current view, and follows the Mac's switch within a second, while its own navigator stays on the view it was browsing.
- After the restart, each view's notes and the note on every view are where they were, and every note is shown: Hide notes was not remembered.
- `git status` is clean.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note. Record which views held notes, how many were marked on every view after the upgrade, and anything that looked wrong.
