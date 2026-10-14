---
type: "[[task]]"
id: TASK-0084
aliases: ["TASK-0084"]
title: "A promoted card is laid out at the size its apparent width earned rather than in the tile's box, so the detail it was promoted to show has room to be drawn"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: 2026-10-14
source: ["[[ISS-0084-A-Promoted-Tile-Is-Drawn-In-The-Tiles-Box-So-The-Detail-It-Was-Promoted-To-Show-Is-Clipped]]", "Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17"]
parent: "FEAT-0018"
effort: "S"
due: ""
depends: []
blocks: []
related: ["[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]", "[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]", "[[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]"]
tests: ["[[TST-0055-Detail-Follows-Apparent-Size]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
verification_waiver: "One smoke check in TST-0045, that a real promoted card is drawn no brighter than its tile, has never been run. Edwin chose on 2026-10-14 to close without it. The rule it checks is held by the node check in TST-0055, shown to fail against two breaks."
waiver_expires: 2026-10-31
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

- [x] Lay a promoted card out at the box its detail needs rather than at the quiet band's.
- [x] Add the box-fits-detail check to [[TST-0055-Detail-Follows-Apparent-Size]].
- [x] Say in the smoke run that the promoted card's content fits, not only that it exists.
- [x] Draw a promoted card at the opacity its tile was painted at, from one rule both share, so it stays dimmed (added 2026-10-14). The smoke check for it has not been run; see below.

## Where this stands

**2026-09-17: written, and the pure half is verified.**

**The rule is in `detail.ts`, where the thresholds already live.** `MIN_BOX_FOR` says the smallest box each level can be drawn in, width and height; `holdsDetail` answers whether a box holds a level; and `promotedBox` gives a promoted tile the box it is actually drawn at, in a card's proportions rather than a tile's flat ones, never smaller than its level needs.

**The renderer draws a promoted card at that box with no scale.** `place()` used to hand every card its band's box and let the transform magnify it. A promoted quiet note is the one card whose band box describes how a TILE is painted, so it now gets `promotedBox` and a projection with `scale: 1`. The apparent width across the threshold is therefore unchanged, which is what keeps the promotion from reading as a jump; the card does get taller, because a card is taller than a tile. `boxOf`, which is where a reach wire starts, was taught the same exception.

**Verified, and the checks were shown to fail.** Three checks in [[TST-0055-Detail-Follows-Apparent-Size]] assert the box holds the level, that the apparent width does not jump, and that a promoted card is card-shaped. Replacing `promotedBox` with the old tile-box behaviour makes all three fail; restored, all 468 node checks pass and `git status` is clean.

**What is owed: a run.** Two smoke checks were added — that no promoted card's `scrollHeight` passes its `clientHeight`, and that every promoted card's measured box holds the level its width earns — and neither has been run, for the same reason as [[TASK-0082-The-Hover-Callout-And-The-Pointer-Cursor-Run-In-The-Field-Not-Only-In-The-Orbit]].

**2026-10-14: the run happened, and it showed the second acceptance line was never true.**

**The two owed smoke checks ran on 2026-10-02 and passed.** The smoke run at `18f5405`, in the Linux container, printed `every promoted card draws its more without clipping it (36 promoted, 0 clipped)` and `every promoted card's box holds the level its width earns (0 short)` (`~/.cache/deck-verify/smoke-loopback-debug-6.log`, lines 397 and 398). Nothing under `desktop/` has changed since that commit. That run exercised only the `more` level, because at 2.5x this repository's quiet tiles are drawn about 350 pixels wide; `full` and `brief` are covered by the node checks over five shelf sizes and four zooms.

**A promoted card is brighter than the tile it replaces, so it is not "still dimmed".** A painted quiet tile is drawn at 25 to 75 percent opacity, and at 70 percent of that on a back layer (`glass.ts`, `paintCanvas`). The moment it is promoted, `place()` gives it a front card's opacity, up to 100 percent. Zooming toward the shelf therefore makes finished work light up to the brightness of current work, which is the opposite of what [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]] asked for. Nothing in the stylesheet dims `data-band="deep"`; the finished status only colours the card's left border.

**The fix is one rule for both.** `bandOpacity(band, phi, layer)` in `desktop/src/shared/slots.ts` says how opaque a note in a band is drawn at a bearing. The canvas paints a tile with it and `place()` draws a promoted card with it, so the two cannot drift apart and a promoted card keeps its tile's brightness. A node check in TST-0055 asserts that a quiet note is dimmer than a front or mid note at every bearing, and a smoke check measures a real promoted card's opacity against a front card's.

**2026-10-14, later: the rule is built and its node check is shown to fail.** The fix is in `f3556dd`. The detail suite ([[TST-0055-Detail-Follows-Apparent-Size]]) passes 16 of 16. Two breaks in `slots.ts` were each caught by the new check: the quiet band taking a front card's opacity, and the quiet band losing its back-layer dimming. The fourth step stays open until the smoke check that measures a real promoted card's opacity has run once as written and once against a break.

**2026-10-14, closed: done, with the smoke check for the opacity rule never run.** Edwin chose to close the task without that run, after two attempts to run it in the box were cancelled. The check is written in `desktop/src/main/smoke-glass.ts` and listed in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]], marked there as not yet run. The frontmatter waiver says so and expires on 2026-10-31. What the rule rests on until then is the node check in [[TST-0055-Detail-Follows-Apparent-Size]], which two breaks in `slots.ts` were shown to fail. A break in `place()` itself, such as handing the quiet band a front card's opacity there, would pass every node check; only the smoke check would catch it.

**Verification on `ffbd3fd`:** the detail suite passes 16 of 16, and `npm test` passes 646 of 646. Nothing under `desktop/` changed at close-out.

**Risk scan:** no trigger applies. The rule adds no dependency, environment variable, path, long-running step or exposure.
