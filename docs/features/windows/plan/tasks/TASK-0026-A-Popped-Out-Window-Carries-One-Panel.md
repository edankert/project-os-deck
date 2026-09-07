---
type: "[[task]]"
id: TASK-0026
aliases: ["TASK-0026"]
title: "A popped-out window carries one panel, so a second display can hold the Needs-you strip, a single note, or a desk"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[REFERENCE-PHASE-0001-REVIEW]]", "[[FEAT-0004-Windows-On-Any-Screen]]"]
parent: "FEAT-0004"
effort: ""
due: ""
depends: ["TASK-0023", "TASK-0024"]
blocks: []
related: ["[[FEAT-0004-Windows-On-Any-Screen]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]]"]
tests: ["[[TST-0020-A-Popped-Out-Window-Carries-One-Panel]]"]
---

# A popped-out window carries one panel

## Objective

Popping out asks what to pop out. A popped-out window holds one thing: the Needs-you strip, a single note, or a desk. That is the status window Edwin asked for when this phase opened, and it is what makes a second display worth having.

## Detail

Pop out today opens the same view again with no navigation. It is a duplicate rather than a panel, and it is why this phase's second exit criterion was amended on 2026-09-06 to describe what existed instead of what was wanted. The criterion is restored with this task and reads as a status window again.

The panel type belongs in the address, because every reachable Deck state has one ([[FEAT-0006-Every-State-Has-An-Address]]). A popped-out window is then restorable the same way any other window is, and its panel type survives a restart with its bounds.

## Acceptance

- Pop out offers a choice of what the new window will carry: the Needs-you strip, the focused note, or the current desk.
- A window carrying the Needs-you strip shows only what is owed, updates when the underlying notes change, and draws no view buttons and no rail.
- A window carrying a note shows that note and stays on it while the main window navigates elsewhere.
- A window carrying a desk shows that desk's cards where they were placed.
- Copying the popped-out window's address and opening it again produces a window carrying the same panel.
- Quitting and restarting Deck reopens the popped-out window on the display it was left on, still carrying the same panel.
- None of these windows takes the keyboard from the window a person is typing in.

## Steps

- [x] Add a panel type to the address grammar, alongside workspace, view, desk and focused note.
- [x] Turn Pop out into a choice, and pass the chosen panel type through to the new window.
- [x] Render each panel type from the same renderer, with the rail and the view buttons absent as they already are for a satellite.
- [x] Persist the panel type with the window's bounds so a restart restores both.
- [x] Extend the address round-trip checks to cover each panel type and to refuse an unknown one.

## Notes

[[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]] was reworded on 2026-09-06 to describe the duplicate window that exists. When this task lands, its Procedure goes back to naming a status window, and the phase's second exit criterion is walked against that.

## Where this stands

**2026-09-07: built.** Pop out asks what the new window will carry, and the answer is one of three panels: what needs you, the focused note, or the desk. The panel goes into the address, the address is remembered, and a restart reopens the window carrying the same thing on the display it was left on. The address grammar refuses a panel Deck cannot draw, which is what the old `panel=status` value became.

The automated check is [[TST-0020-A-Popped-Out-Window-Carries-One-Panel]], and the whole suite passes: 143 checks across the desktop suites on 2026-09-07.
