---
type: "[[issue]]"
id: ISS-0078
aliases: ["ISS-0078"]
title: "The quiet band is the only band that insists on drawing every note it holds, where the front and mid bands cap what they place and state the rest as a count, and drawing it buys nothing a person can use"
status: open
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["Edwin 2026-09-12: 'Do we really need the quite band???'", "Edwin 2026-09-12, on first seeing it in use: 'The completed issue notes you cannot select, they show as very small notes in the distance, what is that about?'"]
severity: medium
component: renderer
parent: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]", "[[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "[[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]", "[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0014-The-Hands]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# The quiet band is the only band that insists on drawing everything

## Problem

**Deck already knows what to do when a band holds more notes than it has places: it places what it can, counts the rest, and says so.** The front band caps at its capacity and the bar reads "and 12 more in front — all listed in the navigator". The mid band does the same with "more in the middle". The quiet band is the one band that refuses this and draws every note it holds, as up to 286 tiles of canvas, none of which can be clicked, tabbed to, or read. Edwin's question is whether it should exist at all.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "Do we really need the quite band???"

His first reaction on seeing it in real use, earlier the same day, is the same judgement arriving from the other direction: "The completed issue notes you cannot select, they show as very small notes in the distance, what is that about?"

## The record already planned for this question

[[PHASE-0002-Glass]] carries an exit criterion written to answer it: "After a week of daily use in Glass, Edwin records from the compass how often he turned to look behind and whether anything was lost there. The DES-0002 review said this question should be a criterion rather than a remark, because the literature expects a 'behind you' band to become a place things are forgotten... **Either answer is a result, and a bad one is what would retire the quiet band's placement, not the phase.**"

So this is not overturning the design. It is the design's own escape hatch being used, by the person it named, after the use it asked for.

## What the band is actually for, and which of those survive dropping it

Three jobs are stated in the record. They are not equally load-bearing.

1. **Finished work has somewhere to be — "the corpus has an inside".** This is DES-0002's premise and the reason Glass is not a filtered list in three dimensions. It is the real cost of deleting the band.
2. **A hand-pushed note goes behind you.** [[FEAT-0014-The-Hands]] built push-behind as a gesture and `dealField` reports `pushedBehind`. A push needs a "behind" to push into. There will be a handful of these, never hundreds.
3. **The count is on screen at all times, so nothing looks dropped.** The compass already carries it — "309 in the quiet band · 41 out of sight" — and that line is independent of whether anything is painted.

Job 3 costs nothing and stays either way. Job 2 needs a place, not a shelf. **Only job 1 needs the tiles, and job 1 is the one that has never worked**: a note you cannot click, cannot tab to and cannot read is not a note that is "somewhere", it is a texture.

## What the quiet band was for, in DES-0002's own words

Edwin, 2026-09-12: "Not sure now I know what the quiet band was supposed to be used for." The design says it in two places, and both matter.

**What it holds:** "**Deep field** — the quiet: terminal work, suppressed items, the 70% of this corpus that is finished. Small, dim, blurred, still there."

**Why it is behind you, and what it was promised to be:** "Rendered small and dim in front of you, 70% of this corpus is still a thousand rectangles between you and the nine things that matter. Placed **behind** you it costs nothing, **stays one gesture away**, and is counted on screen so it cannot be quietly lost."

**One gesture away** is the whole claim, and the built band does not honour it. A canvas tile is nought gestures away, because no gesture reaches it.

## The prototype had this exact bug, found it, and fixed it

[[DES-0002-The-Glass-Cockpit]], recording why Edwin could not open a note in its first revision: "**Rev 1:** quiet cards carried `pointer-events: none`. `FEAT-0143` is `done`, therefore always in the quiet band, therefore unclickable in every view. **Fixed by making anything visible clickable.**"

That is [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]], a year of revisions earlier, with the same cause read the same way and a rule written to prevent it. Deck reintroduced it by a different route — the band became a canvas instead of `pointer-events: none` — and the rule was not carried across. **So ISS-0073 is a regression against a decision already taken, not a new question.**

## The recommendation below is withdrawn

It said to stop drawing the shelf, on the grounds that the band buys nothing a person can use. Two things read after it was written say otherwise. The design's promise was that the band is one gesture away, which argues for fixing the gesture rather than removing the band. And [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]] found the field's actual hole: hundreds of **active** notes with no band at all, which is strictly worse than finished notes in a band that is hard to reach. Once a fourth band gives those a place, the quiet band is no longer the odd one out; it is the far end of a gradient, and the reason to draw it is the reason to draw the rest.

**What stands from this issue** is the observation that made it worth writing: the quiet band is the only band that draws every member, and "place what fits, count the rest, say so" is a rule Deck already applies twice. That rule should apply to every band including the quiet one — which is a capacity, not a deletion.

## Three ways, and the middle one was recommended and is now withdrawn

1. **Keep it and make it work.** [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] plus [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]] plus, on the largest workspace, [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] and a measurement. The most work of the three, for the job the phase already doubted.
2. **Stop drawing the shelf; keep the place. ~~Recommended.~~ Withdrawn 2026-09-12, see above.** The deep band stops being painted as a field of tiles. The compass keeps its count. A note a hand pushed behind is still behind, and because there are a handful rather than hundreds it is drawn as an ordinary card — clickable, tabbable, no canvas. Finished work is reached the way front and mid overflow already is, through the navigator and search, and the bar says so in the sentence it already has. This keeps every job the record names except the one that never worked, and it applies Deck's own existing rule to the third band instead of inventing anything.
3. **Delete the band outright**, push-behind with it. Cheapest, and it retires a gesture [[FEAT-0014-The-Hands]] built and a premise [[DES-0002-The-Glass-Cockpit]] rests on. Not recommended.

## What option 2 does to the three open issues

- **[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] mostly dissolves.** What stands behind you is a handful of hand-pushed cards, and a card is already clickable and tabbable. What remains is the smaller question of reaching a finished note at all, and the honest answer becomes search and the navigator, which is where front and mid overflow already send you.
- **[[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]] dissolves.** There is no shelf to shape.
- **[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] dissolves for now.** Nothing creates hundreds of elements on a turn, so the free list is not owed. The finding stays on the record, because the next feature that draws many notes at once will meet it again.
- **The measurement all three were waiting on is not needed.** Removing 286 tiles can only make the frame cheaper.

## What it costs, stated plainly

Glass stops showing the whole corpus. A person who wants to see that 153 issues are finished reads a number instead of seeing a texture. If spatial memory for finished work turns out to matter — "it was behind me and to the left" — this is what gives it up, and the honest way back is to make the band summonable rather than permanent: empty behind you until a search or a link puts something there.

## What has to change if option 2 is taken

- [[DES-0002-The-Glass-Cockpit]]: the quiet band stops being a drawn shelf.
- [[PHASE-0002-Glass]] exit criterion 1 says "the quiet band is behind you with its count on screen"; the count stays and the band goes, so the wording is amended.
- [[PHASE-0002-Glass]]'s week-of-use criterion is **answered, not dropped**: the answer is recorded as the reason, which is exactly what it says a bad answer does.
- [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]'s measurement is retaken, and is expected to improve.
- The canvas painter stays: the orbit uses it for its dots and assigns its own `deep` slots (`glass.ts`, the orbit layout), so nothing there is touched.

## Evidence

- `desktop/src/shared/field.ts`, `dealField`: `front` and `mid` cap at `frontCapacity` and `midCapacity` and count the rest; `deep` is the residual and takes everyone.
- `desktop/src/renderer/glass.ts`: `and ${n} more in front`, `${n} more in the middle`, joined into "and … — all listed in the navigator".
- `desktop/src/renderer/glass.ts`, the compass: `${quiet} in the quiet band · ${behind} out of sight`, independent of what is painted.
- [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]], "Measured": 286 tiles at the worst moment on Your Trainer, 229 on the cockpit, 35 here.
- `desktop/src/renderer/glass.ts`, the orbit layout: it assigns `band: 'deep'` itself and paints through `paintOrbit`, so it does not depend on Glass's quiet band.

## Risk scan

No trigger applies: no new dependency, env var, path or exposure. It removes work from the frame rather than adding it.

## Next Actions

- [ ] **Superseded in direction by [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]], which should be settled first.** What survives here is one question for Edwin: should every band, the quiet one included, place what fits and state the rest, the way the front and mid bands already do?
- [ ] ~~Edwin decides between the three.~~ If he takes option 2 this is an [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]-sized decision rather than a bug fix: it amends DES-0002, answers one PHASE-0002 exit criterion and rewords another, so it is recorded as an ADR and this issue closes against it.
- [ ] Then a task under [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]], and [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]], [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]] and [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] are resolved against the decision rather than built.
## Planned, 2026-09-12

**Edwin answered the one question this note left open, and the answer is yes.** He wrote, on the plan: "Fully agree, plan the full solution and on ISS-0078: do as suggested." The suggestion was that every band, the quiet one included, places what fits and states the rest, the way the front and mid bands already do.

**That is a capacity, never a deletion.** The quiet band stays drawn. It stops being the one band that promises to draw every note it holds, exactly as the front band stops at twenty. The withdrawn recommendation — stop drawing the shelf — is not planned and not built.

Recorded in [[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]] as a rule over all four bands, and built by [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]] (the capacity and the remainder in the deal) and [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]] (the bar's sentence and the compass). The ADR-sized decision this note anticipated exists, and it records the fourth band and the capacity rule together.
