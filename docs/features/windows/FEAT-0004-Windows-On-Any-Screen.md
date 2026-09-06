---
type: "[[feature]]"
id: FEAT-0004
aliases: ["FEAT-0004"]
title: "Windows on any screen: a panel pops out, remembers the display it was on, and never steals focus"
status: doing
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
goal: "A person drags a Deck panel onto a second monitor and it is still there after a restart. One window owns navigation and the others watch, so a satellite window showing status never pulls the keyboard away from the window being typed in."
requirements: []
tasks: ["[[TASK-0012-A-Panel-Opens-In-Its-Own-Window]]", "[[TASK-0013-A-Window-Reopens-Where-It-Was]]", "[[TASK-0014-Satellites-Do-Not-Steal-Focus]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
---

# Windows on any screen

## Goal

A person drags a Deck panel onto a second monitor and it is still there after a restart. One window owns navigation and the others watch, so a satellite window showing status never pulls the keyboard away from the window being typed in.

## Scope

**In scope.** Opening a panel in its own window. Remembering each window's bounds under a stable key and restoring them on the display they were on, falling back to the primary display when that monitor is gone. One focus window that owns navigation, and satellite windows that render state and do not take focus when they open or update.

**Out of scope.** Tearing a panel out by dragging it, which is a gesture rather than a capability and is not measured by any exit criterion. A panel opens in its own window from a command; the drag can come later.

## Acceptance

- A panel opened as its own window appears on the display it was last closed on, at the same size and position, across a restart of Deck.
- A window whose remembered display is no longer connected opens on the primary display, fully on-screen.
- A satellite window that opens or updates does not take focus from the focus window.
- Closing the focus window does not orphan the satellites: they keep rendering, and a new focus window adopts navigation.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0012-A-Panel-Opens-In-Its-Own-Window]], [[TASK-0013-A-Window-Reopens-Where-It-Was]], [[TASK-0014-Satellites-Do-Not-Steal-Focus]]
- Plan: `docs/features/windows/plan/PLAN.md`
