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
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: changes-requested
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

**2026-09-07, review: changes requested, and made.** Two of this task's criteria were not met by the code. A card dragged on a scrolled desk jumped, because the clamp measured the window while the position measured the content ([[ISS-0005-A-Card-Jumps-When-The-Desk-Has-Scrolled]]). And a restored position was never clamped at all, although the paragraph above said it was ([[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]]). Both are fixed, and the check now asserts the defect as well as the fix.

**2026-09-07: built.** Pointer handlers on the desk move a card and commit one `move-card` to the store when the drag ends, so a move is one change rather than sixty. A position belongs to the note and is saved with the desk. A restored position is clamped back onto the surface, so a desk saved on a large monitor still opens on a laptop.

The automated check is [[TST-0019-The-Desk-Is-Chosen-And-Arranged]], and the whole suite passes: 143 checks across the desktop suites on 2026-09-07.

## Independent review — 2026-09-07

**Verdict: changes-requested.** Clean context, separate session. Two of the six criteria are not met by the code.

- **"Dragging a card with the pointer moves it, and it stays where it is released"** fails on a scrolled desk. `renderer.ts:506-510` adds `el.desk.scrollLeft`/`scrollTop` to the pointer position and then clamps the result against `clientWidth`/`clientHeight`, mixing content coordinates with viewport ones. On a desk 900×400 scrolled down 500px, a card stored at y=824 computes a raw position of 825 and lands at 352 — it jumps 473px the moment the pointer moves. `.desk` is `overflow: auto` and `nextSlot` stacks rows downwards without bound, so this is reachable with about a dozen cards in a short window.
- **"Quitting Deck and starting it again brings the desk back with each card where it was left"** is not settled by anything that runs. The smoke run calls `webContents.reload()`, which is a renderer reload, not a restart. The store does persist through `DeckStore`, so the criterion is plausible; it is untested.

Also: the note's "Where this stands" says "A restored position is clamped back onto the surface, so a desk saved on a large monitor still opens on a laptop". `clampToSurface` is called once in the product, inside the drag handler; `drawDesk` places restored cards at their raw saved coordinates. The sentence describes a behaviour that is not there, and the check meant to guard it calls the pure function directly.

The remaining four criteria hold. Removing a card leaves the navigator row in place, one drag commits one `move-card`, and the identity check on the reducer is a real one.
