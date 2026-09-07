---
type: "[[feature]]"
id: FEAT-0003
aliases: ["FEAT-0003"]
title: "One store in the main process: every window reads the same state and watches it change"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[PHASE-0001-Deck]]"]
goal: "Deck keeps its state in one place, the Electron main process, and every window subscribes to it. Open two windows, change the focused note in one, and the other shows the change immediately."
requirements: []
tasks: ["[[TASK-0010-The-Store-Holds-The-State-And-Broadcasts-It]]", "[[TASK-0011-The-State-Survives-A-Restart]]"]
release: ""
acceptance_exception: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: approved
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
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

## Where this stands

**2026-09-07: done.** The walk is made and the second independent review approved this feature. [[TST-0012-Two-Windows-Show-The-Same-State]] passed — Edwin walked it on 2026-09-07 and marked it pass in the release ledger. A second clean-context review, run at the close-out of [[PHASE-0001-Deck]], read this feature's code and criteria again and approved it with no findings against it ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]).

**2026-09-06: built and tested; the acceptance walk is owed.** Every criterion above is checked by the suites and by the smoke run that boots the real application. The status is `review` rather than `done` because the walk that settles it for a person — watching a second window follow the first, and quitting and coming back — is [[TST-0012-Two-Windows-Show-The-Same-State]], and nobody has walked it yet.

## Independent review — 2026-09-06 (second pass)

**Verdict: approved.** Clean context, separate session; same model family, recorded in `reviewed_by`. The first pass held this feature at changes-requested over one finding, now fixed and verified at `9b99c36`.

**A window received a change and did not repaint.** The `host.onState` subscription called `renderRail`, `renderDeskList` and `paintSwitcher` but not `drawDesk`, which is the only thing that repaints cards. A focused-note change made in another window updated the receiving window's copy of the state and changed nothing visible. `drawDesk()` is now in the subscription.

The fix was confirmed by mutation rather than by reading. Removing `drawDesk()` from the subscription again fails three smoke checks:

```
"the saved desk reached the window"
"closing the desk redrew the satellite (1 card then 1)"
"the satellite REDREW when the focused note changed (FEAT-0002 then FEAT-0002, wanted TASK-0008)"
```

Those checks now read the DOM — the highlighted card and the visible card count — rather than `window.__deckLastState`. That was the substance of the original finding: the old check asserted on the transport, so it passed while the window showed the wrong thing.

Also closed from the first pass's non-blocking list: `restore` carried a whole state and was dispatchable from a window; `isRendererAction` now refuses it at the IPC boundary, and the state file is written atomically as before. The focused note is reopened after a restart rather than merely highlighted.

Coverage gap left open, worth knowing: nothing exercises the restart path through the renderer. `reopenFocusedNote` is read, not tested; the store's own restart is tested.
