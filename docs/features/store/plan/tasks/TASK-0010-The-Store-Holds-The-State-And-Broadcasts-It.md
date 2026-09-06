---
type: "[[task]]"
id: TASK-0010
aliases: ["TASK-0010"]
title: "The store holds the state and broadcasts it — one record in the main process, every window subscribed"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0003-One-Store-In-The-Main-Process]]"]
parent: "FEAT-0003"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0003-One-Store-In-The-Main-Process]]"]
tests: []
---

# The store holds the state and broadcasts it

## Objective

One state record lives in the main process. A window subscribes at start, receives the current state immediately, and is sent the new state whenever it changes.

## Definition of Done

- [ ] The state record holds the current workspace, view, desk and focused note.
- [ ] A window that subscribes receives the current state at once, without asking separately.
- [ ] A change made in one window reaches every other window without a reload.
- [ ] A window that has closed is dropped from the subscribers rather than being written to.
- [ ] The reducer is a pure function and is tested without Electron.

## Steps

- [ ] Declare the state shape and the actions that change it.
- [ ] Write the reducer as a pure function over state and action.
- [ ] Wire the main-process store to the renderer over the bridge: subscribe, dispatch, unsubscribe.
- [ ] Drop dead windows on close.

## Notes

Keeping the reducer pure is what makes this testable at all: the Electron part is a transport, and the transport is the thin half.
