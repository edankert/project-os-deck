---
type: "[[test]]"
id: TST-0009
aliases: ["TST-0009"]
title: "A status window moved to a second display is there again after Deck restarts"
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

# A status window moved to a second display is there again after Deck restarts

## Purpose

The second exit criterion of [[PHASE-0001-Deck]]. It needs a real second monitor, which is why it is walked rather than automated.

## Procedure

- Connect a second display.
- Open a status panel as its own window and drag it onto the second display; resize it.
- Quit Deck completely and relaunch it.
- Observe where the status window opens.
- Disconnect the second display, quit and relaunch, and observe again.

## Expected results

- The window reopens on the second display, at the size and position it was left.
- With that display disconnected, the window opens fully on-screen on the primary display.
- The window does not take focus from the window being typed in.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
