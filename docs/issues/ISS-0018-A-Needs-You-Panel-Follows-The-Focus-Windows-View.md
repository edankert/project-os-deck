---
type: "[[issue]]"
id: ISS-0018
aliases: ["ISS-0018"]
title: "A popped-out Needs-you panel silently re-points at whatever view the main window last chose, thirty seconds later, which is the opposite of what a satellite promises"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["A lead in [[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
severity: medium
component: renderer
parent: ""
related: ["[[FEAT-0004-Windows-On-Any-Screen]]", "[[TASK-0026-A-Popped-Out-Window-Carries-One-Panel]]", "[[TST-0020-A-Popped-Out-Window-Carries-One-Panel]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
tests: []
---

# A Needs-you panel follows the focus window's view

## Problem

**A status window on a second monitor changes what it is showing because you switched view in the main window, and it does it half a minute after you did.** The panel is supposed to be the one thing it was opened on. `renderer.ts` says so in as many words: "a view change in the focus window does not move it, because only a switcher click or an address load calls `selectView`".

**The poll made a third caller nobody counted.** `startNeedsYouPoll` refreshes every thirty seconds, because nothing pushes from the sidecar. It resolved its workspace and view from `host.state()` — which is the shared store every window writes to, including the focus window when somebody clicks a view button. So the strip followed, on the next beat, with no click and no visible cause.

## Expected

The strip shows what its own address named, until its address changes.

## Actual

It shows what the focus window last selected, up to thirty seconds later.

## Evidence

- `desktop/src/renderer/renderer.ts` — `startNeedsYouPoll` read `host.state().viewId` inside the interval.
- The comment on `pinned` in the same file, which claims the opposite.

**Established by reading the code, not by running Deck.** No automated suite loads the renderer ([[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]), and the walk needs two windows and a thirty-second wait.

## Resolution, 2026-09-07

The workspace and the view are read **once**, when the poll starts, and the interval uses those. A satellite is a window onto one thing, and the beat is a refresh of that thing rather than a re-read of where everybody else is looking.

**Unguarded by anything automated**, which is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] and not a fault of this fix. The walk is [[TST-0020-A-Popped-Out-Window-Carries-One-Panel]]: pop out a Needs-you strip, switch view in the main window, and watch the strip for a minute.

## The rest of the same sentence, fixed 2026-09-07

The poll was one way a satellite followed the focus window. **The search box was the other, and it was immediate rather than thirty seconds late.** `narrowed()` read `query` and `filters` from the shared store for every window, so typing in the main window's search box emptied a popped-out strip on a second monitor, with nothing on that screen to say why — the satellite draws no search box of its own.

A pinned window is no longer narrowed by anybody else's typing. It is a window onto one thing, which is the sentence in `renderer.ts` that both halves of this issue were failing to honour.
