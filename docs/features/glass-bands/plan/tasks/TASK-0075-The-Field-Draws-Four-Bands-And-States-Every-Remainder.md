---
type: "[[task]]"
id: TASK-0075
aliases: ["TASK-0075"]
title: "The field draws four bands and states every remainder: the outer field's cards, detail from apparent width, the bar's sentence carrying all four counts, and the shape recomputed only on a view or workspace change"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]]", "[[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]"]
parent: "FEAT-0018"
effort: "L"
due: ""
depends: ["TASK-0072", "TASK-0073", "TASK-0074"]
blocks: ["TASK-0076", "TASK-0077"]
related: ["[[TASK-0031-The-Field-Renders-And-Turns]]", "[[TASK-0032-A-View-Switch-Re-Arranges]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
tests: ["[[TST-0056-Every-Note-Is-Somewhere-And-A-Finished-Note-Can-Be-Pulled-Forward]]"]
---

# The field draws four bands and states every remainder

## Objective

The renderer draws what the three pure modules now say: a fourth band of cards between the middle and the quiet band, each band at the shape its population earned, each card at the detail its apparent width earned, and each band's remainder in the sentence the bar already writes.

## Detail

**The outer field is drawn as cards, not tiles.** `drawCards()` in `desktop/src/renderer/glass.ts` today skips every slot whose band is `deep`; it now skips only `deep`, and `outer` slots get elements like `front` and `mid`. They are smaller and less detailed because the shape and the detail function say so, not because the renderer has a rule about them.

**Detail comes from apparent width.** `paintCard` sets `element.dataset['detail']` from `detailFor(p.scale * CARD_BOX.width)` beside the `data-band` it already sets. The two CSS rules in `desktop/src/renderer/deck.css` under the comment "Detail by distance" move from `[data-band="mid"]` onto `[data-detail]`, and the **more** level gains rules for the status, the progress and the face's properties. `data-band` stays, because the fog and the dimming read it.

**The bar states four remainders.** It today prints "and N more in front, N more in the middle — all listed in the navigator". It now carries the outer field's and the quiet band's too, in the same sentence and the same shape, and says nothing about a band whose remainder is zero. A quiet band that could not place everything is a first: the sentence has to read plainly, not as an apology.

**The compass keeps the quiet band's count and gains its remainder.** It prints "N in the quiet band · N out of sight". The quiet band now has a capacity, so the count and the remainder are different numbers and both belong there. [[PHASE-0002-Glass]] exit criterion 1 names this line; its wording is Edwin's, and this task does not edit the criterion.

**The shape is recomputed on a view change and on a workspace change only.** Not on a deal that moved one note, not on a turn, not on a zoom, not when a pane moves. `FieldModel` counts its deals already (`assignments`), and the same discipline applies here: the shape is an input to a deal and is recomputed above it. A note marked fixed while a person watches moves that note and reshapes nothing.

**Nothing about the orbit changes.** It assigns its own slots, never calls `dealField`, and paints through `paintOrbit`. Every guard on `this.arrangement === 'orbit'` stays exactly where it is.

## Acceptance

- A note the middle had no room for is drawn, as a card, at a depth between the middle's and the quiet band's.
- A far-band card is smaller than a mid-band card and shows less of its note, and both facts follow from the shape and the detail function rather than from a branch in the renderer.
- The bar names every non-zero remainder, including the quiet band's, and names none that is zero.
- The compass shows the quiet band's count and its remainder as two numbers.
- Zooming in on a mid-band card shows its face line and its owed verb; zooming further shows its status, its progress and its face's properties.
- At 1× on a large workspace, the front and mid bands are drawn exactly as they are today.
- On this repository the quiet band's tiles are larger than today and its depth is unchanged.
- Marking a note fixed while the field is on screen moves that note and leaves every band's shape as it was; switching view recomputes the shapes.
- A card keeps its element across a view switch, as [[PHASE-0002-Glass]] exit criterion 2 requires.
- The orbit draws exactly what it draws today, at every zoom.

## Steps

- [ ] Draw `outer` slots as cards in `drawCards()` and stop treating "not `deep`" as "front or mid".
- [ ] Set `data-detail` in `paintCard` and move the "Detail by distance" CSS onto it; add the **more** level's rules.
- [ ] Extend the bar's overflow sentence to four bands, and the compass to the quiet band's count and remainder.
- [ ] Recompute the shapes where the view or the workspace changes, and nowhere else; state in the Outcome which call sites those are.
- [ ] Check every `slot.band === 'deep'` and `slot.band !== 'deep'` in `glass.ts` against the fourth band, one at a time. There are several, and each means either "not an element" or "on the canvas", which are no longer the same question.
- [ ] Leave every `arrangement === 'orbit'` guard as it is.
- [ ] Record in the Outcome what the bar's sentence actually reads on each of the three workspaces.

## Notes

`paintCanvas()` keeps drawing the quiet band's tiles. What changes there is their size, which comes from the shape, and their number, which comes from the capacity.

The tile count the measurement reports (`mostTiles`) is now a count of the quiet band's tiles only; the outer field's cards are counted as elements. [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]] needs both numbers, so keep them separate.
