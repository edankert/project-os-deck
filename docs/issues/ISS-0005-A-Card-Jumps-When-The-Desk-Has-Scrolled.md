---
type: "[[issue]]"
id: ISS-0005
aliases: ["ISS-0005"]
title: "A card jumps hundreds of pixels when it is dragged on a desk that has scrolled, because the clamp measures the window while the position measures the content"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["Independent review of the PHASE-0001 Spread work, 2026-09-07"]
severity: high
component: renderer
parent: ""
related: ["[[TASK-0025-Cards-Are-Dragged-And-Removed]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]"]
tests: ["[[TST-0019-The-Desk-Is-Chosen-And-Arranged]]"]
---

# A card jumps when the desk has scrolled

## Problem

**Take hold of a card near the bottom of a desk you have scrolled down, and it leaps up the moment you move the pointer.** The distance is the amount the desk is scrolled by, so on a desk scrolled down 500 pixels the card jumps about 500 pixels before it follows the pointer at all.

Two measurements disagreed. The drag builds a position in the desk's own content coordinates, adding the scroll offset, and then clamped that position against `clientWidth` and `clientHeight`, which measure the window onto the content rather than the content. A desk 400 pixels tall showing a card at y=825 clamped it to 352.

The desk does scroll. It is `overflow: auto`, and a card lands in the first free slot, which walks down the surface as more notes are put on it.

Found by the independent review of 2026-09-07, which reproduced it arithmetically against the real clamp rather than by dragging. It breaks the first thing [[TASK-0025-Cards-Are-Dragged-And-Removed]] promises: a card stays where it was released.

## Resolution

**Fixed 2026-09-07.** `deskBounds` in `desktop/src/shared/desk.ts` answers how much room a card may occupy, taking the larger of the window and the content in each direction, and both the drag and the paint clamp against that. A desk never shrinks below its own window, so the larger of the two is right whether the desk scrolls or not.

The check is in [[TST-0019-The-Desk-Is-Chosen-And-Arranged]], and it asserts the defect as well as the fix: a card at y=825 on a desk scrolled below its window stays at 825, and clamping the same card against the window alone still yields 352, which is the jump a person saw.
