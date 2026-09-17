---
type: "[[issue]]"
id: ISS-0088
aliases: ["ISS-0088"]
title: "Now that the hover handler runs in the field, every pointer move over the quiet band scans every painted tile and rebuilds the callout's elements, and no measurement covers it"
status: triage
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: 2026-09-17
source: ["Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round two, 2026-09-17"]
severity: low
component: renderer
parent: ""
related: ["[[TASK-0082-The-Hover-Callout-And-The-Pointer-Cursor-Run-In-The-Field-Not-Only-In-The-Orbit]]", "[[ISS-0081-Resting-The-Pointer-On-A-Tile-Does-Nothing-Because-The-Handler-Only-Runs-In-The-Orbit]]", "[[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
tests: []
---

# The hover rebuilds the callout on every pointer move

## Problem

**[[TASK-0082-The-Hover-Callout-And-The-Pointer-Cursor-Run-In-The-Field-Not-Only-In-The-Orbit]] opened a listener that had never run in the field, and what is inside it now runs on every pointer move there.** Two things in it are per-move work that nothing measures.

`tileAt` is a linear scan of every tile painted this frame. On the largest shelf that is a few hundred; on a zoomed field it is fewer, because fewer are on screen.

`showTileCallout` calls `replaceChildren()` and builds two fresh elements every time it is called, including every move within the same tile. The callout's content only changes when the tile under the pointer changes, so most of that work produces the same two elements again.

**Nothing here is known to be a problem.** [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]] measured a turn with the pointer moving and found 1.0, 1.5 and 2.6 ms of script work per frame, at or below the same turn with the pointer still — but that was measured while this listener returned immediately in the field, so the number does not cover the code this issue is about.

## Expected

Either a measurement that covers it, or the two cheap guards: keep the last hit and return early when the tile under the pointer has not changed, and rebuild the callout's children only when the note it names changes.

## Evidence

Reproduced by reading `desktop/src/renderer/glass.ts`: the `pointermove` listener's guard, `tileAt`'s loop over `this.tiles`, and `showTileCallout`'s `replaceChildren()` with no check on whether `noteId` changed since the last call.

Not measured. `npm run measure` launches Electron and takes a person's screen for several minutes, so it was not run.

## Risk scan

No new dependency, env var, path or configuration. The hazard is a frame-time regression on the one band with the most objects, on a phase whose exit criterion is a frame time.

## Next Actions

- [ ] Decide whether to guard first or measure first; the guards are small enough that measuring afterwards answers both.
