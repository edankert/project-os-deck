---
type: "[[issue]]"
id: ISS-0091
title: "A popped-out window for another view switches the main window to that view, and every note open in the main window leaves the screen"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["Found by the agent on 2026-10-02 by the handoff walk for FEAT-0023"]
reported_by: agent
question: ""
severity: high
component: windows
parent: ""
related: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]]", "[[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
tests: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]"]
---

# A popped-out window for another view switches the main window's view

## Problem

Open a desk window for the Issues view while the main window is on Features, and the main window switches to Issues. The notes that were open in it are gone from the screen, and when the view is switched back each one opens at its top, not where it was being read.

The same happens with no hand on anything: Deck restores popped-out windows when it starts, so a desk window left open on another view moves the main window to that view at every launch.

## Cause

A popped-out window draws the view in its own address ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], decision 12), and it kept that view to itself correctly once it was running. But while it started, it followed its address the way the main window does: `applyAddress` in `desktop/src/renderer/renderer.ts` called `selectView`, which told the shared store `select-view`, and `select-surface` before it. The store has one view, the main window's. So the popped-out window set it.

It went unseen because a window is usually popped out from the view that is on screen, and telling the store the view it already has changes nothing.

## Fix

A popped-out window no longer tells the store which view or surface it draws. It reads its view from its address and loads it for itself. `selectView` dispatches `select-view` only in the main window, and `applyAddress` dispatches `select-surface` only there. Commit `f80339f`.

A second change makes the other half harmless wherever it still happens. When a note's document is taken down, Glass keeps where it was being read, for the session. A document built again for the same note goes back there. So a view left and returned to, or a note sent to another window and back, is read where it was. Same commit.

## A follow-on defect the fix exposed, also fixed

After a tick or a verb pressed in a popped-out window, that window listed the main window's view. A window popped out on Intent, with the main window on Features, showed the Features list after Accept was pressed in it, and the note just acted on had no row there.

After a write a window reads its view again, and it took the view to read from the store. Since the fix above a popped-out window no longer tells the store its view, so the store's view is the main window's. A popped-out window now reads the view it is drawing (`afterWrite` in `desktop/src/renderer/renderer.ts`). Commit `a37f8f2`.

That follow-on fix changed something else. The handoff walk had reported a note moved to a desk window on another view as arriving, and it arrived only because the desk window was listing the main window's view. With `a37f8f2` the move stopped arriving, and commit `9379a0c` made it arrive properly. [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]] has the account.

## Evidence

**Before the first fix,** 2026-10-02, in the Linux box. A walk logged every action the store received while a desk window for Issues started: `select-surface glass`, then `select-view issues`, with the view going `features -> issues`. The main window then showed 0 documents where it had 1.

**Before the follow-on fix,** by commit `a37f8f2`'s message: the smoke run's check "after the write, this popped-out window still lists its own view" failed with 24 rows drawn, and the four checks that open the note again in that window found no row for it.

**Now,** 2026-10-02 at commit `e86b2e4`, in the same box:

- `bash tools/scripts/walk-in-a-box.sh glass-handoff` held all 33 checks, on this repository and on a copy of `your-trainer`. Its first check is the one for this issue: "opening a desk window for another view and a reader window changed nothing in the main window: it is on the same view, with its note open and read at the same place". If the defect came back, the store's view would be Issues after the desk window opened, the main window would hold no document, and that check would fail.
- The smoke run exited 0. Its check for the follow-on reads "after the write, this popped-out window still lists its own view: ADR-0005 still has a row in it (the window is on intent, the main window on issues; 47 rows drawn)", and all 31 checks of the verb section held. If the follow-on came back, the window would draw the main window's list, the note acted on would have no row, and that check would fail.
- The smoke run also opens desk panels of its own. Its check "a desk panel opened on Issues still draws the Issues desk after the focus window switches to Features" held.
