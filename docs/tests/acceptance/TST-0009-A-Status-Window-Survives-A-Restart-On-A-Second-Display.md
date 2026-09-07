---
type: "[[test]]"
id: TST-0009
aliases: ["TST-0009"]
title: "A status window carrying one panel reopens on the display it was left on, across a restart"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
area: "windows"
---

# A popped-out window reopens where it was left

## Purpose

The second exit criterion of [[PHASE-0001-Deck]]. It needs a real second monitor, which is why it is walked rather than automated. **Amended 2026-09-06:** this check used to say "open a status panel". Deck has no status panel and never had one; what it has is a popped-out window, which is the same view in a second window with no navigation of its own. The check now names what exists.

## Setup

Deck runs from this repository; there is no installed application yet.

- Once, ever: `cd desktop && npm install`.
- To start it: `cd desktop && npm start`. A window opens. The console line `deck: serving ... on 127.0.0.1:<port>` is Deck's own web host, and you can ignore it unless the check says otherwise.
- To stop it: quit the application, or press Ctrl+C in the terminal you started it from.
- **A workspace is added once, by hand.** Deck scans nothing. In the window, the left rail carries **+ add a workspace**; choose a folder that holds a `SNAPSHOT.yaml`. `/Users/Edwin/Dev/repos/project-os-deck` is the obvious one.
- **The controls this check names all live in the top bar**, on the right: *Copy address*, *Open address…*, *Pop out…*. Pop out asks what the new window should carry, and offers three answers in the status bar along the bottom.
- **A second display connected**, and for the last step something you are willing to unplug.

## Procedure

- Start Deck, open a workspace, and put two or three notes on the desk by clicking them in the navigator.
- Press **Pop out…** in the top bar. The status bar asks what the new window should carry. Choose **What needs you**.
- A second window opens carrying only what is owed: no view buttons, no rail, no navigator and no reader.
- Drag that window onto the second display and resize it.
- Type in the first window while the second one is opening, and confirm it never takes the keyboard.
- Quit Deck completely, then start it again with `cd desktop && npm start`.
- Observe where the popped-out window opens, and what it is carrying.
- Press **Pop out…** again and choose **The desk**, to see a window carrying the cards where you placed them.
- Now disconnect the second display, quit and start again, and observe once more.

## Expected results

- The popped-out window carries one thing, which is what you chose, and it draws nothing else.
- It reopens on the second display, at the size and position it was left, still carrying that same thing.
- With that display disconnected, it opens fully on-screen on the primary display, at the size it had.
- Neither window takes the keyboard from the one you were typing in when it appears.
- A window carrying the desk shows the cards where you placed them.

**Reworded 2026-09-07.** On 2026-09-06 this check was written down to describe the duplicate window that existed, because Deck had no status window and Edwin's walk stopped on the fiction. [[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]] built the thing the criterion originally asked for, so the check names it again.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
