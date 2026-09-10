---
type: "[[task]]"
id: TASK-0032
aliases: ["TASK-0032"]
title: "A view switch re-arranges the same cards, and a change arriving mid-view is announced rather than applied"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-10
source: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
parent: "FEAT-0009"
effort: ""
due: ""
depends: ["TASK-0031"]
blocks: []
related: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[FEAT-0003-One-Store-In-The-Main-Process]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
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

- [x] Add the transform transition and the fade rules to the bound cards; remove any stagger.
- [x] Apply the reduced-motion substitute.
- [x] Subscribe to the store's change and to payload refreshes; hold the change and show the chip with its count.
- [x] Apply the held change on click or on view switch, and at once for the held note.
- [x] Add the checks: element identity across a switch, no stagger, the chip's count, the deferred re-deal.
- [x] Write the automated test notes and link them from `tests:`.

## Notes

The cockpit's rule this extends is that a change is stated, never applied silently. The adoption table's `shell.live` row moves when this lands, because it is the first place Deck announces a live change.

## Outcome

**Done 2026-09-10.** A view switch moves every card present in both views along a transform transition of one second and keeps its element; the rest fade. No card carries a delay, so they move together. Under reduced motion there is no transition.

**A move, once started, runs its whole second.** The first build removed the transition class on the next redraw, and a store broadcast arriving mid-switch made every card jump; the class is now held for the second.

**A change that arrives is announced, not applied.** When Deck's index moves on while the field is on screen, the renderer reads the view again in the background, counts the notes that arrived, left or changed band or status, and shows a chip on the field's bar: "1 note changed — show it". Nothing moves until the chip is clicked or the view is switched. The held notes' pane bodies are refreshed at once, because holding a stale note is worse than a moving card.

**Evidence.** [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]: no card delay, the switch animates, 11 of 12 cards kept their elements across Issues to Features and 10 moved, no element was reused for another note, and the chip counted one change and moved nothing until it was clicked. No two of this repository's views hold the same note, so the notes in both views are a held note's neighbourhood.

**Amended 2026-09-10 (ISS-0061).** The reduced-motion half was not built at close: the switch was a cut but nothing was highlighted. It is now: a view switch that keeps the focused note in view highlights its card and its row, and the smoke run checks it. The mid-view change is now checked on its real path, a navigation read answered with one note changed, rather than through a hook (ISS-0063).
