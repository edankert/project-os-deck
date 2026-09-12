---
type: "[[issue]]"
id: ISS-0070
aliases: ["ISS-0070"]
title: "While a note stands in the middle, each of its neighbours is on screen twice — as a small ring note and as its own dimmed field card — and the opened note itself leaves a dashed frame in its slot, so one note is two things on the deck"
status: "open"
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: "2026-09-12"
source: ["Edwin 2026-09-12, running Deck: 'it shows associated notes around the note in the middle but this using a very small view of the notes, why not the same size view as when browsing?'; 'the notes circling the note now all of a sudden change back to normal notes and are showed around the note (they might overlap with existing notes already visible in that location)'; 'When opening a note the corresponding smaller version seems to turn into just a frame, this should not be the case, there should only be one note on the deck.'"]
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[DES-0002-The-Glass-Cockpit]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# One note is drawn twice while another is in the middle

## Problem

**Open a note in Glass and the same note can be on screen in two places at once.** Each neighbour gets a small ring note near the middle while its ordinary field card stays where it was, faded to about a quarter opacity, and the note that was opened leaves a dashed empty outline in the slot it came from. Edwin's rule after seeing it is one line: there should only be one note on the deck. The ring notes are also much smaller than a field card — 168 by 44 against 186 by 92 — so the neighbourhood is harder to read while it is the thing being looked at than it was before the note was opened.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "it shows associated notes around the note in the middle but this using a very small view of the notes, why not the same size view as when browsing?"
> "Also the notes circling the note now all of a sudden change back to normal notes and are showed around the note (they might overlap with existing notes already visible in that location)"
> "When opening a note the corresponding smaller version seems to turn into just a frame, this should not be the case, there should only be one note on the deck."

## Cause

Three separate decisions add up to the double image, and none of them was taken with the other two in view.

1. **The ring paints new elements.** [[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]] built `RingView` (`desktop/src/renderer/ring-view.ts`), which draws a `.ring-card` per neighbour at the places `focusLayout` returns. `MINI` in `desktop/src/shared/focus-ring.ts` fixes that card at 168 by 44 with a one-line title, chosen so the ring's geometry could guarantee the places clear the pane.
2. **The field keeps its own cards.** `redeal()` in `desktop/src/renderer/glass.ts` returns early while a note is in the middle, exactly so the field "keeps its slots" (FEAT-0017 decisions 9 and 10). Every field card, the neighbours included, stays in the document; `.field.focusing .field-card { opacity: 0.28; }` in `desktop/src/renderer/deck.css` is all that separates them.
3. **A lifted note leaves a ghost.** `.field-card.ghost` is a dashed transparent outline with its contents hidden. This is [[DES-0002-The-Glass-Cockpit]]'s own rule, restated in [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]: "its slot stays behind, ghosted, so you can see the hole and put it back". It predates the middle by two features, and it was never reconsidered when the opened note stopped standing where its card had been.

## Repro

1. `cd desktop && npm start` and switch to the Glass surface on a view with linked notes.
2. Click a card that has neighbours. It grows, moves to the middle, and the ring gathers.
3. Look at the slot the clicked card left: a dashed empty rectangle.
4. Look at any ring note and then find the same id on the field behind it: both are drawn.

## Expected

One note is one card. A neighbour that has come to the ring is not also standing in its slot, and the note in the middle is not also a frame somewhere else. A ring note is as readable as a card the person was browsing a moment earlier.

## Actual

Up to sixteen notes are drawn twice, in two different sizes, and the opened note leaves an outline where it was.

## Two ways out, and they are not the same design

1. **Move the cards, do not copy them.** The ring seats the neighbours' own `.field-card` elements at the ring places, at their browsing size, and takes them out of the deal while they are there; the field card of the opened note becomes the pane. Nothing new is drawn, so nothing can be drawn twice, and Edwin's "same size view as when browsing" is met by construction. The cost is real: `focusLayout` sizes the ring from `MINI`, and a 186 by 92 card on a 640 by 480 pane's ring needs a wider curve, so fewer places fit before "+N more" starts — roughly six to eight on a 1440-wide field where sixteen fit today. It also means the ring's places and the slot geometry must agree about one element, where today they own separate ones.
2. **Keep the ring's own cards, and hide what they stand for.** The ring card stays a separate element but grows to the field card's size and detail, and every note that has a ring card or a pane is skipped by `drawCards()` rather than dimmed, and the ghost is dropped. Cheaper to build, and the ring keeps its geometry, but two elements still describe one note and the next feature that draws a note somewhere will have the same choice to make again.

The first is the honest answer to "there should only be one note on the deck" and is what this issue recommends. The second is what to do if the ring's capacity matters more.

Either way the ghost goes, which **reverses a stated DES-0002 decision** and needs Edwin's word: the ghost exists so a person can see the hole and put a note back in the slot it came from. If it goes, put-back has to land the note somewhere, and the honest replacement is that the slot stays reserved (no other note is dealt into it) without anything being drawn there.

## Evidence

- `desktop/src/shared/focus-ring.ts`: `export const MINI = Object.freeze({ width: 168, height: 44 });` against `CARD_BOX` 186 by 92 in `desktop/src/shared/slots.ts`.
- `desktop/src/renderer/deck.css`: `.field.focusing .field-card { opacity: 0.28; }` and `.field-card.ghost { background: transparent; border: 1px dashed ...; }`.
- `desktop/src/renderer/glass.ts`, `redeal()`: the early return while `focusId() !== null`, with the comment "the field keeps its slots".
- Read on 2026-09-12 by the main session while Edwin had Deck running.

## Sibling search

No sibling found (searched `docs/issues/` for "ghost", "ring", "twice", "duplicate", "mini"). [[ISS-0066-A-Pane-Header-Shows-Through-The-Pane-Above-It]] is about stacking within the panes, not about one note appearing twice.

## Risk scan

No trigger applies: no new dependency, env var, path, artifact or exposure. Option 1 changes what the frame loop moves and should be measured against [[PHASE-0002-Glass]]'s frame-rate criterion before it is called done.

## Next Actions

- [x] **Edwin chose option 1 and dropped the ghost, 2026-09-12.** Recorded below.
- [ ] Amend [[DES-0002-The-Glass-Cockpit]]: the ghost is gone, and the slot a lifted note left is reserved rather than drawn.
- [ ] Then tasks under [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]], with a smoke check that counts the drawn elements per note id while a note is in the middle and fails at two.

## Decision record

> [!note] Accept — 2026-09-12 (user:edwin)
> 1. move the cards, do not copy!
> Drop the filed-card ghost it doesn't work!

**The capacity cost named in option 1 is gone.** It assumed the ring had to fit inside the visible field. [[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]] and [[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]] were both answered on the same day with the opposite rule — the arrangement is laid out in a space larger than the window, and neighbours may stand off-screen — so full-size cards on the ring no longer cost places. What it costs instead is that some neighbours are off-screen until the person turns to them, which is the point of those two decisions.
