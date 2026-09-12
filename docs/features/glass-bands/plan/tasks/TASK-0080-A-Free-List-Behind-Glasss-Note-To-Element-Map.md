---
type: "[[task]]"
id: TASK-0080
aliases: ["TASK-0080"]
title: "A free list behind Glass's note-to-element map, built only if the measurement asks: a removed card's element is kept and reused, a note keeps its element while it is on screen, and CardPool stays Spread's"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]]", "Edwin 2026-09-12: 'wasn't this supposed to be handled by using a pool wasn't that the whole initially intended solution and we would build spread first to prove it and then build glass on top?'"]
parent: "FEAT-0018"
effort: "M"
due: ""
depends: ["TASK-0079"]
blocks: []
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[PHASE-0002-Glass]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]"]
tests: []
---

# A free list behind Glass's note-to-element map

## Objective

**Build this only if [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]] says the turn allocates too much.** Glass creates an element per note and calls `element.remove()` when a note leaves. If promotion and a fourth band make that churn hundreds of elements on a turn, the elements are kept and reused instead.

## Detail

**Edwin remembered right, and so did the record.** `CardPool` in `desktop/src/renderer/cards.ts` opens with the reason it exists: a view of a thousand notes would otherwise create a thousand elements, and retrofitting that means rewriting the renderer that assumed one element per note. Its only caller is `renderer.ts`, Spread's desk. Glass declined it deliberately — [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] records "The hybrid is kept. Nothing here asks for the pool DES-0002 proposed" — because the canvas was doing the pool's job for every note past the middle. Taking the canvas away is what re-opens the question.

**Two corrections that have to survive into the build.**

- **A pool caps element churn and not the live count.** Even a perfect pool leaves 286 visible cards for the browser to lay out and composite every frame. So this task makes a turn smooth; it does not make a frame cheaper. If the measurement says the frame is the problem, this is the wrong fix and the promotion threshold or a capacity is the right one.
- **`CardPool` is positional** — `render()` assigns `pool[i]` to `cards[i]` — so a note changes element whenever the list order changes. That is right for a desk of absolute positions and wrong for the field, where a view switch animates each card from its old slot to its new one. **[[PHASE-0002-Glass]]'s exit criterion 2 is already ticked on exactly that**: "11 of 12 cards kept their elements across a switch and moved, none reused". Using `CardPool` here would break a criterion that is closed.

**So the shape is a free list, not a pool.** Keep Glass's `cardEls` map from note id to element, which is what preserves identity and the animation. When a card leaves, after its leave animation, return the element to a free list instead of calling `element.remove()`. When a card arrives, take from the free list before calling `document.createElement`. Reset the element's dataset, classes and content on reuse, and keep its listeners, which is where the saving is.

**Whether Glass and Spread should later share one module is a question for when both exist**, and not before. `CardPool` stays Spread's.

## Acceptance

- A turn across a large quiet band, with promotion active, allocates no new element after the first pass.
- A note keeps its element for as long as it is on screen, and across a view switch, which is [[PHASE-0002-Glass]] exit criterion 2 re-checked rather than assumed.
- A reused element carries nothing from the note it held before: no id, no classes, no text, no `data-*`.
- Listeners are attached once per element and are not re-attached on reuse.
- The free list does not grow without limit: it is capped, and what is past the cap is really removed.
- `CardPool` is untouched and Spread behaves exactly as it does today.
- The measurement is retaken with the free list in place, and the numbers go beside the others.

## Steps

- [ ] Return an element to a free list instead of removing it, in the removal loop in `glass.ts`.
- [ ] Take from the free list in `makeCard`.
- [ ] Reset everything a reused element carries, and assert it in the check.
- [ ] Add a check that a turn allocates nothing after the first pass.
- [ ] Re-run the view-switch identity check that PHASE-0002 exit criterion 2 rests on.
- [ ] Retake the measurement and write the numbers beside the others.

## Notes

**This task is not started without [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]'s numbers.** [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] says so itself: measure before building. If the numbers hold, this task is cancelled and the issue closes against the measurement.
