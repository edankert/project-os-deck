---
type: "[[task]]"
id: TASK-0076
aliases: ["TASK-0076"]
title: "Anything visible is clickable, on the canvas too: a hit test for the quiet band's tiles, a cursor and a callout under the pointer, and a roving tab stop that walks the shelf"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "[[DES-0002-The-Glass-Cockpit]] rev 1: 'quiet cards carried pointer-events: none ... Fixed by making anything visible clickable.'"]
parent: "FEAT-0018"
effort: "M"
due: ""
depends: ["TASK-0075"]
blocks: ["TASK-0077"]
related: ["[[TASK-0004-Landing-Opens-The-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0010-Lifting-A-Note]]", "[[TASK-0031-The-Field-Renders-And-Turns]]"]
tests: ["[[TST-0056-Every-Note-Is-Somewhere-And-A-Finished-Note-Can-Be-Pulled-Forward]]"]
---

# Anything visible is clickable, on the canvas too

## Objective

**A finished note is drawn and cannot be opened, hovered, tabbed to or pulled forward.** It is a rectangle painted on the field's canvas, and the only canvas hit test Deck has, `dotAt`, is guarded by `this.arrangement === 'orbit'` at both of its callers. So the orbit got the hit test the field never did. This task carries DES-0002's rule — anything visible is clickable — onto the canvas.

**This is a regression, not an open question.** DES-0002's first revision hit the identical defect by a different route and fixed it with that rule. Deck reintroduced it by drawing the band on a canvas instead of giving quiet cards `pointer-events: none`, and the rule was not carried across.

## Detail

**`tileAt(x, y)` beside `dotAt`.** The projection of every quiet slot is already computed every frame in `paintCanvas()`; the hit test reads the same projections, skips slots that are not visible, and returns the nearest tile whose rectangle contains the point, or null. `dotAt` is the model to copy, including its ordering rule.

**The field's `pointerup` gains the rule the orbit already has:** a click on a tile is a click on that note, and it lifts the note exactly as clicking a card does. The existing guards stay: a click that ends a turn is not a click on a note, and a click that lands on a pane or a card is theirs.

**`pointermove` gives the tile under the pointer a cursor and a callout.** The pointer becomes a pointer cursor over a tile, and the callout says which note it is — an id and a title is enough, and it is the same information the card's **brief** detail level shows. A 58 by 16 rectangle at the back of a third layer is a small target, so the tile under the pointer may also grow; that costs one more canvas pass and is the implementer's call, recorded in the Outcome.

**The keyboard gets a roving tab stop, not a thousand.** One tab stop for the quiet band. Arrow keys move along the shelf, row by row and column by column, the field turns to keep the cursor in sight, and Enter lifts the note under it. Escape leaves the band. A thousand tab stops is not a keyboard route, and leaving the band out of the tab order entirely is exactly as bad by keyboard as by mouse.

**The navigator stays the other route.** It already lists every note the view holds, including what no band placed. Nothing here replaces it.

**No new gesture brings a note forward.** [[FEAT-0014-The-Hands]]'s pull already does that, and it survives a view switch. A quiet-band tile becomes draggable and pullable the moment it can be hit at all, which is what answers Edwin's "allow cards to be brought up to the active front band".

**Watch the cost.** The hit test runs on every `pointermove` over as many as a thousand tiles. `dotAt` solved the same problem; follow it, skip invisible slots first, and if the profile says so, index the tiles by screen row once per frame. [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]] measures a turn with the pointer moving.

## Acceptance

- Clicking a tile in the quiet band lifts that note, and the note is then on the desk.
- The cursor over a tile is a pointer cursor, and over the empty field it is not.
- Resting on a tile says which note it is.
- A click that ends a turn does not lift a note; a click on a pane or a card still belongs to it.
- Tab reaches the quiet band, the arrow keys move along it, the field turns to keep the cursor visible, Enter lifts the note and Escape leaves the band.
- The quiet band adds exactly one tab stop, whatever it holds.
- A note in the quiet band can be pulled to the front band with the existing gesture, and it is still in front after a view switch.
- In the orbit, `dotAt` still answers and `tileAt` is never consulted; the orbit's clicks land exactly as they do today.
- A `pointermove` across a full quiet band on the largest workspace does not cost a frame; the number is in [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]].

## Steps

- [ ] Write `tileAt` in `desktop/src/renderer/glass.ts`, modelled on `dotAt`.
- [ ] Wire it into the field's `pointerup` and `pointermove`, behind the arrangement guard that keeps the orbit on `dotAt`.
- [ ] Add the cursor and the callout, and decide whether the tile under the pointer grows.
- [ ] Add the roving tab stop, its arrow-key walk, its turn-to-follow and its Enter and Escape.
- [ ] Check that `tabStops`, counted today over the cards `drawCards` made, now accounts for the band's single stop.
- [ ] Record in the Outcome what a `pointermove` across a full quiet band costs.

## Notes

[[TASK-0004-Landing-Opens-The-Note]] is the orbit's version of this and is the reference for the click rule.

Once [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]] lands, a promoted tile is an element and needs none of this. The hit test is for tiles that are still tiles, which on a large workspace is most of them.
