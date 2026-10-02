---
type: "[[task]]"
id: TASK-0095
title: "Model an exact derived collection on the desk"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: []
blocks: ["[[TASK-0096-Draw-And-Operate-The-Collection-In-Glass]]"]
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Model an exact derived collection on the desk

## Definition of Done

- [x] A collection is the list of the view on screen, and the store keeps one layout for it per view: where it stands, its size, whether it is collapsed and how it is presented. Beside that the store keeps one search text and one set of filters for all windows, as it did before. It keeps no row, id or count. The selected row and the scroll position belong to the window and are not stored. Shown by the `collection` suite's test "the store keeps a collection's place, size, collapse and presentation, per view, and no row", by the smoke run's `collection` check "what the store keeps of a collection is where it stands and how it is presented, and none of its rows" (its keys read "collapsed h presentation w x y"), and by the `glass-desktop` walk's check "the store keeps where it stands and how it is presented, and none of its rows".
- [x] A count resolves to the exact member ids from the current source, including notes outside the visible field; a changed result is announced before reordering under a pointer. Shown by the `collection` suite's test "the count resolves to exactly the rows it counts, including notes with no place in the field"; by the smoke run's `collection` check that the header reads "144 notes" for 144 notes in the source; by the `glass-desktop` walk's check "every counted member has a row in the list, including notes held under another" (144 rows for 144, none missing); by the `glass-scale-your-trainer` walk, where 1393 members are counted, 1260 are in the list only, and one of those (REQ-0185) opens from its row with its text; and by the `collection-refresh` walk's checks "the collection announces that notes changed, how many of each kind, and offers to apply it" and "until then no row has moved, arrived or left under the pointer".
- [x] The collection's layout obeys the existing save and reload rules per view, and an address still restores its view and its note with the collection on the field; automated checks cover those. Shown by the `collection` suite (the layout is kept per view and per workspace, clamped, and read back from a state file), by the smoke run's `collection` checks that read the store back after each resize, move and collapse, by the `glass-desktop` walk's check "after a reload the collection is where it was, the open documents are open at their sizes with their text, and the count is read again from the source", and by the smoke run's `address` part (4 checks). An address names a view and a note and has never carried desk geometry, so no check opens an address and then reads the collection's place.

- [x] Old saved desks without collection fields reopen with safe defaults; persisted state holds the view, the search text, the filters and the layout, and no rows. Shown by the `collection` suite's tests "a state file written before collections existed loads, and a junk entry is no layout" and "a view with nothing stored draws the default collection, down the left of the field", and by the smoke run's first `collection` check, where nothing is stored for the view and the collection stands at 12,12, 340 by 653 in a field of 1140 by 677. No state file saved by an older build was opened in the application; that is step 9 of [[TST-0063-A-Collection-And-Full-Note-Share-Glass]].
- [x] Refresh offers an explicit apply step without reordering under the pointer; if a selected subject leaves the result, its document stays usable and the collection explains why. Shown by the `collection-refresh` walk, 10 checks of 10: the collection reads "3 notes changed: 1 added, 1 removed, 1 changed" with apply, 88 rows hold their order until apply is pressed, the deleted note's document keeps its 6650 characters labelled as last read, and the collection then reads "ISS-0008 is no longer in this list; its document stays open". The smoke run's `switch` part shows the same announcement on the workspace itself: "1 note changed: 1 changed", with one apply button and no card moved until the person acted.
- [x] Selection and scroll anchor are tracked by note identity so collapse/expand and document close restore context. Shown by the `collection` suite's tests "the scroll anchor is a note, so the list comes back to the same row and not the same pixels" and "a note listed under two headings is kept by the heading its row was under"; by the `glass-desktop` walk's check "opened again it has the size it had and is scrolled to the same row" (FEAT-0004, 18 px from the top, before and after); by the smoke run's `keys` check that Delete on a document's header returns the keyboard to the row it was opened from, 0 px from where that row stood; by the `collection-refresh` walk's check "the list is still scrolled to the same note, at the same place"; and, with the list narrowed and a note open, by the `glass-collection` walk's check on the collapsed header, where the collection is 340 by 693, FEAT-0020's row is marked and the list is 60 px down, before it is collapsed and after it is opened again.

## Steps

- [x] Trace current `NavigatorList` rows, view descriptions and desk serialization. The result is in the header comment of `desktop/src/renderer/collection-view.ts`: the same `#navigator` element is moved into the collection while Glass is on screen and moved back for Spread and List, so no row behaviour was written twice.
- [x] Define collection identity and state ownership, then implement exact membership and restoration. The rules are in `desktop/src/shared/collection.ts` and the store's part in `desktop/src/shared/store-state.ts` (commits `762bdfd`, `598ecc9`, `d91fc7e`).

## Notes

This task uses existing sidecar groups. It does not create the cockpit's proposed four-flow payloads.

**Where the evidence is from.** Every smoke check and walk cited above ran on 2026-10-02 at commit `e86b2e4`, in the Linux container (the `project-os-deck-smoke` image, Electron under Xvfb). The smoke run's `collection` part held 17 checks of 17. The node suites passed 589 of 589 the same day at the same commit; 17 of them are the `collection` suite ([[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]]). The walks are [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]] (two scripts, `glass-desktop` and `glass-collection`), [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]] and [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]].

**What the first box said before.** It put the filters and the selected note inside the collection's own stored state. The filters were already the store's, and a view change clears them (ISS-0012). The plan gives the selected row and the scroll position to the window. The box now says what the store holds.

**Two later fixes belong here.** After a view is chosen, the line at the foot of the collection counts its members against that view's field. Before commit `27df2fd` it counted them against the view before, and Features read "0 have a place in the field · 131 are in this list only" while the field had a place for 24. The smoke run's `collection` check "it says where its members are, as the field has dealt them" compares the line with the field's own deal, and would read 0 again if the defect came back.

The second is to the last box. Collapsing the collection and opening it again moved the list by several hundred pixels when a note was open, because the rows under "Joined to what you are holding" were sorted afresh at every redraw. Commit `7103e3c` fixed it, and [[TASK-0096-Draw-And-Operate-The-Collection-In-Glass]] says how.

**What counts as a change to the list, since the review (2026-10-02).** The second and fifth boxes rest on the rule for a changed result, and the independent review showed that rule was too narrow. A result was compared by heading, status, owed mark and title. One that changed only the order of its rows or headings, a note's progress or severity, or the note another is held under was announced as nothing, and the list kept the old rows with nothing to press. The rule now, in `membershipChange`, `changeText` and `anyChange` of `desktop/src/shared/collection.ts` (commit `3fdc530`):

- A refreshed result is a change when it differs in its order or in anything a row shows. It is announced, and applied when the person asks. No row moves before that.
- "What a row shows" is everything the note's card carries, the note's own frontmatter included when the card came from Deck's index. So an edit to a property that no face draws is announced too.
- The announcement counts four kinds of note: added, removed, moved in the list (under another heading, or held under another note) and changed what it shows. A note that moved and also shows something else is counted once, as moved.
- It also names three things no single note explains: the headings are in another order, the rows that stayed under a heading are in another order, or a heading itself changed.
- The chip in the bar above the field and the collection's line take their count from the same comparison. A result that differs only in its order counts no note, and the chip then reads "the list changed its order — show it" (commit `972ce73`).

The decisions are numbered 1 to 5 in [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]], under "Settled while fixing what the review found". Five tests of the `collection` suite hold the rule and are named in [[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]]. What a window shows of it is in [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]], whose walk adds a note, deletes one and changes one status, and makes no order-only change. No check reads the chip's words for an order-only change.

The sentence the two boxes quote, "3 notes changed: 1 added, 1 removed, 1 changed", is what the walk read at `e86b2e4`. The collection now says each kind in more words, such as "1 changed what it shows" and "1 moved in the list". The boxes keep the old sentence until the last verification pass is cited here.

**Two more of the review's findings belong to this task.** Both are fixed, and neither changed a tick.

- The last box. The list comes back to a row by its note and by the heading the row stands under. Reviewer A removed the heading half and the `collection` suite still passed 17 of 17: every case had the list at its top, where the wrong row's answer is stopped at 0 and equals the right one. The test "a redrawn list is held by the row under its own heading, in a list that is scrolled down" now fails without it (commit `798d0b9`). The code did not change.
- The first and third boxes. The store kept any finite place, so a state file could hold a place of 1e300. A stored place is now held between 0 and 100000 px (commit `1c2f523`). A place that is not a number is still no layout.

The acceptance check [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] is a person's walk and has not been walked.
