---
type: "[[task]]"
id: TASK-0056
aliases: ["TASK-0056"]
title: "Reach: hovering a card on the desktop, or pressing and holding it on the tablet, draws wires to what it is joined to and counts the neighbours behind you, before anything is lifted"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[FEAT-0014-The-Hands]]", "[[REFERENCE-GLASS-PHASE-REVIEW]]"]
parent: "FEAT-0014"
effort: ""
due: ""
depends: ["TASK-0036"]
blocks: []
related: ["[[FEAT-0014-The-Hands]]", "[[FEAT-0010-Lifting-A-Note]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0031-The-Field-Renders-And-Turns]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]"]
tests: ["[[TST-0044-The-Neighbourhood-Is-Read-Once-And-A-Throw-Is-Recognised]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Reach

## Objective

Before a person lifts a card, reaching for it shows what it is joined to. On the desktop, resting the pointer on a card for a short time draws wires from it to every neighbour on screen and the compass says how many neighbours are behind. On the tablet, pressing and holding does the same. Moving away clears it. Nothing is lifted and nothing is written.

## Detail

**In the plan a note's relationships arrived only after a lift.** [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]] brings the neighbourhood to the front band while a note is held, which is the strong form. But a person deciding which of forty cards to lift has no way to see what any of them is joined to without lifting each in turn. Reaching is the cheap form: the same data, drawn as wires, on the card the hand is near.

**The data is the read TASK-0036 adds, cached.** `/api/cockpit/context` returns a note's linked notes and backlinks grouped by type, one request per note. Reach fires the request after a stated hover time, so a pointer passing over a band of cards fires nothing, and caches the answer per note per index revision, so a second reach for the same note in the same state of the workspace makes no request. Lifting a reached note reuses the cached context rather than asking again.

**The wires are drawn on the canvas.** [[TASK-0031-The-Field-Renders-And-Turns]] puts the quiet band on one canvas, and DES-0002 moves wires to a canvas past 200 edges. A reach draws a handful of wires from the card's edge on the bearing of each neighbour, the anchoring rule the design settled in rev 5, on that canvas. Neighbours in the near bands get a rim highlight as well as a wire. Neighbours in the quiet band get a wire to the tile. Neighbours that are behind the person are not drawn; the compass counts them and says so, so the reach is honest about what is out of view.

**Touch and keyboard.** On the tablet a press-and-hold of the stated time shows the reach and a release without movement clears it; a tap still opens by flying first. In the navigator, focusing a row shows the same reach on the field, so a keyboard user sees the same wires a pointer user does.

## Acceptance

- Resting the pointer on a near card for the stated time makes one context request and draws a wire to every neighbour on screen; moving the pointer off clears the wires within a frame.
- Passing the pointer across a band of cards without resting makes no request.
- A second reach for the same note in the same index revision makes no request; a change to the workspace's revision invalidates the cache.
- Neighbours behind the person are counted on the compass and not drawn.
- On the tablet, press-and-hold shows the reach and release clears it; a tap flies and opens as before.
- Focusing a navigator row shows the reach for that row's note.
- The wires are on the canvas, and no element is added to the document for a reach.

## Steps

- [x] Add the reach timer and the per-note, per-revision cache over the context read; share the cache with the lift.
- [x] Draw the wires and the rim highlights on the canvas from the slot geometry's positions; count the neighbours behind on the compass.
- [x] Add press-and-hold on touch and the navigator focus route.
- [x] Extend the smoke run: a rest that draws, a pass that does not request, a second rest that does not request.
- [x] Write the automated test notes and link them from `tests:`.

## Notes

This is not [[FEAT-0001-The-Corpus-Has-An-Inside]]'s edge overlay. That draws every edge of the corpus from one payload; this draws the few edges of one note from a read Deck already makes. When the graph payload exists the reach can read from it instead, and the wires do not change.

## Outcome

**Done 2026-09-10.** Resting the pointer on a card for **450 ms** (`REACH_REST_MS`) reads its neighbourhood through the shared cache and draws a wire on the canvas from the card's edge to each neighbour on screen; neighbours in the near bands also get a rim. Neighbours out of sight are counted on the compass. Moving off clears it. On touch, a press of **500 ms** does the same and a release clears it. Focusing a navigator row, or a card from the keyboard, reaches for it too.

**A mouse press does not reach.** The first build reached for a card whenever it took focus, and a press focuses it; the smoke run showed that a focus arriving late cancelled the reach under the pointer. Only keyboard focus (`:focus-visible`) reaches now, and every pointer that can hover reaches by resting, not only one reported as a mouse.

**Evidence.** [[TST-0044-The-Neighbourhood-Is-Read-Once-And-A-Throw-Is-Recognised]] for the cache and the timings; [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]: a pass across a band asks nothing, a rest reaches with at most one request, moving off clears the wires, a second rest asks nothing, and no element is added to the document.
