---
type: "[[task]]"
id: TASK-0068
aliases: ["TASK-0068"]
title: "An opened note moves to the middle: its card grows into a pane where it stood, the pane moves to the middle, the other held notes wait in a dock, the field dims, and Escape leaves before it sweeps"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "Edwin 2026-09-11: 'the opened up item should replace the note (possibly move to the center??'"]
parent: "FEAT-0017"
effort: "M"
due: ""
depends: ["TASK-0067", "TASK-0064"]
blocks: ["TASK-0069"]
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[DES-0002-The-Glass-Cockpit]]", "[[FEAT-0010-Lifting-A-Note]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[TASK-0060-Hide-Notes-And-Show-Them-Again]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# An opened note moves to the middle

## Objective

A lifted note's card grows into a pane where the card stood, and then the pane moves to the middle of the field. Other held notes wait as headers down the left edge, and the rest of the field dims and steps back. Escape takes the pane out of the middle, and a second Escape sweeps the desk as one Escape does today. This task builds the middle and the dock; the ring around it is [[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]].

## Detail

**Which note is in the middle** ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]], decision 2). The window keeps one switch, beside the turn and the zoom in `GlassField`: whether the middle is in use. When it is on, the focus is the last card of the drawn desk (`hooks.desk(state)`, the store's stacking order). Nothing is dispatched to record it and no store field is added.

- **Turned on by:** a lift (`lift()`), a click on a mini note (TASK-0069), and bringing a pane forward. Bringing forward is a press on a docked header or a pane released without moving, or Enter on its header; it dispatches `raise-card` and focuses the note in the reader's state, as a lift of a held note does today.
- **Turned off by:** Escape, Hide notes, widening the focus (`W` or ⇥), dragging the focus pane's header, × on the focus pane, a view switch and a surface switch. When the focus note leaves the desk for any reason, the switch goes off.

**Stage one, 300 ms.** The pane appears over the card's projected rectangle and grows to the focus size from there. In the orbit the start is the dot. A note whose card is not in sight starts from the middle and fades in. The slot keeps its dashed outline.

**Stage two, 700 ms.** The pane moves to the rectangle [[TASK-0067-The-Ring-Is-A-Pure-Layout]] gives for the field and the dock, eased slow at both ends. The pane's stored `x`, `y`, `w` and `h` are never written: the middle is a place the painter chooses, as it already chooses a clamped place (`paneRect()`). Its resize handle is hidden while it is the focus.

**The dock** (decision 11). While the middle is in use, every other held note is drawn as its header only, 34 px high, stacked from the top of the field's left edge in stacking order, at the dock width TASK-0067 chose. The header keeps its id, status, face and tools. A drag on a docked header moves nothing and changes no stacking: `grabPane()` raises on press today, and while the middle is in use it waits for the release and raises only when the pointer did not move. The same holds for the body press that raises a pane ([[TASK-0054-A-Held-Note-Is-A-Pane]], ISS-0066).

**The rest of the field** (decision 9). Drawn at 0.85 of the person's zoom about the middle of the field, with [[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]'s transform, so hit tests stay right, and at lower opacity. While the middle is in use `redeal()` keeps the deal it had when the focus opened; a store change redraws the panes and does not deal the field again. A click on a dimmed card lifts that note, and it becomes the focus.

**Leaving** (decision 10). The pane returns from the middle to its stored place over 300 ms, the dock's headers become panes at their stored places, the field returns to the person's zoom and full opacity, and the field is dealt once for the notes still held, by today's rule. The turn to face the neighbourhood that a lift makes today (`faceOnArrival` in `redeal()`) happens here instead.

**Escape** (decision 12). The document's Escape handler in `wire()` calls `sweep()` today. It leaves the focus when the middle is in use and sweeps otherwise, with the same guards against text fields.

**Hide notes** (decision 15). `setHidden(true)` leaves the focus first.

**Reduced motion** (decision 16). Both stages and leaving are cuts; the pane is highlighted for a moment with the highlight Glass already uses.

## Acceptance

- A real click on a front card: within 300 ms a pane stands over the card's place; at 1000 ms it is inside the rectangle TASK-0067 gives; the slot is a dashed outline.
- The store's desk after the lift is what it is today: the card at the place `nextPanePlace()` gives. The pane's stored place and size never change while it is in the middle.
- With two notes lifted, the second is in the middle and the first is a header in the dock. A click on that header, or Enter on it, swaps them. A drag on it moves nothing and changes no stacking.
- While the middle is in use, the field's cards are drawn smaller and dimmer, and the count of slot assignments does not change across store broadcasts.
- A click on a dimmed card lifts that note into the middle.
- Escape once: nothing in the middle, every pane at its stored place and size, the field dealt for the held notes and turned to face them. Escape again: the desk is swept, as today.
- Hide notes, `W`, dragging the focus pane's header, × on it, a view switch and a surface switch each leave the focus. After the drag the pane is where it was dropped.
- Under reduced motion no frame falls between the card and the pane in the middle, and the pane is highlighted.
- A reload shows every pane at its stored place and nothing in the middle. No new store action and no new `DeckState` field exist.
- A lift from the navigator with Enter opens the middle.

## Steps

- [x] Add the window's switch and the rule for which note is the focus to `desktop/src/renderer/glass.ts`.
- [x] Draw the two stages for the pane in `paintPane()`, from the card's, the dot's or the middle's rectangle, with the reduced-motion cut.
- [x] Draw the dock; change the press on a pane or a header to raise on a still release while the middle is in use.
- [x] Draw the field at 0.85 of the zoom and lower opacity, and keep the deal while the middle is in use.
- [x] Make Escape leave before it sweeps; make Hide notes, widen, a header drag, ×, a view switch and a surface switch leave.
- [x] Move the turn a lift makes to the moment of leaving.
- [x] Leave the smoke checks to [[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]], which lists them.
- [x] Append to [[DES-0002-The-Glass-Cockpit]], at the end of the section "The desk, and the two surfaces" and without changing any other line, this paragraph: "**Revisited 2026-09-11, at Edwin's request ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]], [[REFERENCE-FOCUS-ZOOM-AND-VERBS]]).** Edwin asked that a note opened in Glass or the orbit stand in the middle with the notes it is joined to around it, which is close to rev 1's 'opening re-arranges the field around the note'. This section dropped that because it 'does not survive a second note and collapses at three'. The answer built on 2026-09-11: only the note on top of the desk stands in the middle, every other held note waits as a header in a column at the field's left edge, and bringing one forward swaps it into the middle. The field is not re-arranged; it dims, steps back and keeps its slots, so the split between the field and the desk stands. The neighbours sit on a ring sized from the note's pane so that none can overlap it, which answers the defect rev 5 fixed by moving them into columns. Rule 3 changes in one respect: Escape first takes the note out of the middle, and a second Escape sweeps."
- [x] Append to [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]], after its acceptance list, this paragraph: "**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** A lift now also puts the note in the middle of the field. While a note is there, one Escape takes it out of the middle and a second Escape puts back every note; with nothing in the middle, one Escape puts back every note as before. 'No field card is dealt underneath a held note' holds whenever nothing is in the middle; while a note is, its pane and the ring around it lie over the dimmed field on purpose."
- [x] Append to [[TASK-0054-A-Held-Note-Is-A-Pane]], at the end of its Outcome, this paragraph: "**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** While a note is in the middle of the field, it is drawn there at the focus size and cannot be resized, and dragging its header takes it out of the middle to where it is dropped. Every other held note is drawn as its header in a column at the field's left edge. A press on such a header or pane brings it forward only when released without moving, so a drag never swaps the note in the middle. Each pane's stored place and size are unchanged, and are where it is drawn once nothing is in the middle."
- [x] Append to [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], at the end of "Where this stands", this paragraph: "**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** Hide notes first takes a note out of the middle of the field, if one is there, and then hides every pane. Showing the notes again does not put one back in the middle."

## Notes

The rev 3 lesson of DES-0002 applies to every press here: the checks drive real pointer events through `sendInputEvent`.

## Outcome

**Done 2026-09-11.** The middle is a switch in the window (`focusOn`), and the note in it is the top of this window's desk (`focusId()`). A lift, Enter on a pane's header, a click on a docked header and a click on a mini note open it; the pane grows from where the card stood for 300 ms (from the dot in the orbit, from the middle for a note not in sight) and moves to the layout's rectangle for 700 ms. The pane's stored place never changes. Other held notes are headers in the dock; a press there brings the note forward only when released without moving. The field is drawn at 0.85 of the zoom and dimmed, and is not dealt while the middle is in use (`redeal()` returns early; `turnEnd()` and `paneObstacles()` do nothing). Escape leaves the middle, dealing the field once and turning to face the neighbourhood; a second Escape sweeps. Hide notes, `W`, dragging the header (the pane lands where dropped), ×, a view switch, a surface switch and Spread or List all leave. Under reduced motion the opening is a cut and the pane and ring are highlighted. A reload shows nothing in the middle, and the store gained no key. The amendments are on [[DES-0002-The-Glass-Cockpit]], [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]], [[TASK-0054-A-Held-Note-Is-A-Pane]] and [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]].
