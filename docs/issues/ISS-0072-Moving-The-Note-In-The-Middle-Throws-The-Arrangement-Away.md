---
type: "[[issue]]"
id: ISS-0072
aliases: ["ISS-0072"]
title: "Dragging the note in the middle ends the arrangement instead of carrying it: the ring is discarded, the whole field is dealt again and turns, so one small drag moves every card on screen"
status: "open"
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: "2026-09-12"
source: ["Edwin 2026-09-12, running Deck: 'The user might move the note but that then means that the associated notes should also move with it ...'; 'the notes circling the note now all of a sudden change back to normal notes and are showed around the note (they might overlap with existing notes already visible in that location)'"]
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]", "[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# Moving the note in the middle throws the arrangement away

## Problem

**A drag of a few pixels on the opened note ends the whole arrangement.** The ring disappears, the field is dealt again with the neighbourhood pushed into the front band, and the view turns to face it, so a person who meant to nudge one note sees every card on screen move. Edwin's reading is the opposite one: the opened note and the notes around it are one thing, and moving the note moves the group.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "The user might move the note but that then means that the associated notes should also move with it ..."
> "Also the notes circling the note now all of a sudden change back to normal notes and are showed around the note (they might overlap with existing notes already visible in that location)"

## Cause

The pane header's drag handler in `desktop/src/renderer/glass.ts` calls `this.leaveFocus()` on the first pointer move past the click slop. `leaveFocus()` does three things: it drops the focus state and clears the ring, it sets `faceOnArrival` so the field will turn, and it calls `redeal(true)`. The re-deal puts the neighbourhood in the front band and gives every other note a fresh slot, which is where the second half of the report comes from — the ring notes do not stay where they were, they are dealt as ordinary field cards wherever the deal puts them, on top of whatever was standing there a moment before.

The task note is explicit about it: FEAT-0017 decision 13 says a drag of the note in the middle leaves the middle and the pane lands where it is dropped. So this is a decision working as written, not a defect in the code — and it is the decision Edwin is now rejecting.

## Repro

1. `cd desktop && npm start`, Glass surface, click a note with neighbours and let it settle in the middle.
2. Drag its header 20 pixels to the left.
3. The ring vanishes, the field turns, and the neighbours reappear as full cards in the front band.

## Expected

The ring is a rigid group. Dragging the opened note moves the ring with it, at the same offset; the lines between the note and its neighbours keep their lengths; and the arrangement is still the arrangement when the drag ends. Leaving the middle stays an explicit act — Escape, ×, or opening another note — not a side effect of moving.

## Actual

The first pixel of the drag ends the arrangement and re-deals the field.

## What to settle before this can be built

1. **Where the group may go. Answered 2026-09-12: neither option.** Edwin rejected clamping and rejected folding — "Neighbours / notes in general can fall of the edge and move out of vision ... there should be a huge space to play with". So a note dragged off the screen is still there, off the screen, and a person turns or drags to find it again. That makes one thing owed that neither original option needed: **a way back.** With nothing clamped, an arrangement can be dragged entirely out of sight and the window shows an empty field. The compass already resets the zoom and already counts what is behind; the cheapest honest answer is that it also names the note in the middle and returns to it, and that Escape still works from anywhere.
2. **Whether the offset survives.** A moved arrangement is per-window state like the yaw and the zoom: not in the address, not persisted. Say so, or it will be asked again.
3. **What a re-layout does.** The ring is worked out afresh whenever the field size, the dock or the neighbour count changes. If the group has been moved, that re-layout must keep the offset rather than snapping the note back to the middle.
4. **Resizing.** The same argument applies to the corner: growing the note should push the ring out, not end the arrangement. Today a resize is untested against the middle at all.

This issue changes a decision in a feature at `review`, so it belongs to [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]] and its decision 13 must be rewritten rather than merely overridden in code.

## Evidence

- `desktop/src/renderer/glass.ts`, the header drag's `move` handler: "Dragging the note in the middle leaves the middle, and the pane lands where it is dropped (decision 13)", then `this.leaveFocus()`.
- `desktop/src/renderer/glass.ts`, `leaveFocus()`: `dropFocus(); this.faceOnArrival = this.held.length > 0; this.redeal(true);`.
- `desktop/src/shared/focus-ring.ts`, `focusLayout`: `const centre = { x: (area.x0 + area.x1) / 2, y: (area.y0 + area.y1) / 2 };` — the middle of the field, with no offset.
- Read on 2026-09-12 by the main session while Edwin had Deck running.

## Sibling search

No sibling found (searched `docs/issues/` for "drag", "middle", "ring", "arrangement").

## Risk scan

No trigger applies: no new dependency, env var, path or exposure. A dragged group re-lays the ring while the pointer is down, so it should be measured against [[PHASE-0002-Glass]]'s frame-rate criterion.

## Next Actions

- [x] **Edwin confirmed the drag carries the ring, 2026-09-12, and rejected both options at the field's edge: nothing is clamped and nothing is folded away.** Recorded below.
- [ ] Settle with [[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]] whether the arrangement is anchored to the cylinder or to a plane of its own; the two answers are one decision and neither can be built first.
- [ ] Then FEAT-0017's decision 13 is rewritten and tasks follow: an offset in `focusLayout` (pure, with its suite), the drag handler moving the group, a way back to a note the person has dragged out of sight, and a smoke check that drags the note in the middle and finds the ring still drawn with every neighbour at the same offset.

## Decision record

> [!note] Accept — 2026-09-12 (user:edwin)
> Neighbours / notes in general can fall of the edge and move out of vision ... there should be a huge space to play with.
