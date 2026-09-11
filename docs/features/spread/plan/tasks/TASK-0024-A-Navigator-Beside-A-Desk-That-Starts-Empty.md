---
type: "[[task]]"
id: TASK-0024
aliases: ["TASK-0024"]
title: "A navigator panel beside a desk that starts empty, so a desk is a subset a person chose rather than whatever the flow layout produced"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-11
source: ["[[REFERENCE-PHASE-0001-REVIEW]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
parent: "FEAT-0005"
effort: ""
due: ""
depends: ["TASK-0023"]
blocks: []
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: approved
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
tests: ["[[TST-0019-The-Desk-Is-Chosen-And-Arranged]]"]
---

# A navigator beside a desk that starts empty

## Objective

The list and the desk become two different things. A navigator panel down one side lists the current view's notes, grouped as TASK-0023 draws them. The desk beside it starts empty, and a note reaches it only because a person put it there.

## Detail

Today the grid is the list: every note in the view is a card, and the desk is whatever the flow layout produced. That is why "Save desk" saves nothing worth reopening, and why Deck's state file held zero desks after a day of use. The architecture options note already recommended that the lists drive selection ([[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]], Part 2); this task is that recommendation.

Once the desk is a chosen subset, saving one means something: it names which notes a person wanted side by side.

## Acceptance

- Opening a view shows a navigator listing that view's notes, and a desk with nothing on it.
- Clicking a note in the navigator puts a card for it on the desk, and the navigator marks it as being on the desk.
- Clicking it again, or the remove control on the card, takes it off.
- Switching views changes the navigator and leaves the desk alone, so a desk can hold notes from more than one view.
- Saving a desk and reopening it brings back exactly the notes that were on it, and nothing else.
- A desk naming a note the workspace no longer has still opens, without that card, and says how many it dropped.

## Steps

- [x] Split the renderer's card pool into a navigator list and a desk surface.
- [x] Move the desk's contents into the store as an explicit list of note ids, rather than reading it back off the DOM.
- [x] Add put-on-desk and take-off-desk actions, and mark navigator rows that are on the desk.
- [x] Make a view change repaint the navigator only.
- [x] Update the desk save and open paths to read the store's list instead of `getBoundingClientRect` over every card.

## Notes

This changes what [[FEAT-0005-Spread-Cards-On-A-Desk]]'s first acceptance criterion means: a view no longer shows all its notes as cards on the desk. The feature's Acceptance section is updated with this task, and [[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]] needs its Procedure reworded, because it currently tells a person to open a view and watch the desk fill.

## Where this stands

**2026-09-07: built.** The renderer has a navigator down one side and a desk beside it, and the desk starts empty. What is on the desk lives in the store, keyed by workspace, so saving a desk reads that list rather than measuring elements with `getBoundingClientRect`. A click in the navigator puts a note on the desk and opens it in the reader; a second click takes it off. Changing the view repaints the navigator and leaves the desk alone.

The automated check is [[TST-0019-The-Desk-Is-Chosen-And-Arranged]], and the whole suite passes: 143 checks across the desktop suites on 2026-09-07.

## Independent review — 2026-09-07

**Verdict: approved.** Clean context, separate session. Every criterion is met by the code as written. The desk is an explicit list in the store keyed by workspace, `select-view` leaves it untouched by construction, `save-desk` reads the store rather than the DOM, and `reconcileDesk` opens a desk naming a vanished note without that card and reports how many it dropped, which `drawDesk` puts in the desk label.

Two things the criteria do not reach, recorded as leads rather than blocking this task. `CardPool.models` and `NavigatorList.cards` are keyed by note id and never cleared, so both maps grow across every view and workspace change for the life of the window. And `NavigatorList` recovers a row's index with `this.rows.indexOf(row)` when the caller already holds it, which is quadratic in the row count; the same handler then looks the card up by id instead of using the row's own card, so when a note appears in two groups the handler receives whichever model painted last.

**Amended 2026-09-11 ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]).** Edwin asked that day for a desk for each view, with some notes kept on every view. The acceptance line "Switching views changes the navigator and leaves the desk alone, so a desk can hold notes from more than one view" no longer holds: each view has its own desk, and switching view shows that view's. A note marked "on every view" is what still crosses views, and a state file written before the change reads every held note as on every view, so nothing on screen changed on the day it landed.
