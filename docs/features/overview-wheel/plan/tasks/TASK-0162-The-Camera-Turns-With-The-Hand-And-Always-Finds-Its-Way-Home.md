---
type: "[[task]]"
id: TASK-0162
title: "The overview's camera turns the way the hand moves, cannot lose the picture, and shows Home once it has been moved, beside three views"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16: 'when rotating in 3d and zooming, it is difficult to get the screen back to its original position. also the rotation functionality seems to now and again move opposite to the mouse moves'", "Edwin 2026-10-16, approving the review: 'go with towers, group by phase, draw it in three.js first'"]
parent: "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[TASK-0156]]", "[[TASK-0163]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]"]
---

# The camera turns with the hand and always finds its way home

## Problem

**Two defects in the camera TASK-0156 built.** Both are in code this feature changed, so they are fixed in it (`QUALITY.md`).

- **The disc turns against the hand when you grab its front.** A drag to the right always turned the plane clockwise (`turned` in `desktop/src/shared/overview-camera.ts`). On a plane leaning back, clockwise moves the near edge, the bottom of the screen, to the left. So a drag in the top half followed the pointer and a drag in the bottom half went the other way.
- **The way back is hard to find, and the picture can be lost.** Only a double-click on empty space or the 0 key put the camera back, and neither is visible. Panning had no limit and zoom went to 6×, so the picture could leave the window. Each screen's camera is kept for the session, so the wheel came back as it was left.

## Definition of Done

- [x] A drag across turns the plane so that its near edge moves the way the pointer moves, wherever the drag starts. Up and down still tilts. This is the rule of three.js's orbit camera, so the towers page (TASK-0163) and Deck turn the same way.
- [x] Panning stops when the picture's centre would leave the window, and zoom runs from 0.6× to 4×.
- [x] A Home button shows on the overview whenever the camera is not where the screen starts, and is hidden otherwise. Pressing it glides the camera back. Home, 0, and Escape when the camera has moved, do the same; Escape on an unmoved screen still goes back.
- [x] Beside Home, three views: from above, leaning (where the ring screens start) and from the side. Each is a button with a callout.
- [x] TST-0090's camera check covers the turn's direction, the limits, the views and Home. `cd desktop && npm test` passes. No window run until Edwin says (design work, 2026-10-16).

## Verification

`turned` now subtracts the drag from the spin, so a drag to the right turns the plane anticlockwise and its near edge moves right with the pointer. TST-0090's camera check asserts the sign and where the near edge goes. `withinView` holds the pan within half the stage's size, and `panned` and `zoomed` use it; zoom runs 0.6× to 4×. Home (⌂) and the three views (◉ from above, ◒ leaning, ▬ from the side) sit at the bottom right of the overview, each with a callout; Home is hidden while the camera stands where the screen starts. Home, the views, the Home and 0 keys, and Escape on a moved camera glide back in 320 ms, or at once with reduced motion. TST-0090 checks the limits, the views and `isDefault` treating a whole turn as home. 789 node tests pass. The window-run driver (`desktop/scripts/overview-drive.cjs`) now expects the new turn direction and checks Home shows and hides; it was not run, because Edwin asked on 2026-10-16 to stay with the design and window runs wait for his word.

**Review, round one (two independent Claude reviewers), 2026-10-16: changes requested, all fixed.** Home and the three views were drawn for the screen being left, because `paint` drew them before `showOverview` set the new screen; they are now drawn after it. A whole turn to the right (a negative spin) was not tested; it is. The Home key was taken from the navigator's list and the list twin; it now moves the camera only when focus is on the page or the overview's picture. Two glides started close together cut each other short; the second now takes over the first's timer. "Leaning" on a text screen went to 22° though its callout says "as the ring screens start"; it goes to the ring screens' 26°, and "From the side" to 68°, nearly edge on as it says. The renderer's Home, Escape, views and pan limit can only be checked in a window: the window-run driver now presses the three views, the Home key, Escape on a moved and an unmoved camera, drags the pan to its limit, and checks Home follows the screen that is open. That run waits for Edwin's word. 789 node tests pass.
