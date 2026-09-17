---
type: "[[task]]"
id: TASK-0083
aliases: ["TASK-0083"]
title: "A finished note is pulled to the front band from the shelf as it is drawn, by the keyboard and by a drag, without first being zoomed into an element"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: 2026-09-17
source: ["[[ISS-0082-A-Finished-Note-On-A-Large-Workspace-Can-Never-Be-Pulled-To-The-Front-Band]]", "Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17", "Edwin 2026-09-12: 'Maybe we need more bands and allow cards to be brought up to the active front band????'"]
parent: "FEAT-0018"
effort: "M"
due: ""
depends: []
blocks: []
related: ["[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]", "[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]", "[[FEAT-0014-The-Hands]]", "[[TASK-0053-Pull-Forward-And-Push-Behind]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0056-Every-Note-Is-Somewhere-And-A-Finished-Note-Can-Be-Pulled-Forward]]"]
---

# A finished note is pulled forward from the shelf itself

## Objective

**Edwin's request was to bring a finished card up to the active front band, and on his largest workspace there is no way to do it.** Both routes to `pull` need a `.field-card` element, and a tile only becomes one by being zoomed past 130 pixels of width — which a tile on a 2,700-note shelf never reaches, because the band's box is 58 pixels and the zoom stops at 2.5x.

Promotion is the wrong door for this. It exists so a large tile can show more of its note ([[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]), and making reach depend on it ties a gesture to how crowded the shelf happens to be.

## Detail

The shelf already has a keyboard cursor and a hit test. Both gain the gesture rather than a new one.

**The keyboard.** The quiet cursor's `keydown` at `desktop/src/renderer/glass.ts:1640` takes the arrows, `Enter`, `Space` and `Escape`. It gains `p` and `b`, the same two keys a focused card takes in `cardKey`, acting on the note under the cursor. A pushed note is already behind the person, so `b` on the shelf is a no-op that says so rather than an error.

**The pointer.** `pointerdown` on the field starts a turn. When the press lands on a tile, a downward drag past the same `PULL_THRESHOLD_PX` a card uses pulls that note instead of turning the field, and an upward drag is left alone — the shelf is already the back of the field. The turn must still win when the press did not land on a tile, which is every press today.

**One route, not two.** `pull` is [[FEAT-0014-The-Hands]]'s and is not copied: both new paths call it with the note id the hit test or the cursor already knows.

## Acceptance

- With the keyboard on the shelf, `p` on the note under the cursor puts it in the front band, and it is still in front after a view switch.
- A downward drag that begins on a tile pulls that note forward, on a workspace whose shelf never promotes.
- A drag that begins anywhere else on the field still turns the field, and a downward drag on a tile does not also turn it.
- Nothing about the pull differs from a card's: the same function, the same front-band capacity rule, the same refusal sentence where one applies.
- The feature note's sentence claiming the hit test delivers this is corrected.

## Steps

- [ ] Add `p` and `b` to the quiet cursor's key handler, acting on the note under the cursor.
- [ ] Give a press that lands on a tile a downward-drag route into `pull`, leaving the turn as the behaviour everywhere else.
- [ ] Add a smoke check that pulls a quiet note forward and finds it in front after a view switch.
- [ ] Correct the sentence in [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]].

## Where this stands

**2026-09-17: written, and not yet verified by a run.** Both routes are in, and both call [[FEAT-0014-The-Hands]]'s `pull` rather than copying it.

**The keyboard.** The quiet cursor's `keydown` now takes `p` and `b` beside the arrows, `Enter`, `Space` and `Escape`, through a new `handQuietCursor` that looks the note up and calls `pull` or `push`. The cursor's `aria-label` says so.

**The pointer.** A `pointerdown` on the field now records which tile it landed on, if any, and a downward drag past `PULL_THRESHOLD_PX` from that tile pulls the note instead of turning the field. The same mostly-vertical test a card's drag uses decides it, the gesture fires once, and a drag that began anywhere else on the field turns the field exactly as before. A drag that pulled is not then read as a click, so the note is not also put on the desk.

**What is owed: a run.** Both routes are renderer behaviour and only the smoke suite reaches them. Two checks were added for the keyboard route and two for the drag, including one that the field's yaw does not move when a tile is dragged. None has been run: the suite opens windows, and Docker was not running on 2026-09-17 so [[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]]'s container was not available.
