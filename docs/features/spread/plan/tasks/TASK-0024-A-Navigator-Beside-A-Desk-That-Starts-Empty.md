---
type: "[[task]]"
id: TASK-0024
aliases: ["TASK-0024"]
title: "A navigator panel beside a desk that starts empty, so a desk is a subset a person chose rather than whatever the flow layout produced"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[REFERENCE-PHASE-0001-REVIEW]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
parent: "FEAT-0005"
effort: ""
due: ""
depends: ["TASK-0023"]
blocks: []
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
tests: []
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

- [ ] Split the renderer's card pool into a navigator list and a desk surface.
- [ ] Move the desk's contents into the store as an explicit list of note ids, rather than reading it back off the DOM.
- [ ] Add put-on-desk and take-off-desk actions, and mark navigator rows that are on the desk.
- [ ] Make a view change repaint the navigator only.
- [ ] Update the desk save and open paths to read the store's list instead of `getBoundingClientRect` over every card.

## Notes

This changes what [[FEAT-0005-Spread-Cards-On-A-Desk]]'s first acceptance criterion means: a view no longer shows all its notes as cards on the desk. The feature's Acceptance section is updated with this task, and [[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]] needs its Procedure reworded, because it currently tells a person to open a view and watch the desk fill.
