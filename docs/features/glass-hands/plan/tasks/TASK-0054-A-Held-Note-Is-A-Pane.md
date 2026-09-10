---
type: "[[task]]"
id: TASK-0054
aliases: ["TASK-0054"]
title: "A held note is a pane: moved, resized and stacked on the front plane by hand, its header always readable, and its place kept in the desk record Spread already saves"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[FEAT-0014-The-Hands]]", "[[REFERENCE-GLASS-PHASE-REVIEW]]", "[[DES-0002-The-Glass-Cockpit]]"]
parent: "FEAT-0014"
effort: ""
due: ""
depends: ["TASK-0035"]
blocks: ["TASK-0055"]
related: ["[[FEAT-0014-The-Hands]]", "[[FEAT-0010-Lifting-A-Note]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0030-The-Slot-Geometry]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[TASK-0025-Cards-Are-Dragged-And-Removed]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]"]
tests: []
---

# A held note is a pane

## Objective

A note lifted in Glass is a pane on the front plane. A person drags it where they like, resizes it, and stacks it on other panes. Its header is always readable and a click on the header raises it. Where the pane is and how big it is are kept in the desk record Spread already saves, so the two surfaces show one arrangement and a restart puts the panes back.

## Detail

**The plan lifted a note and left it where the renderer put it.** [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]] takes a note out of the field onto the desk and puts it back, and says nothing about moving it. DES-0002's desk section had three rules that make held notes something a person arranges, and this task builds them: overlap anywhere except a header, with a pane that would cover another's header snapping below it; every pane in a stack of any depth shows its id, status and face, always readable and always clickable; a click on a header brings that pane to the top. A stack of eight is eight headers and one body.

**The record is the desk Spread saves.** `DeskCard` in `desktop/src/shared/types.ts` carries `x` and `y` already, written by Spread's drag ([[TASK-0025-Cards-Are-Dragged-And-Removed]]). A pane's position is that same pair, mapped onto the front plane by Glass and onto the desk by Spread, so moving a note in one surface moves it in the other. Size is new: an optional width and height on the same record, which Spread may ignore until it wants them. If honouring the size turns out to change Spread's own behaviour, that is an issue against [[FEAT-0005-Spread-Cards-On-A-Desk]], not a widening here.

**The reader's width is answered here rather than left open.** The DES-0002 review measured the design's note window at 300 by 176 pixels and said a reader needs a minimum size or a reading column, and the glass-desk plan left that as an open question. A pane has a stated minimum width, chosen in this task and written here, below which it cannot be resized. And a pane offers a **widen** verb that takes it to a reading column: a fixed-width column at one side of the window that the slot geometry treats as an obstacle sector, so the field flows around it, and that a second widen on another pane replaces. The column's width is also written here when chosen.

**Panes are obstacles.** [[TASK-0030-The-Slot-Geometry]] already treats a held note as a sector no field card is dealt into. A moved or resized pane moves its sector, and assignment runs again when the drag ends, the same rule the design applies to a moved console.

## Acceptance

- A pane is dragged with a real pointer and lands where it was released; after a reload it is there; Spread shows the same note at the same position.
- A pane is resized by its edge, not below the stated minimum width; the size survives a reload.
- A pane dropped over another's header snaps below that header, and in a stack of any depth every header is visible and clickable.
- A click on a header raises that pane above the others.
- Widen takes a pane to the reading column, the field flows around the column, and widening another pane replaces the first.
- No field card is dealt under a pane at any position or size, checked over the slot geometry after a simulated move.
- Every move, resize, raise and widen is a store transition tested without Electron; the desk record with a size round-trips through the persister.
- Move, resize, raise and widen are reachable from the keyboard on the pane's header.

## Steps

- [ ] Add optional width and height to the desk record; confirm Spread's reducer and renderer ignore them cleanly.
- [ ] Draw held notes as panes with the header rule, drag, resize with the minimum width, and raise on header click; write the chosen widths here.
- [ ] Add the widen verb and the reading column as an obstacle sector; re-assign on drag end.
- [ ] Add the keyboard route on the header.
- [ ] Extend the smoke run: drag a pane, reload, find it; resize; stack two and click the lower header; widen.
- [ ] Write the automated test notes and link them from `tests:`.

## Notes

The rev 3 lesson of DES-0002 applies to every drag here: a `preserve-3d` container is an invisible pane in front of its children, and the check must use real pointer events rather than a synthetic click.
