---
type: "[[test]]"
id: TST-0067
aliases: ["TST-0067"]
title: "A collection counts exactly the notes its view returns, keeps where it stands and never its rows, announces a changed result before applying it, and comes back to the same row"
status: active
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/collection.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh collection"
covers: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]"]
issues: []
tasks: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
---

# A collection counts exactly and keeps its place

## Purpose

The collection is the view's list as an object on the Glass desk. What it is allowed to remember and what it must derive every time is the whole of REQ-0001, and that rule lives in one pure module, `desktop/src/shared/collection.ts`, with the store's part in `desktop/src/shared/store-state.ts`. This suite checks the rule without a window. Since 2026-10-02 it also drives the built collection (`collection-view.js`) and the built list (`navigator.js`) on a stand-in page, `desktop/tests/stand-in-page.mjs`: elements that keep their listeners, take the events a test fires and remember which one has the keyboard. The stand-in page lays nothing out, so nothing here says where anything is drawn.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh collection`.

## Expected results

- The count is the number of distinct notes in the groups the source returned, including notes held under another note, and a note the source repeats is counted once.
- A narrowed list says "N of M notes" and names what narrows it.
- The header says how many members have a place in the field and how many are in the list only.
- What the store keeps for a collection is six values: where it stands, its size, whether it is collapsed and how it is presented. No row, id or count is kept.
- A state file with no collection, or with half of one, opens with the default placement.
- A collection is drawn wholly inside the field it is in, so its resize corner is in reach.
- A refreshed result is a change when it differs in its order or in anything a row shows, and it is not applied by being described. The description counts four kinds of note: added, removed, moved in the list (under another heading, or held under another note) and changed what it shows. A note that moved is counted once, as moved.
- What a row shows is everything the note's card carries. Progress, severity and a title alone are each a change.
- Three things are said about the list itself: the headings are in another order, the rows that stayed under a heading are in another order, or a heading changed (it reads differently, or one with no rows arrived or left).
- A result that differs only in its order is offered with "apply", and applying it is one press. The same result again offers nothing.
- When the selected note leaves the result the text names it, and says its document stays open when one is.
- The scroll position is kept as a note and the heading it is under, so a list that gains rows above comes back to the same row, and a note listed under two headings comes back to the row that was meant.
- While the pointer rests on the list, the row under it stays where it is when rows arrive above it. When that row leaves, the row below it is the one held still.
- Rows that come from the desk keep their order while a person is on the list, and new ones are added after them.
- A list scrolled down is held by the row under its own heading, not by the first row of the same note.
- A stored place further out than 100000 is held to 100000, Infinity included, through the store's reducer and a state file read back. A place that is not a number is no layout.
- Escape during a drag of the collection ends the drag: the collection goes back, what the pointer does afterwards moves nothing, and the store is told nothing. Escape while the collection is resized puts its size back, and the key goes no further.
- On a page that cannot arrange the desk, a collection the Mac collapsed opens and folds for that page, and the store is told nothing. That page keeps its own fold until the Mac folds or opens the list.
- The header's label names only the keys that work on that page and in that field.
- The row and the header each answer whether they took the keyboard, not whether they exist.
- A tablet is told the layout of a workspace it can open, and cannot change it.

## Evidence

This test has a `command:`, so it records no verdict here; CI is the verdict.

**2026-10-02**, commit `e86b2e4`: `npm test` in `desktop/` ran every suite and passed 589 of 589. Seventeen of those tests are this suite's.

The suite began with 13 tests when the collection was built (commit `762bdfd`). Four came with defects the walks found: one about a note listed under two headings (`598ecc9`), and three about rows holding still under the pointer (`d91fc7e`). The last three Expected results above were added on 2026-10-02 to name what those tests check.

What the suite cannot show is the list on screen. That is [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]] and [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]], and the `collection` part of the smoke run, 17 checks of 17 at `e86b2e4`.

**Found by the independent review, 2026-10-02, and now held here.** Thirteen tests were added with the fixes, and one older test was changed to expect the new sentence. No count from a run after the fixes is written here yet.

1. A refreshed result that changed only the order of its rows or headings, a note's progress or severity, or the note another is held under was announced as nothing and could not be applied. Reviewer A's probe printed `rows reordered -> ""`, `groups reordered -> ""`, `progress and severity changed -> ""` and `moved under another parent, same group -> ""`. Fixed in commit `3fdc530`. Held by "a refreshed result in another order is a change, and says which order", "a note whose row or card shows something else is a change: progress, severity, a title alone", "a note held under another note than before has moved, and is counted once", "a heading that reads differently, or an empty one that arrived or left, is a change" and "a refreshed result that differs only in its order is offered, and applying it is one press". The older test, "a refreshed result is compared by note: added, removed, and changed in place", keeps its title and now expects the four kinds and the sentence "3 notes changed: 1 added, 1 removed, 1 changed what it shows".
2. This suite did not fail when the heading match was taken out of `scrollTopForFirst`. Reviewer A changed `rows.find((r) => r.id === anchor.id && r.group === anchor.group)` to match by note alone and the suite passed 17 of 17: every case had the list at its top, where the wrong row's answer is stopped at 0. Held since commit `798d0b9` by "a redrawn list is held by the row under its own heading, in a list that is scrolled down", where the right answer is 560 and the answer by note alone is 10. The code did not change.
3. A change of title alone was asserted by no test: it was the one guard of reviewer B's in this code that could be broken with every test passing. The chip in the bar above the field also counted by a second rule that left the title out. One comparison now feeds both, and a title alone is a case of the second test in item 1.
4. Escape during a drag of the collection left the drag live: the next move of one pixel resumed it and the release stored it (both reviewers, each with a probe). Escape while the collection was resized was not used at all. Fixed in commit `716ae82`. Held by "Escape during a drag of the collection ends the drag: what the pointer does afterwards moves nothing and stores nothing" and "Escape while the collection is resized puts its size back, and the key goes no further".
5. On a served page a collection the Mac had collapsed could not be opened, and the header's label named keys that do nothing there (reviewer B). Fixed in commit `bad5a5c`. Held by "on a page that cannot arrange, a collection the Mac collapsed opens and folds for that page, and the store is told nothing", "a page that cannot arrange keeps its own fold, until the Mac folds or opens the list" and "the header's label names only the keys that work on this page and in this field".
6. Closing a document could leave the keyboard nowhere when its row was not on screen (reviewer B, read and not run). Fixed in commit `fb79f05`. Held by "the keyboard is on a row or on the header only when that element took it".
7. The store kept a place of 1e300 and wrote it to the state file (reviewer A). Fixed in commit `1c2f523`. Held by "a place too far out is held to a bound, so a state file cannot keep 1e300".

**What this suite still cannot show of those.** `desktop/src/renderer/renderer.ts` is loaded by no node suite. So the three lines there that use the comparison in item 1, and what closing a document does with the two answers in item 6, are held by walks: [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]] and the `glass-collection` script of [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]. The chip's words for a list that changed only its order (commit `972ce73`) are drawn in `desktop/src/renderer/glass.ts` and read by no check at all.

**Kept as they are, found while fixing.** A stored width or height that is not finite still makes the whole layout no layout, where a place that is too large is held to a bound. The test "a layout is clamped to what can be read, and one that is not whole is ignored" holds that for a width that is not a number; no test tries an infinite one. In a narrow field `rect()` answers the header's height for a collection whose stored layout is collapsed. Neither has a test, and nobody has decided either.

**The reviewers also noted that this note is `active` and not `passing`.** That is kept. This test has a `command:`, and by `tools/instructions/STATUSES.md` such a test records no verdict on its note; CI is the verdict.

One rule of the list is held by a walk and by no test of this suite. The rows under "Joined to what you are holding" keep their order from one redraw to the next unless the held notes or the focus changed (commit `7103e3c`). The suite's test "rows that come from the desk keep their order while a person is on the list" checks the function that keeps an order. When the order is worked out afresh is decided in `desktop/src/renderer/renderer.ts`, which no node suite loads. The check for it is the collapsed-header check of the `glass-collection` walk in [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]].
