---
type: "[[task]]"
id: TASK-0027
aliases: ["TASK-0027"]
title: "Search and filter live in the renderer, because a pooled DOM means the browser's own find cannot see the notes"
status: done
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
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: changes-requested
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[REFERENCE-PHASE-0001-REVIEW]]", "[[REFERENCE-COCKPIT-ADOPTION]]"]
tests: ["[[TST-0017-Search-And-Filter-Narrow-The-Navigator]]"]
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

- [x] Hold the current query and filters in the store, so a second window sees the same narrowing.
- [x] Match against the full card model rather than the drawn elements.
- [x] Recompute group counts from what survives the filter.
- [x] Add checks over the matching function, including a note that is outside the drawn window.

## Notes

This moves the adoption table's `shell.stage.find` row toward `adopted`; the row is not moved until the task is done and the walk is made.

## Where this stands

**2026-09-07, review: changes requested, and made.** The status and type filters did not follow a second window, although the search box did, and the navigator's count compared two different countings so it read "230 of 1400" with nothing narrowed ([[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]]). Both fixed.

**2026-09-07: built.** The query and the filters live in the store, so a second window narrows with the first. Matching runs over the whole card model rather than over the drawn elements, which is why a note the pool never drew is still findable. Clearing the search brings back the same groups with the same fold states.

The automated check is [[TST-0017-Search-And-Filter-Narrow-The-Navigator]], and the whole suite passes: 143 checks across the desktop suites on 2026-09-07.

## Independent review — 2026-09-07

**Verdict: changes-requested.** Clean context, separate session. The matching itself is right and well covered; two things around it are not.

- **The counter above the navigator compares two different countings.** `renderer.ts:342` sums each group's top-level cards into `shown` and `renderer.ts:349` prints it against `currentCards.length`, the flattened count including every child. With nothing typed and nothing filtered, the Features view reads as though a narrowing were already in effect. `countCards` in `shared/search.ts` counts children, is asserted by `search.test.mjs:129`, and is called by nothing.
- **The filter dropdowns do not follow another window.** `renderFilters()` is called only from `loadView`, so a second window changing the filter re-narrows this window's list (through `drawNavigator`) while its own select still shows the old value. The search box does follow, at `renderer.ts:350`.

Smaller, and a judgement call: a card kept because it matches keeps all of its children, so with a status filter applied an expanded parent shows notes at other statuses. That is narrower than the fourth criterion reads, and the module says it is deliberate; if it is, the criterion should say so.

The sixth criterion — searching Your Trainer's issues for an id lands in under a second — is not measured anywhere. Matching is O(notes) over about 400 cards, so it is very likely fine; nothing records it.
