---
type: "[[task]]"
id: TASK-0084
aliases: ["TASK-0084"]
title: "A promoted card is laid out at the size its apparent width earned rather than in the tile's box, so the detail it was promoted to show has room to be drawn"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: 2026-09-17
source: ["[[ISS-0084-A-Promoted-Tile-Is-Drawn-In-The-Tiles-Box-So-The-Detail-It-Was-Promoted-To-Show-Is-Clipped]]", "Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17"]
parent: "FEAT-0018"
effort: "S"
due: ""
depends: []
blocks: []
related: ["[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]", "[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]", "[[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]"]
tests: ["[[TST-0055-Detail-Follows-Apparent-Size]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# A promoted card is laid out at the size its promotion earned

## Objective

**A finished note zoomed until it becomes a real card is drawn with its title and face line cut off.** The card is laid out in the quiet band's box, 140 by 39 on this repository and 58 by 16 on a large shelf, and zoom only magnifies that box. Meanwhile `detailFor` reads the magnified width and asks for `full` detail, because the promotion threshold and the `full` threshold are the same 130 pixels. Full detail is four rows; 27 pixels of content space holds one.

## Detail

`place()` at `desktop/src/renderer/glass.ts:927` takes the box from `shapes[slot.band]` for every card. For a promoted quiet note that is the wrong box: its band says how tiles are painted, not how this element should be laid out.

A promoted card is laid out at a box whose width is the apparent width it earned, `p.scale * box.width`, divided back out by the scale the transform will apply — which is to say, at a box large enough that the magnified result is what `detailFor` was told it was reading. The simplest faithful form is to give a promoted card the mid band's box, the size a card of that detail is drawn at elsewhere, and let the existing `scale()` do the rest.

Whichever form is chosen, the invariant to hold is that the detail `detailFor` asks for fits the box the element is given. A check should assert that rather than assert a particular number, so the next change to either threshold cannot silently break it again.

## Acceptance

- A promoted card's box is large enough for the detail its `data-detail` asks for; nothing is clipped.
- A promoted card is still dimmed and still reads as finished work ([[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]).
- Demotion returns the note to a painted tile at the band's box, and the hysteresis between the two thresholds is unchanged.
- A card in any other band is laid out exactly as it is today.
- A check ties the box a card is given to the detail it is asked for, and fails when the two are allowed to disagree.

## Steps

- [ ] Lay a promoted card out at the box its detail needs rather than at the quiet band's.
- [ ] Add the box-fits-detail check to [[TST-0055-Detail-Follows-Apparent-Size]].
- [ ] Say in the smoke run that the promoted card's content fits, not only that it exists.

## Where this stands

**2026-09-17: written, and the pure half is verified.**

**The rule is in `detail.ts`, where the thresholds already live.** `MIN_BOX_FOR` says the smallest box each level can be drawn in, width and height; `holdsDetail` answers whether a box holds a level; and `promotedBox` gives a promoted tile the box it is actually drawn at, in a card's proportions rather than a tile's flat ones, never smaller than its level needs.

**The renderer draws a promoted card at that box with no scale.** `place()` used to hand every card its band's box and let the transform magnify it. A promoted quiet note is the one card whose band box describes how a TILE is painted, so it now gets `promotedBox` and a projection with `scale: 1`. The apparent width across the threshold is therefore unchanged, which is what keeps the promotion from reading as a jump; the card does get taller, because a card is taller than a tile. `boxOf`, which is where a reach wire starts, was taught the same exception.

**Verified, and the checks were shown to fail.** Three checks in [[TST-0055-Detail-Follows-Apparent-Size]] assert the box holds the level, that the apparent width does not jump, and that a promoted card is card-shaped. Replacing `promotedBox` with the old tile-box behaviour makes all three fail; restored, all 468 node checks pass and `git status` is clean.

**What is owed: a run.** Two smoke checks were added — that no promoted card's `scrollHeight` passes its `clientHeight`, and that every promoted card's measured box holds the level its width earns — and neither has been run, for the same reason as [[TASK-0082-The-Hover-Callout-And-The-Pointer-Cursor-Run-In-The-Field-Not-Only-In-The-Orbit]].
