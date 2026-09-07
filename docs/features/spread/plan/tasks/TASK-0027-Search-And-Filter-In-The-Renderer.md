---
type: "[[task]]"
id: TASK-0027
aliases: ["TASK-0027"]
title: "Search and filter live in the renderer, because a pooled DOM means the browser's own find cannot see the notes"
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
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[REFERENCE-COCKPIT-ADOPTION]]"]
tests: []
---

# Search and filter in the renderer

## Objective

A search box narrows the navigator to the notes whose id or title matches, and filters narrow it by status and by type. Deck owns the search because Deck owns the DOM.

## Detail

The card pool draws only the elements that are on screen, so the browser's own find command cannot see a note that is not currently drawn. That is the reason the adoption table's `shell.stage.find` row says the application owns search when the DOM is pooled. It is not an optimisation to add later: a person looking at Your Trainer's 409 issues with no search box is scrolling.

## Acceptance

- Typing into the search box narrows the navigator as the person types, matching on note id and on title.
- A note that matches but was not drawn before the search still appears, so the pool is not the limit of what search can find.
- Clearing the search restores the full list, with the same groups and the same fold states as before.
- Filtering by status shows only notes at those statuses, and the group counts update to what is shown.
- Search and filter apply to the navigator and leave the desk alone, so searching does not disturb an arrangement.
- Searching Your Trainer's Issues view for an id lands on that issue in under a second.

## Steps

- [ ] Hold the current query and filters in the store, so a second window sees the same narrowing.
- [ ] Match against the full card model rather than the drawn elements.
- [ ] Recompute group counts from what survives the filter.
- [ ] Add checks over the matching function, including a note that is outside the drawn window.

## Notes

This moves the adoption table's `shell.stage.find` row toward `adopted`; the row is not moved until the task is done and the walk is made.
