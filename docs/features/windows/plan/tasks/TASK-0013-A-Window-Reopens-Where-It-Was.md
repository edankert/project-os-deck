---
type: "[[task]]"
id: TASK-0013
aliases: ["TASK-0013"]
title: "A window reopens where it was — bounds remembered per window and placed on the display it was on"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
parent: "FEAT-0004"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
tests: []
---

# A window reopens where it was

## Objective

Each window's position and size are remembered under a stable key and restored on the display it was on, or on the primary display when that monitor is gone.

## Definition of Done

- [~] A window moved to a second display reopens on that display, at the same size and position, after Deck restarts. **Owed to a walk:** the decision is a pure function and is tested over display sets including an unplugged monitor ([[TST-0003-A-Window-Is-Placed-On-The-Display-It-Was-On]]), but the physical check needs a second monitor and is [[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]].
- [x] A window whose display is no longer connected opens fully on-screen on the primary display.
- [x] Bounds are keyed per window role and panel, so two different panels do not fight over one saved rectangle.
- [x] The placement decision is a pure function of saved bounds and the current displays, and is tested without opening a window.

## Steps

- [x] Record bounds on move and resize, debounced, with the display id they were on.
- [x] On open, look up the saved bounds and the current displays.
- [x] Write the placement function: keep the bounds if the display is present and the rectangle intersects it, otherwise centre on the primary display.
- [x] Test the function against display sets that include a missing monitor and a rectangle that is off-screen.

## Notes

The second exit criterion of [[PHASE-0001-Deck]] is this task, walked by a person on a real second monitor. The pure placement function is what makes the logic checkable without one.
