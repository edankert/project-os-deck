---
type: "[[task]]"
id: TASK-0077
aliases: ["TASK-0077"]
title: "A tile large enough becomes a real card: past the promotion threshold a quiet note stops being painted and gets an element, so it is clickable, tabbable and readable with no code of its own"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]] step 3", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]"]
parent: "FEAT-0018"
effort: "M"
due: ""
depends: ["TASK-0074", "TASK-0075", "TASK-0076"]
blocks: []
related: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]]", "[[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]"]
tests: ["[[TST-0056-Every-Note-Is-Somewhere-And-A-Finished-Note-Can-Be-Pulled-Forward]]"]
---

# A tile large enough becomes a real card

## Objective

When a person zooms or flies close enough that a quiet-band tile would be readable, it stops being a rectangle on the canvas and becomes an ordinary card. The click, the hover, the tab stop and the detail then come with the element, and none of them is written twice.

## Detail

**The threshold is [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]'s**, in `desktop/src/shared/detail.ts`, read from the same apparent width that decides every other card's detail. Nothing here invents a number.

**The promoted set is small by construction.** A tile is promoted only when it is drawn large, which happens when a person has zoomed in or turned to face a small quiet band. That is the answer to the cost question in [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]: rather than making all 286 visible tiles into cards on the largest workspace, the ones a person could actually read become cards, and the rest stay a texture on the canvas.

**How it works.** `drawCards()` stops skipping `deep` slots unconditionally and instead skips a `deep` slot whose apparent width is below the threshold. `paintCanvas()` skips a `deep` slot that has an element, so nothing is drawn twice. The decision is per slot and per frame, and it is taken from the projection both already compute.

**Two things that must not happen.** A note must not flicker between a tile and a card at the threshold: give the promotion a small hysteresis, so it demotes at a slightly smaller width than it promotes at, and write the numbers in the Outcome. And a promotion must not churn hundreds of elements on a turn: on a large workspace a turn into a full quiet band crosses the threshold for many notes at once only if the band is drawn large, which the shape function makes unlikely — but [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]] measures a turn with the zoom in, and [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] is the answer if the number is bad.

**A promoted card keeps its identity.** It is an entry in the same `cardEls` map every other card uses, keyed by note id, so it animates and survives a view switch like the rest. This is the constraint PHASE-0002 exit criterion 2 is ticked on.

**It is an ordinary card in every respect.** It can be clicked, hovered, tabbed to, lifted, pulled and pushed, and it carries `data-band="deep"`, so the CSS that makes finished work look finished still applies. Being reachable is not the same as being urgent.

## Acceptance

- A quiet-band tile zoomed past the promotion threshold is an element in the document; zoomed back below it, it is a canvas rectangle again.
- No note is ever both painted and drawn as an element in the same frame.
- A note at the threshold does not flicker between the two as the zoom drifts.
- A promoted card is clickable, tabbable, liftable and pullable with no code specific to the quiet band.
- A promoted card is still dimmed and still reads as finished work.
- A promoted card keeps its element across a view switch.
- On the largest workspace, at 1× and facing the quiet band, the number of promoted cards is small, and the Outcome says what it is.
- In the orbit nothing is promoted: its `deep` slots are its own and are drawn as dots.

## Steps

- [x] Promote in `drawCards()` and skip the promoted in `paintCanvas()`, both from the apparent width.
- [x] Add the hysteresis and write both numbers in the Outcome.
- [x] Check the promoted card against every existing card behaviour: lift, pull, push, throw, reach, the navigator's groups and the tab order.
- [x] Guard the orbit out, the way every other canvas rule in `glass.ts` is guarded.
- [x] Record in the Outcome how many cards are promoted at 1× on each of the three workspaces, facing the quiet band.

## Notes

This is the seam [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] and [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]] share, which is why they are planned together and built one after the other.

[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]] is still owed after this: most tiles on a large workspace are never promoted, and they must be reachable too.

## Outcome

**Done 2026-09-12. A quiet tile drawn at the size of a card becomes one, and the promotion threshold had to move to make that true.** 465 checks passing, both typechecks clean.

### The threshold moved from `brief` to `full`, and the reason is the interesting part

[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]] set the promotion threshold at `brief` and said it "may never be higher", on this argument: being an element is what gives a tile its click and its tab stop, so promoting one that showed nothing but its id would buy nothing.

**[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]] invalidated that argument two days later in the same feature.** It gave the painted band its own hit test and a roving tab stop, so a tile is clickable, hoverable and reachable by keyboard whether or not it is an element. Promotion is now only about detail, and it can wait until a tile is drawn at the size of a card that carries some.

The numbers forced the point. At `brief`, on Your Trainer's Issues view, **all 311 visible tiles promoted at 1x** — about 2,200 more elements on a document of 2,303, the doubling [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] warned about, taken without a person asking for anything and failing this task's own acceptance line that the promoted set be small. At `full`:

| zoom | promoted / visible, Your Trainer's Issues view |
|---|---|
| 1x | 0 / 311 |
| 1.4x | 14 / 311 |
| 1.8x | 59 / 239 |
| 2.5x | 180 / 180 |

It grows as a person zooms toward the band and is bounded by what is on the screen. [[TST-0055-Detail-Follows-Apparent-Size]] and `desktop/src/shared/detail.ts` both carry the reason, so it cannot be quietly moved back.

### How many are promoted at 1x, facing the quiet band

**None, on any of the three workspaces.** This repository's quiet band is drawn at 83 pixels at the centre of the shelf and 122 at its edges; Your Trainer's Issues view at 64 and 94. All are below 130. A person sees what they saw before until they zoom toward the band.

### The trade this takes, stated plainly

A band past 800 notes gets the 58-pixel tile, which is drawn 34 across at 1x and 86 at the maximum zoom of 2.5 — so **the very largest quiet band never promotes at the centre of its shelf**, however far a person zooms. Its edge tiles, drawn about half again as large, do.

That costs nothing a person can *do*: the hit test and the tab stop reach a painted tile. What it costs is detail, on the one band where promoting everything would double the document. [[TST-0055-Detail-Follows-Apparent-Size]] states it as a check rather than leaving it to be discovered.

### The hysteresis

Promotes at 130, demotes at 122. Without it a tile sitting on the threshold is created and destroyed on alternate frames as the zoom drifts a fraction, which reads as a flicker and allocates an element every frame. Eight pixels is about a tenth of the threshold: wide enough that no drift crosses both edges, narrow enough that zooming out gives the tile back where a person expects.

### A promoted card is an ordinary card

It is an entry in the same `cardEls` map keyed by note id, so it animates, survives a view switch, and keeps the element PHASE-0002's exit criterion 2 is ticked on. It carries `data-band="deep"`, so the dimming that makes finished work look finished still applies — being reachable is not the same as being urgent. Lift, pull, push, throw, reach, the navigator's groups and the tab order all reach it with no code of the quiet band's own.

### The orbit is guarded out

Its `deep` slots are its own and are drawn as dots. `drawCards` returns early for a `deep` slot when the arrangement is the orbit, before any projection is taken.

### Three breaks

| The break | What failed |
|---|---|
| 1. No hysteresis — demote at the same width as promote. | "a tile at the threshold does not flicker between a card and a rectangle" |
| 2. The threshold back at `brief`. | 4 checks, including the two that carry the reason it moved |
| 3. A promoted note painted as well as drawn. | **Nothing.** No node check can see it: it is a property of one frame in a real window, and it is [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]'s to catch. Recorded here so the gap is known rather than assumed covered.