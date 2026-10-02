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

A popped-out window no longer tells the store which view or surface it draws. It reads its view from its address and loads it for itself. `selectView` dispatches `select-view` only in the main window, and `applyAddress` dispatches `select-surface` only there.

A second change makes the other half harmless wherever it still happens. When a note's document is taken down, Glass keeps where it was being read, for the session. A document built again for the same note goes back there. So a view left and returned to, or a note sent to another window and back, is read where it was.

## Evidence

2026-10-02, in the Linux box. Before the fix, a walk logged every action the store received while a desk window for Issues started: `select-surface glass`, then `select-view issues`, with the view going `features -> issues`; the main window then showed 0 documents where it had 1.

After the fix, `bash tools/scripts/walk-in-a-box.sh glass-handoff` records, as its first check: "opening a desk window for another view and a reader window changed nothing in the main window: it is on the same view, with its note open and read at the same place". 23 checks held, and the five other walks and the 566 node tests still hold.

Not yet run after this change: the smoke run, which opens desk panels of its own. It is being reconciled with the Glass desktop separately and is run in full before this feature closes.
