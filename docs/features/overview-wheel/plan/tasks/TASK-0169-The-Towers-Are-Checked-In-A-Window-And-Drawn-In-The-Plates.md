---
type: "[[task]]"
id: TASK-0169
title: "The towers are checked in a real window and drawn in DES-0005's plates, and the change is recorded"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16, after turning DES-0005-towers.html: 'I like the design page, please implement as suggested. However can you please come up with a different design for the exit criteria? Also, what is the red rectangle on-top of the tower, I assume this highlights issues that \"needs me\", should this be selectable?'"]
parent: "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
effort: M
due: ""
depends: ["[[TASK-0167]]", "[[TASK-0168]]"]
blocks: []
related: ["[[TASK-0162]]"]
tests: ["[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]", "[[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]]"]
---

# The towers are checked in a window and drawn in the plates

## Definition of Done

- [x] The window-run driver (TST-0093) opens the wheel on both workspaces, presses a floor, a cap, a phase and the core through the 3D view, turns, zooms and resets the camera, and opens a phase and comes back. Run once Edwin says.
- [x] DES-0005's S1 and S2 plates are the flat plans, and its pictures of Deck's own window are retaken.
- [x] A change note says what replaced the constellation and the web; FEAT-0027 and FEAT-0028 say where they stand.
- [x] Two independent Claude reviewers review the change.

## Verification

The window-run driver presses through the 3D view and passed on Deck and your-trainer on 2026-10-16 (TST-0093, fourth run). DES-0005's S1 and S2 plates are the flat plans, and three pictures from the run are in it. The change note is CHG-20261016-The-Wheel-Is-Towers-On-A-Ring-In-3D. Two independent Claude reviewers reviewed it in two rounds (FEAT-0027, Review, Towers); the one point they kept open, this run, is now done. 791 node tests: 789 pass, 2 cockpit parity checks skip without the sibling cockpit.
