---
type: "[[task]]"
id: TASK-0077
aliases: ["TASK-0077"]
title: "A tile large enough becomes a real card: past the promotion threshold a quiet note stops being painted and gets an element, so it is clickable, tabbable and readable with no code of its own"
status: backlog
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

- [ ] Promote in `drawCards()` and skip the promoted in `paintCanvas()`, both from the apparent width.
- [ ] Add the hysteresis and write both numbers in the Outcome.
- [ ] Check the promoted card against every existing card behaviour: lift, pull, push, throw, reach, the navigator's groups and the tab order.
- [ ] Guard the orbit out, the way every other canvas rule in `glass.ts` is guarded.
- [ ] Record in the Outcome how many cards are promoted at 1× on each of the three workspaces, facing the quiet band.

## Notes

This is the seam [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] and [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]] share, which is why they are planned together and built one after the other.

[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]] is still owed after this: most tiles on a large workspace are never promoted, and they must be reachable too.
