---
type: "[[task]]"
id: TASK-0074
aliases: ["TASK-0074"]
title: "Detail follows apparent size, not the band: one pure function turns the width a card is drawn at into how much of the note is shown, and the promotion threshold lives in the same table"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]", "Edwin 2026-09-12: 'zooming should also bring in more of the note's content not just increase the note and its font size.'"]
parent: "FEAT-0018"
effort: "S"
due: ""
depends: []
blocks: ["TASK-0075", "TASK-0077"]
related: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]", "[[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]"]
tests: ["[[TST-0055-Detail-Follows-Apparent-Size]]"]
---

# Detail follows apparent size, not the band

## Objective

**Zooming in makes a card bigger and tells a person nothing new.** The field already has detail by distance — a mid-band card hides its face line and its owed verb — but the rule is keyed to `element.dataset['band']`, which is the band the deal assigned. The zoom changes the scale and never the band, so the one rule that decides how much of a note is drawn is the one rule the zoom cannot reach. This task moves that decision onto the width the card is actually drawn at.

## Detail

**A new pure module, `desktop/src/shared/detail.ts`**, with no DOM in it. Its job is one function from an apparent width in pixels to a detail level, plus the promotion threshold [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]] reads. The thresholds live here, once, or they end up as three magic numbers in the renderer and a fourth in the canvas.

**The apparent width is what the renderer already computes:** `p.scale * CARD_BOX.width` after the zoom has been applied ([[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]'s `applyZoom`). No new arithmetic.

**The levels, and what each shows.** The names are the implementer's; these are the jobs, smallest first.

- **tile** — an id and nothing else. What the quiet band's canvas rectangles show today.
- **brief** — the id, the mark and the title. What a mid-band card shows today.
- **full** — the above plus the face line and the owed verb. What a front-band card shows today.
- **more** — the above plus the status, the progress and the properties the view's face names. Nothing shows this today, at any band, at any zoom. This is what Edwin asked for.

**The band stops deciding detail and keeps deciding place.** `data-band` stays on the element, because the fog, the promotion and the CSS that dims a quiet card all read it. The two CSS rules that hide `.fc-face` and `.fc-owed` move from `[data-band="mid"]` onto `[data-detail]`. A card at a given apparent width shows the same amount whatever band it stands in, which is the whole point.

**No excerpt.** ISS-0074's step 4 is dropped in that note. `CardModel` carries no body text, and **more** is built from fields the card already has and does not draw: `subtitle`, `status`, `progress` and the frontmatter the face names.

**The promotion threshold is in the same table.** It is the apparent width past which a quiet tile stops being painted and becomes an element, and it is naturally at or just below the **brief** threshold — a promoted tile that showed nothing but its id would gain a click and no meaning.

## Acceptance

- `detailFor(apparentWidth)` is pure, total, monotonic, and has no DOM import.
- At today's 1× scale, a front-band card resolves to **full** and a mid-band card to **brief**, so the unzoomed field looks exactly as it does now.
- A mid-band card zoomed to 2.5× resolves past **brief** and shows its face line and owed verb.
- A card wide enough resolves to **more** and the level names status, progress and the face's properties.
- The promotion threshold is exported from the same module and is not greater than the **brief** threshold.
- A width of zero, a negative width and a width of ten thousand each return a level rather than throwing.
- `desktop/tests/detail.test.mjs` asserts all of the above, and [[TST-0055-Detail-Follows-Apparent-Size]] names it.

## Steps

- [ ] Write `desktop/src/shared/detail.ts` with the levels, the thresholds and the promotion threshold.
- [ ] Write `desktop/tests/detail.test.mjs` against the built module.
- [ ] Break the module on purpose, one break per run, and record which checks fail in [[TST-0055-Detail-Follows-Apparent-Size]]: thresholds out of order; a level that never reaches **more**; a promotion threshold above the **brief** threshold.
- [ ] Add an amendment paragraph to [[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]'s Scope: its out-of-scope line "More detail at a larger scale (semantic zoom)" is where this work was deferred to, and this is where it landed.
- [ ] Write the chosen thresholds in the Outcome.
- [ ] Commit the suite and [[TST-0055-Detail-Follows-Apparent-Size]] together.

## Notes

This task has no dependency on [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]] or [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]] and can be built beside them. The renderer wiring is [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]]'s.

The outer field gets its detail from this function like every other band, which is what makes "smaller than a mid card" a consequence of the geometry rather than a second rule.
