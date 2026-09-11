---
type: "[[plan]]"
title: "Plan — an opened note stands in the middle of its neighbours"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]"]
implements: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[DES-0002-The-Glass-Cockpit]]"]
---

# Plan — an opened note stands in the middle of its neighbours

## Delivery sequence

The ring's geometry comes first and is tested in node, because the promises that matter (nothing overlaps the pane, order is kept, nothing passes through the middle) are exact arithmetic. Then the pane in the middle, then the ring around it, then the orbit, then the smoke checks, which also rewrite the existing checks this feature changes.

1. **[[TASK-0067-The-Ring-Is-A-Pure-Layout]]** — `desktop/src/shared/focus-ring.ts`: the pane's size and place in the field, the ring's places on an ellipse that clears the pane, who gets a place when there are more than 16, the order they take, the constraint that keeps the line to the previous focus pointing the same way, and the path by angle and distance with slow-in, slow-out timing. Writes `desktop/tests/focus-ring.test.mjs` and lands in the same commit as [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]. Needs nothing; can run beside FEAT-0016.
2. **[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]** — In `desktop/src/renderer/glass.ts`: the window's switch for the focus, the two stages for the pane, the dock, the dimmed field drawn at 0.85 of the zoom, leaving, the second Escape, and everything that leaves the focus. Appends the amendment paragraphs to DES-0002, FEAT-0010, TASK-0035, TASK-0054 and FEAT-0015. Needs 1 and [[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]].
3. **[[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]** — The ring layer, the mini notes and their flight, the lines with their direction and sentence, "+N more", a mini note as a door, the keyboard route and the navigator's order, reach on a mini note, and the rule that the neighbourhood does not take the front band while a note is the focus. Appends the amendments to TASK-0036, FEAT-0010, PHASE-0002's exit criterion 3 and the walk TST-0024. Needs 2.
4. **[[TASK-0070-The-Orbit-Opens-A-Note-The-Same-Way]]** — The same focus over the orbit, the drift stopped while it is open, and the orbit back at the same pixel after leaving. Appends the amendments to FEAT-0001 and TASK-0004. Needs 3.
5. **[[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]]** — New checks in `desktop/src/main/smoke-glass.ts`, each shown to fail with its fix removed, and the rewrite of the existing Glass checks that assumed a lift spreads the neighbourhood across the front band or that one Escape sweeps. Recorded in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]. Last.

## Dependencies

- **Hard:** TASK-0068 needs TASK-0067's layout and [[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]'s transform. TASK-0069 needs TASK-0068. TASK-0070 needs TASK-0069. TASK-0071 needs TASK-0068 to TASK-0070.
- **None outside this repository.** The ring reads the sidecar's context endpoint Glass already reads, one request per lifted note and cached per index revision. The line's sentence uses Deck's own `/deck/graph/<workspace>/sentence` route, which the orbit already uses.
- **From earlier Glass work, all built:** the pane, the desk's stacking order, the reach, the orbit's graph and layout, Hide notes and the desk per view.

## Open questions

- **"The associated notes should show their connections."** Edwin's; stated in [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]. The plan builds a line from the focus to each neighbour and reach on a mini note. Lines between neighbours would be a step added to TASK-0069; a second ring would be a new task.
- **The sizes.** The focus pane's readable size, the mini note's size, the gap between them and the dock's width are chosen in TASK-0067 and written in its Outcome. The feature fixes only the rules: nothing overlaps, everything fits, at most 16 places.
- **How the ring waits for a neighbourhood not yet read.** The context is asked for at the lift and is usually cached. TASK-0069 decides what the pane shows until it arrives and writes it down.
