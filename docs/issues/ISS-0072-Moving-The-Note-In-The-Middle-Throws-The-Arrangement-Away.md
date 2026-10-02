---
type: "[[issue]]"
id: ISS-0072
aliases: ["ISS-0072"]
title: "Dragging the note open in the middle of Glass by a few pixels makes its neighbours vanish and moves every card on screen"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-10-02
source: ["Edwin 2026-09-12, running Deck: 'The user might move the note but that then means that the associated notes should also move with it ...'; 'the notes circling the note now all of a sudden change back to normal notes and are showed around the note (they might overlap with existing notes already visible in that location)'"]
reported_by: user:edwin
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]", "[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[PHASE-0002-Glass]]", "[[TASK-0104]]", "[[DES-0003]]"]
tests: ["[[TST-0052]]", "[[TST-0045]]"]
---

# Dragging the opened note moves every card on screen

## Problem

**Dragging the note open in the middle by a few pixels makes its neighbours vanish, and every card on screen moves to a new place.** The ring disappears, the field is dealt again with the neighbourhood pushed into the front band, and the view turns to face it, so a person who meant to nudge one note sees every card on screen move. Edwin's reading is the opposite one: the opened note and the notes around it are one thing, and moving the note moves the group.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "The user might move the note but that then means that the associated notes should also move with it ..."
> "Also the notes circling the note now all of a sudden change back to normal notes and are showed around the note (they might overlap with existing notes already visible in that location)"

## Fixed, 2026-10-02

**Dragging the opened note now moves it with the cards gathered round it, keeps it open, and moves no other card.** Leaving the arrangement is an explicit act again: Escape, ×, Hide notes, filling the field with W, or switching view or surface. Built in `81d4632` (TASK-0104).

**The checks that show the defect gone** are in the `focus` part of the smoke run ([[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]), which drags the document's header 90 by 50 pixels with a real pointer in a real window. At `4243fc2` they read:

- "a drag of its header moves the document 90 by 50 in the store (466,16 to 556,66) and on screen, keeps the focus (ISS-0070: until TASK-0104 a drag left it) and changes no size".
- "every seated card keeps its place beside the document through the drag (16 cards; none shifted)". It compares each card's offset from the document before and after.
- "no card outside the neighbourhood moves because the document did: 3 cards are drawn exactly where they were (none moved) and the deal is the same deal".

If the defect came back, the first would report that the dragged note is no longer the focus, the second would find no cards seated, and the third would name the cards that moved and report a new deal. A fourth check starts from a fresh lift and requires that a drag does not leave the focus ("the dragged document is still the focus with its cards round it"). The scripted walk `glass-desktop` checked the same with 29 cards round the document.

**What was settled, against the four questions below.**

1. Where the group may go. The cards round the document run past the field's left and right edges and are not clamped. The document itself is drawn within the field's width, with its header in sight, while the desk faces the person: the store keeps the place a drag gave it and the drawing stops at the edge. This is not Edwin's answer of 2026-09-12 that nothing is clamped, and it is Edwin's to accept or change. A turn does carry the document and its cards out of sight together.
2. The way back. A button on the compass, reading "find" and the note's id, is offered when the desk is turned or moved away, and brings it back. A counter at each edge says how many related cards stand beyond it. Each row of the document's list shows where its card is. The smoke run presses all three.
3. Whether the place survives. The document's place is in the store, as every held note's is, so it survives a reload. The focus, the turn and the look aside are the window's and are not stored.
4. A re-layout and a resize. Dragging the corner keeps the focus and the cards make room: "the resized document is still the focus and its cards make room for it (15 seated, none over it)".

What is not shown:

- Nobody has walked [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]], and the ledger holds no verdict for it.
- No check was broken on purpose to see it fail. The checks were written after the fix.
- The frame time the risk scan below asks for was taken in the Linux container only, which draws in software, and while turning, not while dragging: with 217 cards seated, 16.7 ms between frames at the median and 33.4 ms at the 95th percentile. Nothing was measured on the Mac. That measurement is the open box in [[TASK-0104]].
- In the orbit a drag of the document was not driven.

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

## Implementation ownership

[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]] built the repair under FEAT-0017, together with ISS-0070 and ISS-0071. "Fixed, 2026-10-02" above says what shows it.

## Next Actions

- [x] **Edwin confirmed the drag carries the ring, 2026-09-12, and rejected both options at the field's edge: nothing is clamped and nothing is folded away.** Recorded below.
- [x] **Settled 2026-09-12, Edwin: "turning moves the note and the whole ring".** The arrangement is anchored to the cylinder, so the ring's places are bearings; a neighbour off the edge of sight is reached by turning, which is what "a huge space to play with" already means in Glass. Recorded in [[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]].
- [x] The way back: a control that names the note out of sight and returns to it. Built as a button reading "find" and the note's id, with the edge counters and the list beside it. It stands on the compass, as this box proposed. It brings the desk round to where the person faces and does not turn the field. Shown by the smoke run's `focus` checks "and "find" is offered for the note turned away from ("find PHASE-0002")" and ""find" brings the desk back", at `4243fc2`.
- [x] Then FEAT-0017's decision 13 is rewritten and tasks follow: the layout follows the document's place (pure, with its suite), the drag handler moves the group, there is a way back, and a smoke check drags the note and finds every neighbour at the same offset. Done as TASK-0104. FEAT-0017's rule is now the fourth of its interaction decisions, "Movement preserves the group". The layout takes the document's rectangle wherever it stands, which is what the box called an offset. The smoke check is quoted under "Fixed, 2026-10-02".

## Decision record

> [!note] Accept — 2026-09-12 (user:edwin)
> Neighbours / notes in general can fall of the edge and move out of vision ... there should be a huge space to play with.

## Checked against the code, 2026-09-19: still true, kept

This is the record of that day's check. The defect it confirms was fixed on 2026-10-02; see "Fixed, 2026-10-02" above.

**What a user notices:** A person nudges the opened note and the whole screen rearranges: the neighbours around it disappear and every card is dealt somewhere new. Edwin expects the neighbours to move with the note.

Evidence: `desktop/src/renderer/glass.ts:2901-2902` still calls `this.leaveFocus()` on the first move of a drag, with the comment citing decision 13. `glass.ts:2613-2620` (`leaveFocus`) still drops the focus, sets `faceOnArrival` and calls `this.redeal(true)`.

**Belongs to:** FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours (PHASE-0002-Glass). Bigger: it rewrites decision 13 and Edwin will want to see it. **Next:** Rewrite FEAT-0017's decision 13, then a task that moves the ring with the note and a way back to a note dragged out of sight, built together with ISS-0071.

Checked as part of project-os-dev FEAT-0036 (TASK-0141).
