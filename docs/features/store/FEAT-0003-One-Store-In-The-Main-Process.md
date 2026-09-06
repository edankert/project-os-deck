---
type: "[[feature]]"
id: FEAT-0003
aliases: ["FEAT-0003"]
title: "One store in the main process: every window reads the same state and watches it change"
status: doing
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
goal: "Deck keeps its state in one place, the Electron main process, and every window subscribes to it. Open two windows, change the focused note in one, and the other shows the change immediately."
requirements: []
tasks: ["[[TASK-0010-The-Store-Holds-The-State-And-Broadcasts-It]]", "[[TASK-0011-The-State-Survives-A-Restart]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
---

# One store in the main process

## Goal

Deck keeps its state in one place, the Electron main process, and every window subscribes to it. Open two windows, change the focused note in one, and the other shows the change immediately.

## Scope

**In scope.** A single state record holding the current workspace, the current view, the current desk and the focused note. Actions that change it, a subscription each window holds, and a broadcast that reaches every window when the state changes. The state is written to disk when it settles and read back when Deck launches, so a restart resumes where the person left off.

**Why it is a feature and not an implementation detail.** The cockpit keeps this state in `localStorage`, read once when a window starts. Two cockpit windows therefore never see each other change, which is the concrete failure this feature removes.

**Out of scope.** Persisting window geometry, which belongs to [[FEAT-0004-Windows-On-Any-Screen]] and is a different lifetime: geometry is per window, state is per application.

## Acceptance

- Two open windows show the same focused note, and changing it in one changes it in the other without a reload.
- A window opened after a change starts from the current state, not from a default.
- Quitting and relaunching Deck restores the workspace, view, desk and focused note that were current at quit.
- The state file is written atomically, and a corrupt or unreadable file leaves Deck starting from defaults rather than failing to start.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0010-The-Store-Holds-The-State-And-Broadcasts-It]], [[TASK-0011-The-State-Survives-A-Restart]]
- Plan: `docs/features/store/plan/PLAN.md`
