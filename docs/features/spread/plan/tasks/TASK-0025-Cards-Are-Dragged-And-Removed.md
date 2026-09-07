---
type: "[[task]]"
id: TASK-0025
aliases: ["TASK-0025"]
title: "Cards are dragged and removed, and where a card was left is what the desk saves"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[REFERENCE-PHASE-0001-REVIEW]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
parent: "FEAT-0005"
effort: ""
due: ""
depends: ["TASK-0024"]
blocks: []
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[TST-0004-A-Desk-Reopens-As-It-Was-Left]]"]
tests: ["[[TST-0019-The-Desk-Is-Chosen-And-Arranged]]"]
---

# Cards are dragged and removed

## Objective

A person moves a card with the pointer and it stays where they put it. That position is what the desk saves and what it restores.

## Detail

There is no drag handler and no pointer handler anywhere in `desktop/src/renderer/` as of 2026-09-07. Cards sit where the flow layout puts them, which is why the word "arrange" does not yet describe anything Deck does. Arranging cards on a desk across screens is the whole claim Spread makes over the cockpit's four fixed panes, and nothing in the application tests that claim until this lands.

Keep the pool. A card that is dragged is a pooled element whose position moved, not a new element, and the position belongs to the note rather than to the element.

## Acceptance

- Dragging a card with the pointer moves it, and it stays where it is released.
- A card can be removed from the desk, and removing it does not remove the note from the navigator.
- Quitting Deck and starting it again brings the desk back with each card where it was left.
- Saving a desk by name, moving the cards, and reopening that desk puts them back where they were when it was saved.
- Dragging one card does not move any other card.
- A card dragged past the edge of the window stays reachable rather than disappearing off-screen.

## Steps

- [x] Add pointer handlers to the desk surface, with the position held in the store per note and per desk.
- [x] Add a remove control to the card, wired to the take-off-desk action from TASK-0024.
- [x] Persist positions with the desk, and clamp a restored position that falls outside the current window.
- [x] Add a check over the position model that a move changes one card and no other.

## Notes

Pointer input is the part a machine check cannot settle on its own; the reducer that holds positions can be tested without Electron, the same way the window placement decision already is.

## Where this stands

**2026-09-07: built.** Pointer handlers on the desk move a card and commit one `move-card` to the store when the drag ends, so a move is one change rather than sixty. A position belongs to the note and is saved with the desk. A restored position is clamped back onto the surface, so a desk saved on a large monitor still opens on a laptop.

The automated check is [[TST-0019-The-Desk-Is-Chosen-And-Arranged]], and the whole suite passes: 143 checks across the desktop suites on 2026-09-07.
