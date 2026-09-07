---
type: "[[feature]]"
id: FEAT-0004
aliases: ["FEAT-0004"]
title: "Windows on any screen: a panel pops out, remembers the display it was on, and never steals focus"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[PHASE-0001-Deck]]"]
goal: "A person drags a Deck panel onto a second monitor and it is still there after a restart. One window owns navigation and the others watch, so a satellite window showing status never pulls the keyboard away from the window being typed in."
requirements: []
tasks: ["[[TASK-0012-A-Panel-Opens-In-Its-Own-Window]]", "[[TASK-0013-A-Window-Reopens-Where-It-Was]]", "[[TASK-0014-Satellites-Do-Not-Steal-Focus]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-PHASE-0001-REVIEW]]"]
---

# Windows on any screen

## Goal

A person drags a Deck panel onto a second monitor and it is still there after a restart. One window owns navigation and the others watch, so a satellite window showing status never pulls the keyboard away from the window being typed in.

## Scope

**In scope.** Opening a panel in its own window. Remembering each window's bounds under a stable key and restoring them on the display they were on, falling back to the primary display when that monitor is gone. One focus window that owns navigation, and satellite windows that render state and do not take focus when they open or update.

**Added 2026-09-07, after the review Edwin accepted ([[REFERENCE-PHASE-0001-REVIEW]]).** Popping out asks what to pop out, and the new window carries one panel: the Needs-you strip, a single note, or a desk. The panel type goes into the address, so the window is restorable and its address is shareable the way every other Deck state is.

**Out of scope.** Tearing a panel out by dragging it, which is a gesture rather than a capability and is not measured by any exit criterion. A panel opens in its own window from a command; the drag can come later.

## Acceptance

- Popping out offers a choice of panel: the Needs-you strip, the focused note, or the current desk, and the new window carries only that.
- A panel opened as its own window appears on the display it was last closed on, at the same size and position, across a restart of Deck.
- A popped-out window's address names its panel type, and opening that address again produces the same panel.
- A window whose remembered display is no longer connected opens on the primary display, fully on-screen.
- A satellite window that opens or updates does not take focus from the focus window.
- Closing the focus window does not orphan the satellites: they keep rendering, and a new focus window adopts navigation.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0012-A-Panel-Opens-In-Its-Own-Window]], [[TASK-0013-A-Window-Reopens-Where-It-Was]], [[TASK-0014-Satellites-Do-Not-Steal-Focus]], [[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]
- Plan: `docs/features/windows/plan/PLAN.md`

## Where this stands

**2026-09-07, later: the task is done and the status is back at `review`.** Pop out asks what the new window will carry, and it carries one thing: what needs you, the focused note, or the desk. The panel is named in the address, the address is remembered, and a restart reopens the window carrying the same panel on the display it was left on. The automated check is [[TST-0020-A-Popped-Out-Window-Carries-One-Panel]], and the smoke run opens all three panels in the real application and asserts that each carries its own thing and nothing else. What is owed is the walk that needs a second monitor, which is [[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]].

**2026-09-07, earlier: the status went back to `doing`, because one new task was in backlog.** A feature at `review` is waiting on a walk and nothing else. This one is waiting on work again, so `review` would be a false reading of it, and `STATUSES.md` puts `doing` before `review` for exactly this. It returns to `review` when TASK-0026 is done and only the walk is owed.

**Why the task was added.** A pop-out is currently the same view again with no navigation, which is a duplicate rather than a panel. That is why this phase's second exit criterion was amended on 2026-09-06 to describe what existed instead of what Edwin had asked for. The review of 2026-09-07 put the criterion back ([[REFERENCE-PHASE-0001-REVIEW]]) and [[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]] builds what it now asks for.

**2026-09-06: built and tested; the acceptance walk is owed.** One criterion here can only be settled by a person doing something a machine cannot: moving a window onto a second monitor, restarting Deck, and then unplugging that monitor and restarting again. That walk is [[TST-0009-A-Status-Window-Survives-A-Restart-On-A-Second-Display]], and its Procedure goes back to naming a status window once TASK-0026 lands.
