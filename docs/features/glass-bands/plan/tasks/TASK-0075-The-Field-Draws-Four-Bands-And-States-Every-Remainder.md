---
type: "[[task]]"
id: TASK-0075
aliases: ["TASK-0075"]
title: "The field draws four bands and states every remainder: the outer field's cards, detail from apparent width, the bar's sentence carrying all four counts, and the shape recomputed only on a view or workspace change"
status: done
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
- A outer-field card is smaller than a mid-band card and shows less of its note, and both facts follow from the shape and the detail function rather than from a branch in the renderer.
- The bar names every non-zero remainder, including the quiet band's, and names none that is zero.
- The compass shows the quiet band's count and its remainder as two numbers.
- Zooming in on a mid-band card shows its face line and its owed verb; zooming further shows its status, its progress and its face's properties.
- At 1× on a large workspace, the front and mid bands are drawn exactly as they are today.
- On this repository the quiet band's tiles are larger than today and its depth is unchanged.
- Marking a note fixed while the field is on screen moves that note and leaves every band's shape as it was; switching view recomputes the shapes.
- A card keeps its element across a view switch, as [[PHASE-0002-Glass]] exit criterion 2 requires.
- The orbit draws exactly what it draws today, at every zoom.

## Steps

- [x] Draw `outer` slots as cards in `drawCards()` and stop treating "not `deep`" as "front or mid".
- [x] Set `data-detail` in `paintCard` and move the "Detail by distance" CSS onto it; add the **more** level's rules.
- [x] Extend the bar's overflow sentence to four bands, and the compass to the quiet band's count and remainder.
- [x] Recompute the shapes where the view or the workspace changes, and nowhere else; state in the Outcome which call sites those are.
- [x] Check every `slot.band === 'deep'` and `slot.band !== 'deep'` in `glass.ts` against the fourth band, one at a time. There are several, and each means either "not an element" or "on the canvas", which are no longer the same question.
- [x] Leave every `arrangement === 'orbit'` guard as it is.
- [x] Record in the Outcome what the bar's sentence actually reads on each of the three workspaces.

## Notes

`paintCanvas()` keeps drawing the quiet band's tiles. What changes there is their size, which comes from the shape, and their number, which comes from the capacity.

The tile count the measurement reports (`mostTiles`) is now a count of the quiet band's tiles only; the outer field's cards are counted as elements. [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]] needs both numbers, so keep them separate.

## Outcome

**Done 2026-09-12. The field now draws four bands, each card in its band's own box at the detail its width on screen earns, and every band says how many of its notes it could not place.** 461 checks passing, both typechecks clean. What still needs a real window is [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]'s: zooming a mid card, a card keeping its element across a view switch, and the orbit drawing what it draws today.

### What the bar actually reads, on each workspace

| workspace | front | middle | outer field | quiet | the sentence |
|---|---|---|---|---|---|
| this repository | 0 | 13 | 0 | 0 | *(empty — nothing was counted)* |
| Your Trainer, Features | 3 | 40 | 64 | 24 | "and 186 more in the middle — all listed in the navigator" |
| Your Trainer, Issues | 12 | 40 | 23 | 326 | "and 27 more in front — all listed in the navigator" |

The quiet band's tiles are 140 × 39 on this repository and on Your Trainer's Features view, and 108 × 30 on its Issues view — against 58 × 16 before. No workspace in the fixtures reaches the quiet band's capacity, so the sentence's fourth clause is not exercised by real data yet; the constructed check in [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]] covers it.

### The outer field's capacity was raised to 64 after reading those numbers

At the 40 the plan started from, Your Trainer's Features view placed 40 in the outer field and counted 210 — the fourth band helped 40 of 250 notes, which is not much of an answer to [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]]. The default is now the geometry's own 64 slots, which is what [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]] said it should be. The middle holds back 24 spares against a pane covering its slots; the outer field does not, because it exists to place what the middle had no room for, and a pane over its slots is already counted by `Assignment.outerOverflow` the way the front band's is.

**186 notes on that view are still counted rather than drawn, and that is worth Edwin's eye.** It is ADR-0005's rule working — place what fits, say the rest — and it is the same treatment the front band has always had. But a view of 317 notes where 186 are a number rather than a card is a different experience from one where 27 are, and whether the outer field should gain layers the way the quiet band has is a question this task does not answer. Recorded here rather than decided.

### Where the shapes are recomputed

One place: `redeal()` in `desktop/src/renderer/glass.ts`, when `${workspaceId}|${view.id}` differs from the last deal's. Not on new groups — the sidecar re-sends those whenever anything changes, so keying on them would reshape the shelf every time an issue was marked fixed, which is exactly what decision 5 forbids. `FieldModel.setShapes` holds them, so every deal, turn, zoom and pane move after that uses the same shapes.

### Every `deep` branch in the renderer, checked one at a time

There were seven, and they did not all mean the same thing.

| where | what it meant | what it means now |
|---|---|---|
| `orbitGroups` | not a near orbit card | unchanged — the orbit assigns its own slots and never produces `outer` |
| `counts()` | a tile on the canvas | unchanged; [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]] splits painted from promoted |
| `drawCards` | no element | correct already: `outer` is not `deep`, so outer-field cards got elements without a change |
| `paintCanvas` | painted, not an element | unchanged, and the tile's size now comes from the shape |
| two in `paintOrbit` | orbit dots | unchanged, both inside `arrangement === 'orbit'` |
| the compass | the quiet band's count | unchanged, and the remainder stands beside it |

Every `arrangement === 'orbit'` guard is where it was.

### Two things the acceptance did not name and the code needed

**`obstaclesFor` listed two depths.** A pane was an obstacle at the front band's depth and the middle's, so an outer-field card could be drawn under a held note — [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]'s rule, broken at the one depth nothing had tested. It now takes the shapes and covers all three, using each band's own box width. The existing ISS-0058 check did not catch it until it was extended to deal the outer field, which is recorded in [[TST-0041-The-Slot-Geometry-Places-Every-Note-And-Keeps-Obstacles-Clear]].

**The reach's wire anchored on `CARD_BOX`.** It now anchors on the box of whichever band the reached note stands in, or the front band's when it has none.

### The `more` line is built as elements, not as markup

A note's own title, status and frontmatter reach that line, and the field has never put note text through `innerHTML`. It is assembled with `createElement` and `textContent`.

### Four breaks, all caught

| The break | What failed |
|---|---|
| 1. Detail keyed to the band again, the `[data-band="mid"]` selector restored. | 2 checks in the stylesheet suite |
| 2. The `more` level's rule renamed, so zooming stops at `full`. | 2 checks |
| 3. A pane is no obstacle at the outer field's depth. | the ISS-0058 check — **only after it was extended**; it passed the break before that |
| 4. A deal works the shapes out again instead of using the ones it was given. | "a deal that moves one note between bands does not re-lay the field" |