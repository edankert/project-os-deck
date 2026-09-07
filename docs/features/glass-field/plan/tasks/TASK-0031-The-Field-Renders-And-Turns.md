---
type: "[[task]]"
id: TASK-0031
aliases: ["TASK-0031"]
title: "The field renders and turns: near bands as bound cards, the quiet band on one canvas, fog instead of blur, and a card a real pointer can hit"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
parent: "FEAT-0009"
effort: ""
due: ""
depends: ["TASK-0029", "TASK-0030"]
blocks: ["TASK-0032", "TASK-0034"]
related: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[TASK-0028-A-Card-Face-Per-Type]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]"]
tests: []
---

# The field renders and turns

## Objective

The field appears on screen. The front and mid bands are real elements, one per note, drawn with the faces Spread already has and able to take focus. The quiet band is one canvas of small id tiles. Distance is drawn with fog and with less detail, never with blur. Dragging or the arrow keys turn the cylinder, a compass shows how many notes are behind, and a card can be hit with a real pointer.

## Detail

This is the review's hybrid renderer. DES-0002 argued for a pool of about 120 elements recycled across the corpus, and listed what pooling costs: no animation across a recycle, no find-in-page, no accessibility tree, no per-element state. The review pointed out that the quiet band already gave those up, since it carries only an id, a status and a bar, and that the wire overlay already moves to a canvas past 200 edges. So the near bands stay bound, at most about 52 elements plus what is on the desk, and the quiet band is painted on the canvas that will later carry the wires. The pool disappears, and the four costs apply only to the band that never had the affordances.

The faces are `desktop/src/shared/faces.ts` ([[TASK-0028-A-Card-Face-Per-Type]]), reused as they are: a phase shows progress, an issue its severity, a test its last walk. The far tiles show id, status band and, where there is one, the progress bar, because a bar survives being small and a sentence does not. Fog is one gradient painted once. Nothing that sits over the field carries a backdrop filter, and layer promotion is applied to the near bands only.

DES-0002 lost two revisions to a click that never landed, because a preserve-3d container is an invisible pane in front of everything it contains, and because the check used a synthetic click that never hit-tests. The containers here are pointer-transparent and the cards are not, and the check drives a real pointer sequence through the smoke run rather than calling a click method.

The renderer is served as well as hosted ([[FEAT-0008-One-Renderer-Two-Hosts]]), so it works in Safari on a tablet with touch, where a far card is opened by flying to it first.

## Acceptance

- The front and mid bands are drawn as elements bound to their notes, and switching view does not reuse an element for a different note.
- The quiet band is drawn on one canvas, and the document holds no element for a quiet note.
- No stylesheet rule applies `filter: blur` to a card or `backdrop-filter` to anything over the field, asserted by a test over the built stylesheet.
- `will-change` is set on near-band cards only, asserted the same way.
- Dragging the field and pressing the arrow keys turn it; the compass shows the count of notes behind the person at every yaw.
- A pointer sequence (down, move, up) at the centre of a front card, driven through the smoke run, reaches that card and not a container.
- The field draws and turns in Safari on a tablet served by Deck's own host, and a far card opens by fly-then-open.

## Steps

- [ ] Draw the near bands from the slot geometry with the existing card element and faces; give each card a role and a tab stop.
- [ ] Draw the quiet band on a canvas from the same geometry, tiles carrying id, band colour and bar.
- [ ] Paint the fog once and set the detail level by band; remove any blur and any backdrop filter.
- [ ] Add turning by drag and by arrow keys, the compass with the behind-count, and turn-end re-assignment.
- [ ] Make containers pointer-transparent and add the real-pointer check to the smoke run.
- [ ] Add the stylesheet test for blur, backdrop filter and `will-change` scope.
- [ ] Walk it in Safari on the tablet and record what touch needed.
- [ ] Write the automated test notes and link them from `tests:`.

## Notes

The compass exists because the review's literature says to expect the quiet band to become a forgetting machine: Cockburn and McKenzie found no retrieval benefit from the third dimension, and depth as a place to store things is where the evidence is against the design. The count is on screen at all times so that nothing is quietly lost, and [[PHASE-0002-Glass]] asks whether anyone turns to look behind after a week.
