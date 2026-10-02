---
type: "[[issue]]"
id: ISS-0070
aliases: ["ISS-0070"]
title: "While a note is open in Glass, each of its neighbours is shown twice, and the opened note leaves an empty dashed frame where it was"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-10-02
source: ["Edwin 2026-09-12, running Deck: 'it shows associated notes around the note in the middle but this using a very small view of the notes, why not the same size view as when browsing?'; 'the notes circling the note now all of a sudden change back to normal notes and are showed around the note (they might overlap with existing notes already visible in that location)'; 'When opening a note the corresponding smaller version seems to turn into just a frame, this should not be the case, there should only be one note on the deck.'"]
reported_by: user:edwin
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[DES-0002-The-Glass-Cockpit]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]", "[[PHASE-0002-Glass]]", "[[TASK-0104]]", "[[DES-0003]]"]
tests: ["[[TST-0052]]", "[[TST-0045]]", "[[TST-0051]]"]
---

# An opened note's neighbours are shown twice, and the note leaves an empty frame

## Problem

**Open a note in Glass and each of its neighbours is shown twice: as a small card around the opened note, and as its own faded card where it stood before.** Each neighbour gets a small ring note near the middle while its ordinary field card stays where it was, faded to about a quarter opacity, and the note that was opened leaves a dashed empty outline in the slot it came from. Edwin's rule after seeing it is one line: there should only be one note on the deck. The ring notes are also much smaller than a field card — 168 by 44 against 186 by 92 — so the neighbourhood is harder to read while it is the thing being looked at than it was before the note was opened.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "it shows associated notes around the note in the middle but this using a very small view of the notes, why not the same size view as when browsing?"
> "Also the notes circling the note now all of a sudden change back to normal notes and are showed around the note (they might overlap with existing notes already visible in that location)"
> "When opening a note the corresponding smaller version seems to turn into just a frame, this should not be the case, there should only be one note on the deck."

## Fixed, 2026-10-02

**A note opened in Glass is now drawn once: its neighbours are the field's own cards, moved to seats round its document at the size they are browsed at, and the opened note leaves no frame behind.** A seat is the place one card takes beside the document. Edwin's option 1 was built in `81d4632` (TASK-0104): the renderer that painted ring copies, `ring-view.ts`, is deleted, and the ghost is no longer drawn. The opened note's slot is kept for it and nothing is drawn there.

**The check that shows the defect gone** is in the `focus` part of the smoke run ([[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]), which opens a note with a real click in a real window. In the pass of 2026-10-02 at `e86b2e4` it read: "one note is one object: no card is drawn for the open note (0), no note is drawn twice (none), and there is no ghost (0), no copy on a ring (0) and no "+N more" (0)". It counts the field cards drawn for each note id, and the elements the old build drew. If the defect came back, a neighbour drawn as a second card would be named in the "drawn twice" list, a copy on a ring would make its count 1 or more, and a frame left behind would make the ghost count 1. Any of those fails the check.

Four more checks in the same run bear on it, and all passed:

- "every neighbour is seated round the document, each once, none over the document or another card (14 seated of 14 neighbours…)". For the note with the most neighbours it found 220 places for 220: 218 seated cards and 2 notes that were already documents.
- "a seated card is the size a card is browsed at: 138.2 to 138.2 px wide against 138.2 by 68.4 for the front-band card straight ahead, not the 168 by 44 of a copy". This is the half of the report that asked why the neighbours were shown so small.
- In the `lift` part: "the lifted note is drawn once, as its document: the field draws no card for it (0) and no ghost (0), and still holds its slot".
- In the orbit: the opened note has no card and no dot, and none of its 28 neighbours is also a dot or drawn twice.

Three scripted walks checked the same thing in that pass. `focus-neighbourhood` opened FEAT-0015 and found "no note is drawn twice, and the open note has a document and no card", with its 44 neighbours each one card. `glass-desktop` found "the open note is one object: no card is drawn for it and no neighbour is drawn twice". The `glass-scale` walks found 63 neighbours here and 217 in Your Trainer each seated once. The geometry suite `focus-ring` ([[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]) checks that a seat is the browsing size and that every neighbour gets one.

The smoke run opens ISS-0069 where it used to open this issue. Until this pass it had marked this issue, ISS-0071 and ISS-0072 as notes that need somebody; all three are `fixed` now, and this pass was made with them fixed.

What is not shown:

- Nobody has walked [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]], and the ledger holds no verdict for it. Edwin has not yet seen the repair in a walk.
- No check that runs in a window was broken on purpose to see it fail. The checks were written after the fix, so none has been seen failing on this defect. The two reviewers of FEAT-0017 ran node suites only on 2026-10-02 and marked "drawn once, without a duplicate card or ghost" *not checked*, because only a window could settle it. They did break the geometry suite on purpose; TST-0051 says what that showed under "Adequacy".
- One thing the review found bears on this issue, and it is fixed. A neighbour for which no card could be made still took a seat, and the seat stood empty. Since `b3646d0` such a neighbour is given no seat and stays in the document's list. No route through the application produces such a neighbour today, so no walk shows it; the geometry suite holds the rule.
- The frame time the risk scan below asks for was taken in the Linux container only, which draws in software: with 217 cards seated, 16.7 ms between frames at the median and 33.3 ms at the 95th percentile while turning. Nothing was measured on the Mac. That measurement is the open box in [[TASK-0104]].

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

## Implementation ownership

[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]] built the repair under FEAT-0017, together with ISS-0071 and ISS-0072. "Fixed, 2026-10-02" above says what shows it.

## Next Actions

- [x] **Edwin chose option 1 and dropped the ghost, 2026-09-12.** Recorded below.
- [x] Amend [[DES-0002-The-Glass-Cockpit]]: the ghost is gone, and the slot a lifted note left is reserved rather than drawn. Done 2026-10-02, as a dated amendment under "So opening is lifting".
- [x] Then tasks under [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]], with a smoke check that counts the drawn elements per note id while a note is in the middle and fails at two. Done as TASK-0104; the check is "one note is one object" in the `focus` part of the smoke run, which passed at `e86b2e4` on 2026-10-02.

## Decision record

> [!note] Accept — 2026-09-12 (user:edwin)
> 1. move the cards, do not copy!
> Drop the filed-card ghost it doesn't work!

**The capacity cost named in option 1 is gone.** It assumed the ring had to fit inside the visible field. [[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]] and [[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]] were both answered on the same day with the opposite rule — the arrangement is laid out in a space larger than the window, and neighbours may stand off-screen — so full-size cards on the ring no longer cost places. What it costs instead is that some neighbours are off-screen until the person turns to them, which is the point of those two decisions.

## Checked against the code, 2026-09-19: still true, kept

This is the record of that day's check. The defect it confirms was fixed on 2026-10-02; see "Fixed, 2026-10-02" above.

**What a user notices:** Each neighbour of the opened note appears twice, in two sizes, and the opened note leaves a dashed empty outline in its old place. The small copies are harder to read than the cards the person was just browsing.

Evidence: `desktop/src/shared/focus-ring.ts:37` still sizes the ring cards at 168 by 44 (`MINI`). `desktop/src/renderer/deck.css:596` still only fades the field cards (`.field.focusing .field-card { opacity: 0.28; }`), and `deck.css:710-715` with `desktop/src/renderer/glass.ts:989` still draws the ghost Edwin asked to drop on 2026-09-12.

**Belongs to:** FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours (PHASE-0002-Glass). Bigger: it changes what Glass draws and Edwin will want to see it. **Next:** Amend DES-0002 to drop the ghost, then a FEAT-0017 task that moves the neighbours' own cards onto the ring, with a smoke check that fails when one note id is drawn twice.

Checked as part of project-os-dev FEAT-0036 (TASK-0141).
