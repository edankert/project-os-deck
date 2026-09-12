---
type: "[[issue]]"
id: ISS-0077
aliases: ["ISS-0077"]
title: "Glass creates and destroys one DOM element per note and never uses the card pool Spread built to prove the approach, so the retrofit FEAT-0005 warned about is exactly what making finished notes clickable now costs"
status: triage
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["Edwin 2026-09-12, on ISS-0073: 'On the other issue, wasn't this supposed to be handled by using a pool wasn't that the whole initially intended solution and we would build spread first to prove it and then build glass on top?'"]
severity: medium
component: renderer
parent: ""
related: ["[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "[[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# Glass draws one element per note and never uses the pool

## Problem

**Edwin's memory is right and the record confirms it: the pool was the intended solution, Spread built it, and Glass does not use it.** `CardPool` in `desktop/src/renderer/cards.ts` opens with the reason — "The pool is here from the start rather than added later: a view of a thousand notes would otherwise create a thousand elements, and retrofitting that means rewriting the renderer that assumed one element per note." Its only caller is `desktop/src/renderer/renderer.ts`, Spread's desk. Glass has its own `cardEls` map, its own `makeCard()`, and creates and removes an element per note.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "On the other issue, wasn't this supposed to be handled by using a pool wasn't that the whole initially intended solution and we would build spread first to prove it and then build glass on top?"

## Cause — a decision, recorded, with a reason that has now expired

This was not an oversight. [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] says it in one line under its measurement: **"The hybrid is kept. Nothing here asks for the pool DES-0002 proposed."**

The hybrid is what made that true. The near bands hold at most about 84 slots — 20 in front, 64 in the mid band — so an element per note there is 84 elements, and a pool saves nothing. Everything beyond them is a rectangle on a canvas, which costs no elements at all. With that split, the pool was genuinely unnecessary, and the measurement backed it: 729 to 2,303 elements across three workspaces, every one holding a 16.7 ms frame.

**The moment a finished note becomes an ordinary card, that reason is gone.** The canvas was the thing standing in for the pool. [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] proposes taking it away for up to 286 notes at once, and then Glass is exactly the renderer FEAT-0005 warned about: one element per note, created and destroyed as the person turns.

## What the pool does and does not buy

Worth being exact, because the pool answers half of Edwin's cost question and not the other half.

- **It caps creation and listener churn.** Turning into a quiet band of cards would build and tear down hundreds of elements, each with its own `pointerdown`, `keydown`, `focus` and `blur` listeners, several times a minute. A pool makes that a reassignment of `data-note-id` on elements that already exist.
- **It does not cap the live element count.** Even with a perfect pool, 286 visible cards is 286 boxes the browser lays out and composites every frame. That cost is the browser's own style, layout and compositing — precisely what the 2026-09-10 measurement says it leaves out. So the pool does not make ISS-0073 free; it makes the turn smooth while the frame stays as expensive as the number of visible cards.

## The reason Glass cannot simply use `CardPool` as it stands

`CardPool.render` assigns `pool[i]` to `cards[i]` — a **positional** pool. A note therefore changes element whenever the list order changes, which is fine for a desk of absolute positions and wrong for the field, where a view switch animates each card from its old slot to its new one. [[PHASE-0002-Glass]]'s second exit criterion tests exactly that and its evidence reads "11 of 12 cards kept their elements across a switch and moved, none reused". A positional pool would break a criterion that is already ticked.

**So the shape to reach for is a free list, not a positional pool.** Keep Glass's map from note to element, which is what preserves identity and the animation; on removal, return the element to a free list instead of calling `element.remove()`; take from the free list before creating. Identity survives, the churn goes, and `CardPool` stays Spread's. Whether the two should later share one module is a question worth asking once both exist, and not before.

## Expected

A turn into a large quiet band of cards does not allocate hundreds of elements, and a note keeps its element while it is on screen.

## Repro

Not visible today: the quiet band is a canvas, so the churn this describes only appears once [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] is built. Read from the code on 2026-09-12.

## Evidence

- `desktop/src/renderer/cards.ts`: `CardPool`, its opening comment, and `render()` assigning `this.pool[i]` to `cards[i]`.
- `grep` for `CardPool` across `desktop/src/renderer/`: `cards.ts` defines it, `renderer.ts` is the only caller.
- `desktop/src/renderer/glass.ts`: `private readonly cardEls = new Map<string, HTMLElement>();`, `makeCard()` calling `document.createElement`, and the removal loop calling `element.remove()` after the leave animation.
- `docs/features/glass-field/FEAT-0009-The-Field-Where-Depth-Carries-Priority.md`, "Measured": "The hybrid is kept. Nothing here asks for the pool DES-0002 proposed."
- `docs/phases/PHASE-0002-Glass.md`, exit criterion 2: "11 of 12 cards kept their elements across a switch and moved, none reused".

## Sibling search

No sibling found (searched `docs/issues/` for "pool", "element", "churn", "recycle").

## Risk scan

No trigger applies: no new dependency, env var, path or exposure. A free list changes what the frame loop allocates, so the measurement in [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] is retaken with it.

## Next Actions

- [ ] This is owed **only if** [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] is answered by making finished notes cards. If [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]] keeps the promoted set small, or the promotion is by apparent size ([[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]] step 3), the churn may never be large enough to matter. Measure before building.
- [ ] Then a task under [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]: a free list in `glass.ts`, a check that a turn across a large quiet band allocates no new elements after the first pass, and the measurement retaken.
