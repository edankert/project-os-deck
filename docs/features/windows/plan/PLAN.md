---
type: "[[plan]]"
title: "Plan — windows on any screen"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
implements: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
related: ["[[PHASE-0001-Deck]]"]
---

# Plan — windows on any screen

## Delivery sequence

1. **[[TASK-0012-A-Panel-Opens-In-Its-Own-Window]]** — A panel can be opened as its own window. It runs the same renderer, opened at its own address, and declares whether it is the focus window or a satellite.
2. **[[TASK-0013-A-Window-Reopens-Where-It-Was]]** — Each window's position and size are remembered under a stable key and restored on the display it was on, or on the primary display when that monitor is gone.
3. **[[TASK-0014-Satellites-Do-Not-Steal-Focus]]** — A satellite window opens and updates without taking the keyboard. Navigation belongs to the focus window.

## Dependencies

- **Hard:** the tasks above run in the order listed; each one's output is the next one's input.
- **Soft:** [[FEAT-0002-Deck-Opens-A-Workspace]] lands first of all the features, because everything else needs a window and a sidecar to read from.

## Open questions

- None open. What was open is recorded in the feature's Scope section as a decision.
