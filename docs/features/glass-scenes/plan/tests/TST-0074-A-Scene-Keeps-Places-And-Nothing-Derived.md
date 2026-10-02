---
type: "[[test]]"
id: TST-0074
aliases: ["TST-0074"]
title: "A scene keeps places and nothing derived: what it holds and never holds, a reading position found again by its heading, an old desk that still opens, a newer version left alone, and the desk before a scene put back"
status: active
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[TASK-0106-Keep-A-Scene-In-The-Store]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/scenes.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh scenes"
covers: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]"]
issues: []
tasks: ["[[TASK-0106-Keep-A-Scene-In-The-Store]]"]
artifacts: []
adequacy: "Each of fifteen rules in scenes.ts was broken once on 2026-10-02 at commit 972ce73, after the independent review's fixes, and the suite run: all fifteen fail a test. Fourteen were first broken before the review, when a saved scene with no name, a field of no size and a list naming another workspace's scenes failed nothing until commit 69301dd added a test. The fifteenth, a passage under the second of two equal headings found under the first, was added after the review. The list does not hold the wait for documents' text or the rule for a scene's name; the session that added each broke it once by hand. The Adequacy section names the test each break fails."
mutation_score: "15 rules broken by hand, 15 caught (2026-10-02, commit 972ce73); 14 of 14 before the review's fixes, and 11 of 14 before commit 69301dd. Not a mutation tool's run."
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
---

# A scene keeps places and nothing derived

## Purpose

REQ-0004 says a scene restores where things stood and reads everything else live. Whether that holds is decided before anything is drawn, in one pure module, `desktop/src/shared/scenes.ts`, and in the store's scene actions in `desktop/src/shared/store-state.ts`. This suite checks both without a window.

The suite is `desktop/tests/scenes.test.mjs`. It was committed with nine tests in `b1bfa1d` on 2026-10-02 and had ten from `69301dd`. The fixes for the independent review added twelve, and it has twenty-two since `972ce73`.

The status is `active` and not `ready`. A test with a `command:` records no verdict on its note; the run is the verdict (`tools/instructions/STATUSES.md`, `[[test]]`). A reviewer noted that the note rests at `active` while the feature reports the suite passing. That is this rule, and it is kept.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh scenes`.

## Expected results

These are what the twenty-two tests assert, reconciled with the suite file on 2026-10-02 at commit `972ce73`. A line marked "since the review" is asserted by a test the review's fixes added or changed.

- A scene built from a state has exactly these keys and no other: `anchors`, `cards`, `collection`, `field`, `filters`, `name`, `query`, `savedAt`, `version`, `view`, `workspaceId`. Each card holds a note id, a place and a size. No key can hold a row, a member id, a count, a note's text, a yaw, a zoom, a focus, an open list, an emphasis or an undo record without the test failing.
- A scene written to disk and read back is the same object.
- A reading anchor is the last heading at or above the top of the view, how far past it, and the scroll fraction. With no heading above, it holds no heading and the scroll position. A document that does not scroll has a fraction of 0.
- An anchor is found again under its heading when text was added above that heading. When the heading is gone the fraction is used and the result says the passage moved. The position is never past the end of a text that got shorter.
- Since the review: an anchor also records which heading with those words it is, counted from 1. A position 60 pixels into the second "Steps" goes back to the second "Steps", also after text is added above both. A position saved without a count means the first. When the second "Steps" has been taken out of the text, the fraction is used and the passage is said to have moved. Above the first heading there is no count. The count is kept through a save, the state file and a read, and a count that is not a whole number from 1 is dropped.
- An anchor for a note that is not on the scene's desk is not saved.
- Opening a scene brings its view, its search text, its filters, its collection layout and its documents at their places and sizes. Another view's desk is not touched.
- Since the review: a scene saved while the list had never been moved is saved with no layout for it. Reopening it takes the stored layout away, leaves another view's list alone, and survives the state file. Where nothing is stored for any list, a reopen writes nothing about lists.
- Since the review: a scene with no search and no filters of its own clears the ones typed since. A desk saved before scenes leaves both as they are.
- The desk that was there before is built by the window with the same function a scene is built with, and `apply-scene` puts it back. Since the review the desk kept is that of the view the scene replaces. With a scene opened from another view, putting back shows the view the person was on with its search, filters and documents, and on the scene's own view the note that was open there is back where it stood and the list is the table it was. Putting back adds nothing to the list of saved scenes, and no scene is named as open.
- Since the review: a scene replaces the desk of the view it was saved on. A desk from before scenes, a scene that lost its view and an entry this Deck cannot read replace nothing on another view: the view on screen is the one kept.
- Since the review: a desk that is not in the list is applied only when it is this workspace's and of the version this Deck reads. Another workspace's scene, versions 3, 1 and the text "2", a desk with no version, things that are not a desk and a state with no workspace open are each refused with the state unchanged. A refused desk does not switch to the view it would have gone back to. The same desk, as this workspace's own, is applied.
- Since the review: "back to the desk before" puts the list back as it was, and a list that had no stored layout has none again.
- A note kept on every view stays when a scene is opened, and is on the desk once.
- Rename keeps every field under a new key, and the open scene's name follows it. Renaming onto a name that is taken, or onto a blank name, changes nothing. Delete removes the scene. `restore-desk` puts the deleted object back under its key, and does not replace a scene saved under that name since.
- Since the review: a name the address refuses is not saved and not renamed to: 65 characters, a tab, a line break. A name of 64 characters, and one with spaces, an apostrophe, an accent and a slash, is saved, and its address parses back to it.
- A desk saved with `save-desk` has no version, is listed as a desk, and opens on the view that is on screen with its cards and no search of its own. A stored entry holding only a name, a workspace and cards reads as exactly that.
- A stored entry of version 3 keeps every field through a load and a save, including fields this Deck has never heard of. It is listed as unreadable with the sentence "saved by a different Deck (version 3); this one reads version 2, so it is kept and not opened". It is not opened and not replaced by a scene saved under its name. Since the review: it is not replaced by `save-desk` and not renamed, the controls offer neither "open" nor "rename" for it and do offer "delete", and deleted and restored it is back whole.
- Since the review: an unreadable entry whose `cards` is not a list, or that has no `cards`, is written back as it was, and the list of scenes claims no notes for it.
- Since the review: an entry of version 1, of the text "2", of 2.5 or of null is said to be "saved by a different Deck", with the version written as it is stored, and never "newer".
- A version 2 entry whose fields are not what they should be is read with those fields dropped.
- Since the review: the wait for documents' text is always answered, once. A request for nothing is answered before it returns. A second request made while the first is waiting answers the first with what it had found, and the first one's unread documents keep their place for when they are read. A note with no document on the desk keeps no place.
- The report names missing notes, a smaller field with the documents drawn inside it, and moved passages, one sentence each. It is empty when nothing changed and when the field is larger. It never mentions a count or members.
- Since the review: a document with no stored size counts at the size it is drawn at when the report says what fits a smaller field: the view's reading size, or 560 wide when nobody has resized a note there. A size of its own wins over the view's.
- A stored entry with no name, or with no workspace, is not read as a scene. Only the desk a window keeps for its undo, which is never saved, may be unnamed. A field whose width or height is zero, negative or not a number is dropped, and a field's size is rounded to whole pixels. The list of scenes names one workspace's scenes and no other's.

## What the suite does not assert

- **That opening a scene is one store revision.** `open-desk` on a scene returns one new state from one call (`applyScene` in `store-state.ts`), and no test counts revisions.
- **That opening changes no reading-size preference and no session value.** No test compares `readingSizes` before and after. The scripted walk compares the focus, the open list, the relationship picked out, the turn and the zoom in a window ([[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]).
- **A byte-for-byte comparison of an entry this Deck cannot read.** The test compares the parsed object field by field. Until `ff25f28` the reader replaced `cards` with an empty list when such an entry's `cards` was not a list; it no longer does, and a test holds that.
- **A comparison with the commit before scenes.** The old-desk test opens a desk saved with `save-desk` and checks what it does. It does not run the earlier code beside it.
- **What a window does with these rules.** No node suite loads the renderer. So nothing here shows what "save scene", "rename" and "save desk" say when they refuse a name or ask before replacing, that the served page opens no scene from an address, or that `desktop/src/renderer/glass.ts` uses the wait this suite tests. The scenes walk has a check for "save desk", for the served page and for a scene with no note open (TST-0076). What the two controls say of a refused name is not walked.
- **That "restore" refuses a name the address refuses.** It does not. `restore-desk` puts back what was deleted, unchanged. The feature note's Review section records this as left.

## Evidence

- **2026-10-02, after the independent review.** The commits `bb99700`, `093c198`, `ff25f28`, `52dcd6c`, `22678b9`, `509c770`, `61625e7`, `fd8b6a9`, `426e3ec`, `4f5d266` and `972ce73` brought the suite from ten tests to twenty-two. No full run on the fixed code is cited here yet. This close-out read the twenty-two tests against the list above and did not run the suite.
- **2026-10-02, commit `5e66f48`, by the two reviewers.** Each ran this suite and the handoff suite in a clone of its own. Reviewer A reports "both suites pass 28 of 28 after the last restore", and reviewer B "`scenes` plus `handoff` pass 28 of 28 after the restore". Both took a guard out of `apply-scene` and report that nothing failed; see "Defects the independent review found" below.
- **2026-10-02, commit `e86b2e4`.** `npm test` in `desktop/` ran every suite, this one among them: 589 of 589 passed. The session that built the feature ran it and reported the count. The second close-out did not run the suite. It read the ten tests the suite then had.
- **2026-10-02, commit `69301dd`,** the commit that added the tenth test.
- **2026-10-02, commit `b1bfa1d`,** the commit that added the suite: 550 of 550, nine of them these tests, by that commit's message.

## Defects the independent review found, and the test that now holds each

Two reviewers read the feature at `5e66f48` on 2026-10-02. Each probed the store with a script of its own and ran this suite. The verdict on this test was *refuted*: a guard could be taken out with every test passing, and no test gave the store the inputs below. Each row is fixed in the commit named, and the test named is in this suite. "Fails without it" means the fixing commit's message says the test fails with the fix taken out.

| What the reviewer saw | Reviewer | Fixed in | The test that holds it |
| --- | --- | --- | --- |
| With the workspace check and the version check taken out of `apply-scene`, every test passed. | both | `61625e7` | "a desk that is not in the list is put on the desk only when it is this workspace's and of the version this Deck reads". Fails without either check. |
| A scene saved while the list had never been moved kept no layout, and reopening it left the list where it had been dragged since. | both | `bb99700` | "a scene saved while the list had never been moved puts the list back to having no place of its own". Fails without it. |
| "Back to the desk before" left the list as the scene put it, when the desk before had no stored layout. | both | `bb99700` | ""back to the desk before" puts the list back as it was, a list that had no place of its own included". Fails without it. |
| A scene opened from another view replaced its own view's desk and list for good; the undo put back only the view on screen. The suite asserted that as intended. | both | `093c198` | "opening a scene brings back its view, search, collection and documents, and can be taken back", which now asserts the replaced desk and list are back. Fails without it. Also "a desk from before scenes, and one this Deck cannot read, replace nothing on another view". |
| An old-style `save-desk` under the name of a scene this Deck cannot read replaced it; its version and unknown fields were gone. `rename-desk` renamed it. | both | `ff25f28` | "a scene of a version this Deck does not know is kept untouched, listed as unreadable, not opened and never changed". Fails without it. |
| An unreadable entry whose `cards` was absent or not a list was written back with `"cards":[]`. | A | `ff25f28` | "an unreadable scene is written back with every field it had, a missing or malformed list of cards included". Fails without it. |
| An entry of version 1, or of the text "2", was listed as "saved by a newer Deck". | both | `ff25f28` | "an entry whose version is not this Deck's is said to be from a different Deck, not a newer one". The commit does not say it was broken to see this fail. |
| A reading position under the second of two headings with the same words went back to the first, and nothing was reported as moved. | A | `52dcd6c` | "a reading position under a heading whose words occur twice goes back to that one, not the first". Fails with the first-match lookup put back. |
| A scene with no document that had text reopened with no message: the wait returned before it answered. Read in the code, not run. | A | `22678b9` | "putting documents back where they were read is always answered, once, a request for nothing included". Fails without it. |
| A note arriving during a scene's reopen replaced the scene's wait, so its report never appeared. | A | `22678b9` | "a second request while the first is waiting answers the first, and its unread documents keep their place". Fails without it. |
| A scene was saved under a name of 65 or 70 characters, or renamed to one with a tab, and its address was then refused. | both | `509c770` | "a scene's name is a name its address accepts: one the address refuses is not saved, and not renamed to". Fails with the store's check taken out. |
| The smaller-field sentence said "Everything still fits" for a document with no stored size at x 850 in a field 900 wide. | both | `fd8b6a9` | "a document with no stored size counts at the size it is drawn at when a scene says what fits a smaller field". Fails with the zero-size count put back. |

Three more were found by the session that fixed these, in its own changes or beside them.

- After `bb99700` a workspace with no stored layout gained an empty table of layouts on reopening. Commit `426e3ec` leaves the table alone, and the list test asserts it is the same object afterwards.
- An undo that could not be applied still switched to the view it was going back to. Commit `4f5d266` leaves the state as it was, and the `apply-scene` test fails with that guard taken out.
- A scene with no search and no filters of its own left the ones typed since standing. Commit `972ce73` clears them, with the test "a scene with no search and no filters of its own clears them, and a desk from before scenes leaves them".

One thing a reviewer raised is kept as it is: a note kept on every view is not put at the scene's place when a scene is reopened. It belongs to every view and not to the scene. The test "a note kept on every view stays when a scene is opened, and is not doubled" asserts it, and both reviewers broke that filter and saw the test fail.

## Adequacy (who verifies this test?)

Each rule of `scenes.ts` that the building session could name was broken once and the suite run, to see whether a test fails. The list below is the run of 2026-10-02 at commit `972ce73`, after the review's fixes: fifteen rules were broken and each fails at least one test. This close-out copied the record of that run and did not repeat it. Where the record cuts a line short, the tests that can be read are named and the cut is said.

Fourteen of the fifteen were first broken before the review. At that first try eleven failed a test; the three marked "since `69301dd`" failed nothing until that commit added the test they now fail. The fifteenth was added after the review.

| The rule as broken | The tests that then fail |
| --- | --- |
| A reading position for a note that is not on the desk is kept in the scene | "a scene keeps the view, the search, the collection, each document and where it was read, and nothing derived"; "rename keeps the scene, delete removes it, and restore puts it back only into the gap it left" |
| A scene of a version this Deck does not know is taken for one it can open | "a desk from before scenes, and one this Deck cannot read, replace nothing on another view"; "a desk that is not in the list is put on the desk only when it is this workspace's and of the version this Deck reads"; "a scene of a version this Deck does not know is kept untouched, listed as unreadable, not opened and never changed"; "an entry whose version is not this Deck's is said to be from a different Deck, not a newer one". The record is cut off after the fourth. |
| A desk saved before scenes is taken for one that cannot be read | "a desk saved before scenes opens exactly as it did" |
| The reading position is taken from a heading further down than the top of the view | "a reading position is kept by the heading above it, and found again when text is added above"; "a reading position under a heading whose words occur twice goes back to that one, not the first" |
| A passage is never found again by its heading | the same two tests |
| A passage under the second of two equal headings is found under the first (added after the review) | "a reading position under a heading whose words occur twice goes back to that one, not the first" |
| A passage whose heading is gone is not reported as moved | "a reading position is kept by the heading above it, and found again when text is added above"; "a reading position under a heading whose words occur twice goes back to that one, not the first" |
| A note that is no longer in the workspace is not reported | "a reopened scene says what is not as it was saved, and nothing about the count" |
| A smaller field is not reported | "a document with no stored size counts at the size it is drawn at when a scene says what fits a smaller field"; "a reopened scene says what is not as it was saved, and nothing about the count" |
| A scene of an unknown version loses the fields this Deck does not know | "a scene of a version this Deck does not know is kept untouched, listed as unreadable, not opened and never changed"; "an unreadable scene is written back with every field it had, a missing or malformed list of cards included" |
| A reading position for a note the scene does not hold survives a reload | "a scene with fields that are not what they should be opens with those fields dropped" |
| A saved scene may have no name (since `69301dd`) | "a saved scene has a name, a field has a size, and the list is one workspace's" |
| A field of no size is kept (since `69301dd`) | the same test |
| The list of scenes names another workspace's scenes too (since `69301dd`) | the same test |
| A scene keeps a card with more than its place and size | "a scene keeps the view, the search, the collection, each document and where it was read, and nothing derived" |

**What the list does not cover.** The breaks were chosen by the session that wrote the code, one per rule it could name, and a rule nobody named was not broken. Two rules the review's fixes added are not in the list: the wait for documents' text (`ReadingWait`) and the rule for a scene's name. The session that added each broke it once by hand, and its commit says which test failed (`22678b9`, `509c770`). The same is true of the other fixes in the table of defects above, except where that table says the commit does not claim it. Nothing was broken for the two changes whose commits name a test and do not say it was seen to fail: the table of layouts left alone (`426e3ec`), and the search and filters cleared (`972ce73`). The things under "What the suite does not assert" have no break, because no test covers them.

The two reviewers each broke guards of their own on 2026-10-02 at `5e66f48`. Taking the filter out of `applyScene` that keeps a note on every view from being put on the desk twice failed one test for each reviewer. Taking the workspace check and the version check out of `apply-scene` failed nothing for either; the first row of the table of defects is the test added for it.
