---
type: "[[task]]"
id: TASK-0189
title: "A cockpit square too small for its cut is drawn with a smaller cut, not one of negative size that the browser reports as an error"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Found by TASK-0187's window run on your-trainer: the page logged 'Error: <rect> attribute width: A negative value is not valid' for the wheel's flat plan"]
parent: "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"
effort: XS
due: ""
depends: []
blocks: ["[[TASK-0187]]"]
related: ["[[TASK-0145]]", "[[TASK-0166]]", "[[TASK-0187]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0102]]"]
---

# A tiny square's cut never has a negative size

**On your-trainer the wheel's flat plan draws 159 squares whose inner cut has a negative width, and Deck's window logs an error for each.** TASK-0187's window run now fails on any page error, which is how it was found. The squares are 2.2 pixels wide in the plan of a ring of 2,747 tickets. The cut that marks "in progress" and "complete, not proven" is inset by a fixed 1.6 lines, more than half of such a square (`cockpitSquare` in `desktop/src/shared/overview-marks.ts`, from [[TASK-0145]]). The flat plan is hidden under the 3D view, so nothing was seen; the browser still parsed and refused each rectangle.

## Definition of Done

- [x] The cut is inset by at most 30% of the square, so it keeps a positive size at any size and still tells the two fills apart.
- [x] A check draws every screen of both fixtures and finds no rectangle of negative width or height.
- [x] The window run on your-trainer logs no page error.

## What was done (2026-10-22)

The cut is inset by `Math.min(line * 1.6, s * 0.3)` instead of `line * 1.6`. At the usual sizes nothing changes; a square of 2.2 pixels keeps a cut 0.9 pixels wide. A new check in [[TST-0102]] draws every screen of both fixtures, with panels as HTML and flat, and finds no rectangle of negative size; without the fix it finds the 159 on your-trainer's wheel. The window run on your-trainer then logged no page error. The full node run passes: 860.
