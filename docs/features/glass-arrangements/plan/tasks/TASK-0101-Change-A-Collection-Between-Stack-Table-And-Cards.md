---
type: "[[task]]"
id: TASK-0101
title: "Change a collection between stack, table and cards"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
parent: "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"
effort: medium
due: ""
depends: ["[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]"]
blocks: []
related: ["[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
tests: ["[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
---

# Change a collection between stack, table and cards

## Definition of Done

Each ticked box ends with what shows it. "The walk" is the scripted walk `glass-arrangements` ([[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]), which held 51 of 51 checks in the Linux box on 2026-10-02 at `e86b2e4`, on this repository's Features view: 144 notes, 59 when narrowed by "glass". "The scale walk" is `glass-scale` on a copy of Your Trainer ([[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]), 8 of 8 in the same pass, with 1393 notes in the view. The suites `arrange` and `collection` are part of the 589 of 589 that `npm test` passed at `e86b2e4`. "The smoke run" is the Glass section of the smoke run. Its `arrange` part (4 checks) and its `collection` part (17 checks) all passed in the pass's loopback run at `e86b2e4` with each check printed (389 passed, 0 failed in the whole run).

- [x] One collection changes between its header alone (the stack), the complete table and cards, and keeps the same members, the same count, the filter, the note that is open and the row the table was scrolled to. This box first said "selected identity". The list has no selected row: what the build keeps is the open note and the row the table was scrolled to, held by the note it is for. Shown by the walk's checks "as a stack: the header alone, with the same count, the same members and the filter named", "as cards: the same count and the same number of members", "the cards open at the note the table was scrolled to" (FEAT-0015) and "back as a table: the list is on the row it was on, with the same count, members and filter, and no card is left in the collection".
- [x] The stack's header shows the query's name, its exact count and what narrows it. Shown by the walk's check "as a stack: the header alone, with the same count, the same members and the filter named": 34 px high, "59 of 144 notes", "narrowed: “glass”". The name is shown by the smoke run's check "Enter on its header collapses it to the header alone, which still names the view and its exact count" (34 px tall, "Features", "144 notes").
- [x] Opening a collapsed collection shows the form it had before it was collapsed. This box was split from the one above, which first said "expanding restores the selected expanded presentation". Shown for cards by the walk's check "folded while it is cards it is the header alone with the same count and no card drawn; opened again it is cards again, on the row of cards it was on": collapsed it was 34 px high with "59 of 144 notes" and no card, and opened again it drew the same 11 cards from the same row, with the `cards` button still pressed. Shown for the table by the smoke run's checks "Enter on its header collapses it to the header alone … Enter again opens it at that size" and "its ▾ button, pressed, does the same".
- [x] Cards reuse existing note identities and do not duplicate held documents or shared neighbours; the exact table can reach every member. Shown by the walk's checks "with FEAT-0002 open and the collection as cards, no note is drawn twice: the open note is a reference in the cards, not a second card" (one reference for the open note and four for notes gathered round it), "pressing the reference finds the open document" and "every member is drawn as a card on some page of the cards, and nothing else is: 59 members, at most 12 drawn at once", and by the smoke run's check "with FEAT-0002 open and the collection drawn as cards (7 of them; the store says "cards"), a note is still one object: no note has two cards (none), the open note has none (0), and no card is both the collection's and gathered round the document (0)".
- [x] A desk saved before collections had a form opens as a table, and a reloaded collection reads its members again and says when the open note has left the result. Shown by the suite `collection` ('a state file written before collections existed loads, and a junk entry is no layout'; a form nobody defined reads as the table), by the walk's checks "after a reload the documents and the collection are where they were, the collection is still cards, the members are read again from the source, and the undo, which was this window's, is gone" and "what is kept for the collection is its place, size and form: no member, no count and no arrangement", and by the walk `collection-refresh` (10 of 10 in the same pass): "the collection says the open note is no longer in the list and that its document stays open".
- [x] A view whose list cannot be read says so in the collection. This box was split from the one above, which first said "explicit missing-query or missing-note messages". Shown by the walk's checks "a view whose list could not be read says so in the collection, by the view's name and with the reason, and offers to try again; it is not shown as an empty view" and ""retry" reads it again, and the list is there". The walk refused the window's request for the Issues list. The collection then read "Issues could not be read: the sidecar did not answer: Failed to fetch", with a `retry` button and no row. Pressing `retry` once the request was allowed brought the list back with its count, "91 notes".
- [x] Drawing and animation are bounded by visible work while all members remain reachable; meaningful checks cover membership equality, identity and old-state restore. Shown by the suite `arrange`, 'the cards presentation lays the members out in whole rows and draws only what is in view' (every one of 131 members is reached once by moving the first row), by the walk (59 members, at most 12 drawn at once, every member on some page, and the wheel reaching the last row), and by the scale walk's checks "as cards, the collection counts every member and draws only the rows in view" (1393 members, 12 drawn at once) and "End goes to the last cards: the last member is drawn". Membership equality is the walk's, identity is the smoke run's, and the restore of an old state file is the suite `collection`'s.

## Steps

- [x] Read the feature, requirement and design, including state ownership and recovery rules. `desktop/src/shared/collection.ts` cites REQ-0001 and DES-0003 for what a collection may keep.
- [x] Implement this task's behavior and meaningful checks against its definition of done. Commit `b017807`, with the smoke run's `arrange` part in `2bda283` and the walk's checks for a collapsed collection of cards and for a view that cannot be read in `c5af79f`.
- [x] Record evidence and reconcile affected documentation before closing. The evidence is recorded above, from the pass of 2026-10-02 at `e86b2e4`.

## Notes

The task is `done`: every box is ticked, each with a check that held in the pass at `e86b2e4`. Two boxes were open after the first close-out because no check drove them: a collapsed collection of cards opened again from its header, and the message a collection shows when its view cannot be read. Commit `c5af79f` added a check for each to the walk, and both held.

How the three forms are built is recorded in the feature note under Decisions. In short: the stack is the collection collapsed to its header, not a third form, and as cards the members are the field's own cards moved into the collection.

Nothing here was walked by a person. The acceptance check [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]] has not been walked, and that walk is TASK-0103's.
