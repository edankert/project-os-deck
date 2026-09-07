---
type: "[[task]]"
id: TASK-0032
aliases: ["TASK-0032"]
title: "A view switch re-arranges the same cards, and a change arriving mid-view is announced rather than applied"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
parent: "FEAT-0009"
effort: ""
due: ""
depends: ["TASK-0031"]
blocks: []
related: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]"]
tests: []
---

# A view switch re-arranges

## Objective

Switching from one view to another moves the cards that are in both views to their new places, fades out the ones that leave and fades in the ones that arrive. A person watches a note change importance. And when the notes change underneath the field, because the store or the sidecar reports a change, the field says so with a count and re-deals only when the person acts.

## Detail

The cards are positioned by transform already, so the move is a transition on transform with no measurement step; the design's FLIP reference is dropped, as the review asked. The rules come from the evidence the review collected. Heer and Robertson found animated transitions help when they keep object constancy, last about one second and never reuse a mark for a different datum; that is the design's own "cross-fade, never cross-morph", and it is why the near bands are bound rather than pooled. Chevalier, Dragicevic and Franconeri measured staggered transitions and found the stagger negligible or worse for tracking, so the cards move together rather than in a wave.

A change arriving mid-view is the other half. The cockpit made staleness something the shell reports rather than silently reloads, and a field that re-deals under the pointer is the automation surprise the review names. A change from the store ([[FEAT-0003-One-Store-In-The-Main-Process]]) or from a refreshed payload shows a chip with the count, and the field applies it when the person clicks the chip or switches view. A change to the note the person is holding is the exception and is applied at once, because holding a stale note is worse than a moving card.

## Acceptance

- A card present in both the old and the new view moves along a transform transition of about one second and keeps its element.
- A card that leaves the view fades out in place, and a card that arrives fades in at its slot; no element slides from one note's place to another note's.
- Cards move together; no per-card delay is applied.
- Under reduced motion the switch is a cut, and the newly focused card is highlighted and scrolled into view in the navigator.
- A payload change while the field is on screen shows a chip with the number of notes changed and does not move any card until the chip is clicked or the view is switched.

## Steps

- [ ] Add the transform transition and the fade rules to the bound cards; remove any stagger.
- [ ] Apply the reduced-motion substitute.
- [ ] Subscribe to the store's change and to payload refreshes; hold the change and show the chip with its count.
- [ ] Apply the held change on click or on view switch, and at once for the held note.
- [ ] Add the checks: element identity across a switch, no stagger, the chip's count, the deferred re-deal.
- [ ] Write the automated test notes and link them from `tests:`.

## Notes

The cockpit's rule this extends is that a change is stated, never applied silently. The adoption table's `shell.live` row moves when this lands, because it is the first place Deck announces a live change.
