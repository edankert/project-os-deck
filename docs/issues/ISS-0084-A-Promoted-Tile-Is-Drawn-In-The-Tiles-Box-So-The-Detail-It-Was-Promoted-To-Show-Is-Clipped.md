---
type: "[[issue]]"
id: ISS-0084
aliases: ["ISS-0084"]
title: "A quiet tile promoted into a real card is laid out in the tile's box and only magnified, so the detail the promotion exists to show has no room and is clipped"
status: open
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: 2026-09-17
source: ["Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17"]
severity: medium
component: renderer
parent: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]", "[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]"]
tests: []
---

# A promoted tile is drawn in the tile's box

## Problem

**Zoom in until a finished note becomes a real card and the card is the wrong size for what it is asked to draw, so its text is cut off.**

`place()` in `desktop/src/renderer/glass.ts:927` sets the element's width and height from `this.model.current.shapes[slot.band].box`, which for a promoted quiet note is the tile's box. Zoom is then applied by `cardTransform` as a CSS `scale()`, which magnifies what was laid out and does not give it more room. So the element's layout box stays at the quiet band's size however far a person zooms in, while `element.dataset['detail']` is set from `p.scale * box.width` and therefore says `full` — the promotion threshold and the `full` threshold are the same 130 pixels.

The result is full detail asked of a tile-sized box. `.field-card` carries `padding: 6px 9px` and `overflow: hidden` in `desktop/src/renderer/deck.css`, and no rule targets `.field-card[data-band="deep"]`. On this repository's shelf the element is 140 by 39 with 27 pixels of content space, asked for an id row, a title, a face line and an owed verb; the face line has `margin-top: auto` and is clipped. On a large shelf, where only the edge tiles promote, the element is 58 by 16 with 12 pixels of vertical padding and nothing fits at all.

This sits against [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]'s acceptance line "a promoted card is still dimmed and still reads as finished work". A card whose title and face are cut mid-line does not read as anything.

The smoke check for promotion asserts only that such an element exists (`document.querySelectorAll('.field-card[data-band="deep"]').length > 0`), which is why it passed.

## Expected

A promoted card is laid out at the size its promotion earned, so the detail `detailFor` asks for has room to be drawn.

## Evidence

Reproduced by reading the source.

- `desktop/src/renderer/glass.ts:927` — `const box = this.model.current.shapes[slot.band].box;` then `element.style.width = ...box.width...` and `element.dataset['detail'] = detailFor(p.scale * box.width);`
- `desktop/src/shared/slots.ts:493` — `cardTransform` ends in `scale(${p.scale})`, a visual magnification of the laid-out box.
- `PROMOTE_AT = DETAIL_AT.full` in `desktop/src/shared/detail.ts:68`, so a note is promoted at exactly the width that asks for full detail.

## Risk scan

No trigger applies.

## Next Actions

- [ ] Lay a promoted card out at the box its apparent width earns rather than at the quiet band's box, and add a check that a promoted card's content fits.

## Where this stands

**2026-09-17: fixed in the pure layer and verified there; the renderer half is not yet verified by a run.** [[TASK-0084-A-Promoted-Card-Is-Laid-Out-At-The-Size-Its-Promotion-Earned]] put `MIN_BOX_FOR`, `holdsDetail` and `promotedBox` in `detail.ts` and gave `place()` the exception. Three checks in [[TST-0055-Detail-Follows-Apparent-Size]] assert the rule and all three fail when the fix is reverted. The two smoke checks that measure a real promoted card have not been run. This stays `open` until a run settles that half.
