---
type: "[[issue]]"
id: ISS-0017
aliases: ["ISS-0017"]
title: "A card restored below the desk's window creeps further down on every repaint, so it walks off the bottom again while a person folds a group or types in the search box"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["A lead in [[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]], reproduced by a check on 2026-09-07"]
severity: medium
component: renderer
parent: ""
related: ["[[ISS-0005-A-Card-Jumps-When-The-Desk-Has-Scrolled]]", "[[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[TST-0019-The-Desk-Is-Chosen-And-Arranged]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
tests: ["[[TST-0019-The-Desk-Is-Chosen-And-Arranged]]"]
---

# A restored card creeps down the desk on every repaint

## Problem

**A card that was saved far down a big monitor's desk does not stay where the smaller window puts it — it walks.** Open the desk on a laptop and the card is pulled up onto the screen, which is what [[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]] intended. Then fold a group, or type one letter in the search box, or let a change arrive from another window, and it moves down about 56 pixels. Do it often enough and it is off the bottom again.

**Two clamps were sharing one bound, and one of them was measuring its own output.** `drawDesk` computed the bound with `deskBounds`, which takes the larger of the desk's window and its *content* — and the content is `scrollHeight`, measured before `pool.render`, so it describes the previous paint. For a restored card the previous paint is where this same clamp last put it. A card stored at y=2000 on a desk 400 tall clamps to 352, which makes the content 456 tall, so the next paint clamps to 408, then 464.

## Repro

`bash tools/scripts/run-desktop-tests.sh desk-model`, the check named "a restored card sits in the same place however many times the desk repaints". It drives the old bound four times and asserts the drift, then drives the new one and asserts there is none.

By hand: save a desk on a large display with a card near the bottom, reopen it on a laptop, and fold a navigator group three or four times.

## Expected

A repaint draws the desk as it already is. Nothing moves because nothing was moved.

## Actual

Every repaint moved a restored card further down.

## Evidence

- `desktop/src/shared/desk.ts` — `deskBounds` takes `Math.max(clientHeight, scrollHeight)`.
- `desktop/src/renderer/renderer.ts` — `drawDesk` read that bound before `pool.render`, so the measurement was of the previous paint.
- The drift the check records: four paints, from 352 to well past 500.

## Resolution, 2026-09-07 — the second answer, after the first one was wrong

**The first fix stopped the creep by clamping every card to the window, and that broke the desk.** It is stable, and it squeezes the desk flat: no painted card exceeds the viewport, so the desk never grows enough to scroll to the rest. Forty cards on a 900x600 desk drew 24 distinct positions — sixteen of them on top of another card. The second close-out review of the day reproduced that before it shipped, and it is recorded here rather than quietly replaced, because the reasoning is what stops it being tried a third time.

**The bound is the desk's own extent**: the window unioned with every saved position (`placementBounds` in `desktop/src/shared/desk.ts`). Stable, because it is a pure function of what was saved rather than a measurement of the last paint. Correct, because a card at y=2000 makes the desk 2000 tall and is reached by scrolling — which is what a desk with `overflow: auto` is for. What the clamp still catches is a negative coordinate.

**Two jobs, two bounds.** A card being *dragged* keeps `deskBounds`, the content measure, because the desk it is moving on already scrolls that far ([[ISS-0005-A-Card-Jumps-When-The-Desk-Has-Scrolled]]).

## What is guarded, and what is not

**The arithmetic is guarded twice** in `desktop/tests/desk-model.test.mjs`, and both checks fail when their answer is reverted. One drives the old content-measured bound and fails if the drift is *absent*, so it cannot pass by accident. The other builds forty cards down a desk taller than its window and fails if any two land in the same place. Both wrong answers are pinned.

**Which bound the renderer actually calls is guarded by nothing.** An earlier version of this note said "Two checks guard it" without that distinction, and it was wrong in exactly the way this phase's reviews keep catching: the product change is one line in `drawDesk`, and reverting it leaves every check green, because no suite loads `desktop/src/renderer/`. That is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] and it is measured, not argued. The walk settles it.
