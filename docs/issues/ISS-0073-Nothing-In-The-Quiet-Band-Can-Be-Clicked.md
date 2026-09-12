---
type: "[[issue]]"
id: ISS-0073
aliases: ["ISS-0073"]
title: "A finished note cannot be opened from the Glass field at all: the quiet band is painted on a canvas that no pointer or keyboard handler reads, so the several hundred done notes are visible and unreachable"
status: triage
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["Edwin 2026-09-12, running Deck: 'The completed issue notes you cannot select, they show as very small notes in the distance, what is that about?'"]
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[DES-0002-The-Glass-Cockpit]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# Nothing in the quiet band can be clicked

## Problem

**Finished notes are drawn in Glass but cannot be opened, focused or tabbed to.** They stand behind the person as 58 by 16 tiles in the quiet band, and a tile is a rectangle painted on a canvas, not an element: there is no click handler for it, no hover, no tab stop and no keyboard route. On Your Trainer's Issues view that is several hundred notes a person can see and cannot reach without switching to Spread or List. Being small and far away is the design working — depth is priority, and a done issue is not urgent — but being unreachable is not.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "The completed issue notes you cannot select, they show as very small notes in the distance, what is that about?"

## Cause

`drawCards()` in `desktop/src/renderer/glass.ts` skips every slot whose band is `deep`, so no `.field-card` element is ever made for one. `paintCanvas()` draws those slots as filled rectangles on `.field-canvas` with an id when the tile is at least 26 pixels wide. The only canvas hit test in the file is `dotAt`, and its two callers both guard on `this.arrangement === 'orbit'`: in the orbit a dot is a note and a click lands on it ([[TASK-0004-Landing-Opens-The-Note]]), and in Glass nothing reads the canvas. So the orbit gained the hit test the field never got.

The keyboard has the same hole. `tabStops` is counted only over the cards `drawCards` made, so the quiet band is outside the tab order as well as outside the pointer's reach.

## Repro

1. `cd desktop && npm start`, Glass surface, a view with finished notes (Issues on a real workspace).
2. Turn around (drag the background) until the rows of small tiles are in front of you.
3. Click one. Nothing happens; the pointer does not even change. Tab through the field: no tile is ever reached.

## Expected

A quiet-band note can be opened. Clicking a tile lifts the note the way clicking a card does, resting on one says which note it is, and the keyboard can reach it.

## Four ways, and they stack rather than compete

1. **Hit-test the tiles.** Keep the canvas, add a `tileAt(x, y)` beside `dotAt`, and give the field's `pointerup` the same "a click on a tile is a click on a note" rule the orbit already has, plus a pointer cursor and a hover callout on `pointermove`. This is the smallest honest fix and it is what this issue recommends first: the orbit's code is the model, and the projection needed is already computed every frame.
2. **A tile grows when the pointer is near it.** A 58 by 16 rectangle is a small target at arm's length and smaller still at the back of a third layer. Growing the tile under the pointer to something clickable costs one more canvas pass.
3. **Zoom promotes a tile.** Once zoomed in far enough a tile is large enough to be a real card; this is the same question as [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]] and should be settled with it.
4. **The keyboard.** A tile is not an element, so there is nothing to tab to. Either the quiet band gets one roving tab stop with arrow keys moving along the shelf, or reaching a finished note stays a job for search. Recommend the roving tab stop, because "visible and unreachable" is exactly as bad by keyboard as by mouse.

## Evidence

- `desktop/src/renderer/glass.ts`, `drawCards()`: `if (slot.band === 'deep') continue;`.
- `desktop/src/renderer/glass.ts`, `paintCanvas()`: `if (slot.band !== 'deep') continue;` and `ctx.fillRect(...)` per tile.
- `desktop/src/renderer/glass.ts`, `dotAt` and both of its callers, each guarded by `this.arrangement === 'orbit'`.
- `desktop/src/shared/slots.ts`: `TILE_BOX = Object.freeze({ width: 58, height: 16 })` and the `QUIET` shape.

## Sibling search

No sibling found (searched `docs/issues/` for "quiet", "tile", "deep", "canvas", "done"). [[ISS-0067-Spread-Never-Brings-A-Card-Forward]] is Spread's, not the field's.

## Risk scan

No trigger applies: no new dependency, env var, path or exposure. A hit test over up to a thousand visible tiles runs on `pointermove`, so it needs the same care as `dotAt` (skip invisible slots, nearest wins) and should be measured against [[PHASE-0002-Glass]]'s frame-rate criterion.

## Next Actions

- [ ] Triage with Edwin: option 1 alone, or 1 plus 2 and 4.
- [ ] Then a task under [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]], with a smoke step that clicks a quiet-band tile with a real pointer and finds the note on the desk, shown to fail today.
