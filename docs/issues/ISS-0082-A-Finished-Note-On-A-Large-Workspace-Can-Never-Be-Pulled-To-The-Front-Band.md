---
type: "[[issue]]"
id: ISS-0082
aliases: ["ISS-0082"]
title: "A finished note in the quiet band can only be pulled to the front band once it has been promoted to an element, so on a large workspace it can never be pulled forward at all"
status: open
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: 2026-09-17
source: ["Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17"]
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]", "[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]", "[[FEAT-0014-The-Hands]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
tests: []
---

# A finished note cannot be pulled forward from the shelf

## Problem

**Edwin asked to be able to bring a finished card up to the active front band, and on his largest workspace there is no way to do it.** Pulling needs an element. A quiet-band tile is paint on a canvas, so the only route to a pull is to zoom in far enough that the tile is promoted into a real card — and on a large quiet band that never happens.

`this.pull(` has two call sites in `desktop/src/renderer/glass.ts`: line 1930, a downward drag on a `.field-card`, and line 2038, the `p` key on a focused `.field-card`. Both need an element. A `pointerdown` on the field itself starts a turn, not a drag. The quiet cursor's own `keydown` handler at line 1640 takes the four arrow keys, `Enter`, `Space` and `Escape`, and nothing else, so the keyboard route stops at lifting a note onto the desk.

Promotion needs 130 screen pixels of card width (`PROMOTE_AT` in `desktop/src/shared/detail.ts`), and zoom stops at 2.5x. A tile at the centre of the shelf is as wide as the band's box allows:

| notes in the quiet band | tile box | 1x | 1.5x | 2x | 2.5x, the limit |
|---|---|---|---|---|---|
| 24 (this repository) | 140 | 83 | 124 | 166, promoted | 207, promoted |
| 326 | 108 | 64 | 96 | 128 | 160, promoted |
| 2700 (Your Trainer) | 58 | 34 | 51 | 69 | 86, never promoted |

`desktop/tests/detail.test.mjs` asserts the bottom row deliberately, as a trade about how much detail the largest shelf can show. The trade it does not record is that the same threshold is the only door to a pull, so on Your Trainer that door is shut at every zoom.

The feature note's own sentence is wrong on this point and should be corrected with the fix: "the hit test in TASK-0076 is what delivers Edwin's 'allow cards to be brought up to the active front band', and nothing else is built for it". The hit test calls `tap`, which lifts the note onto the desk. The desk is not the front band.

## Expected

A finished note can be pulled to the front band from the shelf as it is drawn, without first being zoomed into an element, and it is still in front after a view switch. That is [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]'s acceptance line and the Goal's "a finished note behind you can be clicked, tabbed to and pulled forward".

## Evidence

Reproduced by reading the built source.

```
$ grep -n "this\.pull(" desktop/src/renderer/glass.ts
1930:        if (dy > 0) void this.pull(entry);
2038:      void this.pull(entry);
```

Both sites are inside handlers bound to a `.field-card` element. The quiet cursor's key handler (line 1640) has no `p` branch. The widths in the table are computed from the built modules at the centre of the shelf.

## Risk scan

No trigger applies. The fix adds a key and a drag route to surfaces that already exist; no dependency, env var, path or long-running step.

## Next Actions

- [ ] Give the quiet cursor the same `p` and `b` keys a card has, and a downward drag from a tile the same meaning it has on a card.
- [ ] Correct the feature note's sentence about what the hit test delivers.

## Where this stands

**2026-09-17: fix written, not yet verified by a run.** [[TASK-0083-A-Finished-Note-Is-Pulled-Forward-From-The-Shelf-Itself]] added `p` and `b` to the shelf's keyboard cursor and a downward-drag route from a painted tile, both calling [[FEAT-0014-The-Hands]]'s own `pull`. Four smoke checks were added and none has been run. This stays `open` until a run settles it.
