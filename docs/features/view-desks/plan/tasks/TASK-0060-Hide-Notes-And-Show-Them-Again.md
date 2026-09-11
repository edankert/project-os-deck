---
type: "[[task]]"
id: TASK-0060
aliases: ["TASK-0060"]
title: "Hide notes: one button hides every held note in this window and shows them again, and the field reclaims the space the panes covered"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "Edwin 2026-09-11: 'I need a button to hide everything (all the open items) on the desk.'"]
parent: "FEAT-0015"
effort: "S"
due: ""
depends: []
blocks: ["TASK-0063"]
related: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0030-The-Slot-Geometry]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Hide notes

## Objective

One button in the top bar hides every note held in the window, and the same button shows them again at the same places. No note is put back and the store does not change. This is the first sentence of Edwin's request, and it does not depend on the desk per view.

## Detail

**The button** (decision 1). It sits in the top bar's right-hand group, beside Copy address. It reads "Hide notes" while notes are shown and "Show N notes" while they are hidden, where N is the number of notes on this window's drawn desk. It is a real button in the tab order with `aria-pressed`, and the `H` key toggles it from anywhere in the window except a text field. It is shown on Glass, Orbit and Spread when at least one note is held, or while notes are hidden, and absent on List. Hiding and showing say what happened in the status line, for example "3 notes hidden; H shows them".

**The state belongs to the window.** A boolean in the renderer, beside the field's turn (the yaw). Not a store action, not in the state file, not in an address, not shared with a second window. A reload shows the notes. Because it dispatches nothing, the served tablet page offers the same button.

**Glass and Orbit.** Hidden panes are not drawn, and they stop being obstacles to the slot geometry, so the field deals cards into the space they covered ([[TASK-0030-The-Slot-Geometry]]). The held notes keep shaping the field (decision 2): their neighbours stay in the front band, shared notes stay marked, ghosted slots stay, and the navigator's group of held notes still lists them. The bar's count of held notes stays.

**Spread.** The desk's cards are not drawn, and the desk area says how many are hidden. Save desk still saves the desk, which is unchanged.

**Showing again** (decision 3). The button, `H`, or a lift made in this window shows every note again. A note that arrives from another window while hidden, by a throw or a desk panel, does not; the count on the button rises.

## Acceptance

- With two panes held in Glass, one click on Hide notes leaves no pane drawn, and the store's desk is identical before and after.
- While hidden, the field deals a card into a place a pane covered, and the neighbours of the held notes are still in the front band.
- The button reads "Show 2 notes"; clicking it, or pressing `H`, draws both panes at their places and sizes.
- In Spread, the same button hides and shows the desk's cards; the desk is unchanged.
- `H` typed into the navigator's search box types a letter and does not toggle.
- Lifting a note while hidden shows every note again.
- After a reload the notes are shown; a second window never hid them; no address carries the state.
- The button is absent on List and when nothing is held.

## Steps

- [x] Add the button to `desktop/src/renderer/index.html` and its style to `deck.css`.
- [x] Keep the hidden flag in the renderer; toggle it from the button and from `H`, guarded against text fields.
- [x] In `desktop/src/renderer/glass.ts`, skip painting panes and drop their obstacles while hidden; show again on a lift.
- [x] In `desktop/src/renderer/renderer.ts`, skip Spread's desk cards while hidden and say how many.
- [x] Leave the smoke checks to [[TASK-0063-The-Smoke-Run-Drives-Desks-Per-View-And-Hide]], which lists them.

## Notes

The hidden flag's name, and any helper it needs, is the implementer's choice. What matters is that nothing outside the window can see it.

## Outcome

**Done 2026-09-11.** "Hide notes" sits in the top bar and `H` toggles it from anywhere a letter is not being typed. The hidden flag is a variable in the renderer, so it is gone after a reload and no other window or address sees it. In Glass the pane layer is hidden and `paneObstacles()` returns nothing while it is, so the field deals cards into the space the panes covered; the held notes still shape the front band. In Spread the desk's cards are hidden by a class on the page. A lift in the same window, from the field or the navigator, shows the notes again. The button reads "Show N notes" while hidden and is absent on List, in a note or Needs-you panel, and when nothing is held. The smoke checks are [[TASK-0063-The-Smoke-Run-Drives-Desks-Per-View-And-Hide]]'s.
