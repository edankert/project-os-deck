---
type: "[[issue]]"
id: ISS-0074
aliases: ["ISS-0074"]
title: "Zooming in makes a card and its type bigger and tells the person nothing new, because how much of a note is drawn is keyed to which band it stands in and never to how large it actually is on screen"
status: "open"
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: "2026-09-12"
source: ["Edwin 2026-09-12, running Deck: 'zooming should also bring in more of the note's content not just increase the note and its font size.'"]
severity: medium
component: renderer
parent: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]", "[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# Zoom makes a card bigger without showing more of the note

## Problem

**Zooming in scales the picture and adds no information.** A card that was showing an id and two lines of title shows the same id and the same two lines, larger. The field already has the idea Edwin is asking for — a card in the mid band drops its face line and its owed verb, "detail by distance" — but that detail is chosen from the band the note was dealt into, which the zoom does not change. So the one rule that decides how much of a note is drawn is the one rule the zoom cannot reach.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "zooming should also bring in more of the note's content not just increase the note and its font size."

## Cause

[[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]] made the zoom a pure view transform: `applyZoom` in `desktop/src/shared/zoom.ts` multiplies the projected x, y and scale, and the renderer puts that scale on the card's CSS transform. Nothing else about the card changes.

What is drawn inside a card comes from `element.dataset['band'] = slot.band` in `paintCard`, and the CSS rule `.field-card[data-band="mid"] .fc-face, .field-card[data-band="mid"] .fc-owed { display: none; }`. `slot.band` is the band the deal assigned, a property of the note's priority, not of its size on screen. A mid-band card zoomed to twice its size is still `data-band="mid"` and still hides its face line.

There is a second half to this, and it is a data problem rather than a drawing one: **Deck has no more of the note to show.** `CardModel` in `desktop/src/shared/types.ts` carries the id, the title, the type, the status, a one-line `subtitle` where the sidecar sent one, the owed verb, progress and the frontmatter. There is no first paragraph and no body text. A card zoomed to 400 pixels wide can show the subtitle, the status, the progress and a few frontmatter properties, and then it runs out. Showing an actual excerpt means the index has to carry one.

## Repro

1. `cd desktop && npm start`, Glass surface, put the pointer over a mid-band card.
2. Zoom in with the wheel to 2.5x.
3. The card is two and a half times the size with the same two lines of text. Its face line and owed verb are still hidden.

## Expected

Detail follows apparent size. A card grown past a stated width shows its face line and owed verb whatever band it came from; grown further it shows its status, progress and the properties its face names; and a quiet-band tile grown far enough becomes a readable card rather than a rectangle with an id.

## What to build, in the order that pays

1. **Key the detail to apparent width, not to the band.** `paintCard` already computes the projection; write a detail level from `p.scale * CARD_BOX.width` and set `data-detail="tile|brief|full"` beside `data-band`, moving the two CSS rules onto it. Small, self-contained, and it makes the zoom mean something immediately. The band keeps deciding **where** a note stands; apparent size decides **how much** of it is drawn.
2. **Decide the thresholds once, in a pure function, with a test.** Otherwise they end up as three magic numbers in the renderer and a fourth in the canvas.
3. **Give the quiet band a promotion.** At a large enough apparent size a tile stops being a canvas rectangle and becomes a real card. This is the same seam as [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] and the two should be settled together: a promoted tile is an element, so it is clickable and tabbable for free.
4. ~~**Then, and only if Edwin wants it, an excerpt.**~~ **Dropped 2026-09-12.** See below.

Steps 1 to 3 use what Deck already has.

## Evidence

- `desktop/src/shared/zoom.ts`, `applyZoom`: x, y and scale only.
- `desktop/src/renderer/glass.ts`, `paintCard`: `element.dataset['band'] = slot.band;`.
- `desktop/src/renderer/deck.css`: `.field-card[data-band="mid"] .fc-face, .field-card[data-band="mid"] .fc-owed { display: none; }` under the comment "Detail by distance".
- `desktop/src/shared/types.ts`, `CardModel`: no body or excerpt field.

## Sibling search

No sibling found (searched `docs/issues/` for "zoom", "detail", "excerpt", "band").

## Risk scan

Step 4 is the only trigger: an excerpt on every card grows the index payload, which [[PHASE-0002-Glass]]'s first exit criterion measures as one request for the whole corpus. A `RISK-*` is owed if that step is planned; steps 1 to 3 add nothing.

## Next Actions

- [x] **Edwin asked what step 4 gives him, 2026-09-12. The honest answer is: very little. It is dropped from this issue** — see "What step 4 would actually give you" below. Steps 1 to 3 stand and need no decision.
- [ ] Step 3 is the same seam as [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] and should be measured with it: a tile promoted to a card is clickable and tabbable for free, and the promoted set is small by construction.
- [ ] Then tasks under [[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]] for steps 1 and 2 with a pure suite for the thresholds, and under [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] for step 3.

## What step 4 would actually give you

Edwin asked, 2026-09-12: "I don't know what step 4 gives me?" Working it through, the answer is **not much, and it is dropped.**

- **The card would gain a first paragraph, and the first paragraph is nearly the subtitle.** Every project-os note is written point-first — a `## Problem` or `## Summary` whose opening sentence says what the note is about. `CardModel.subtitle` already carries the sidecar's one-line description of the same note. An excerpt would mostly repeat, in three lines, what one line already says.
- **Steps 1 to 3 have not run out of things to show yet.** A card grown to 400 pixels can show the subtitle, the status, the progress and the properties the view's face names, and today it shows none of them because the detail is keyed to the band. Until that is built, nobody knows whether a zoomed card still feels thin.
- **The full note is one click away, at the size you choose.** [[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]] makes the opened pane the size the person set, with the whole rendered note in it. A card is a thing you scan to decide what to open; a pane is the thing you read.
- **It costs the measurement.** An excerpt on every note grows the payload that [[PHASE-0002-Glass]]'s first exit criterion measures — 2.39 MB and 86 ms cold on 1,549 notes today — and it forces a decision about what an excerpt means in an Obsidian vault, where notes have no `## Problem`.

**So: build steps 1 to 3, use them, and only then ask again.** If a zoomed card still leaves you unable to tell what a note says, the example that proves it is worth more than this argument, and the excerpt comes back as its own issue with that example in it.
## Planned, 2026-09-12

**Steps 1 to 3 are planned into [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]. Step 4 stays dropped.**

[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]] is steps 1 and 2: a new pure module, `desktop/src/shared/detail.ts`, turns the width a card is drawn at into a detail level, the renderer sets `data-detail` beside `data-band`, and the two CSS rules move onto it. [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]] is step 3, and it reads the promotion threshold from the same module.

**One thing this changes elsewhere.** [[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]] put "more detail at a larger scale" out of scope by name and called it a later refinement. This is that refinement arriving; [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]] writes an amendment paragraph into FEAT-0016's scope saying where the work went.

The issue closes against steps 1 to 3 and records that step 4 was dropped rather than deferred.
