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
adequacy: "Each of fourteen rules in scenes.ts was broken once on 2026-10-02 and the suite run. Eleven failed a test at the first try. A saved scene with no name, a field of no size and a list naming another workspace's scenes failed nothing, so commit 69301dd added a test for the three, and all fourteen now fail one. The Adequacy section names the test each break fails."
mutation_score: "14 rules broken by hand, 14 caught (2026-10-02); 11 of 14 before commit 69301dd. Not a mutation tool's run."
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
---

# A scene keeps places and nothing derived

## Purpose

REQ-0004 says a scene restores where things stood and reads everything else live. Whether that holds is decided before anything is drawn, in one pure module, `desktop/src/shared/scenes.ts`, and in the store's scene actions in `desktop/src/shared/store-state.ts`. This suite checks both without a window.

The suite is `desktop/tests/scenes.test.mjs`. It was committed with nine tests in `b1bfa1d` on 2026-10-02 and has ten since `69301dd`.

The status is `active` and not `ready`. A test with a `command:` records no verdict on its note; the run is the verdict (`tools/instructions/STATUSES.md`, `[[test]]`).

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh scenes`.

## Expected results

These are what the ten tests assert, reconciled with the suite on 2026-10-02.

- A scene built from a state has exactly these keys and no other: `anchors`, `cards`, `collection`, `field`, `filters`, `name`, `query`, `savedAt`, `version`, `view`, `workspaceId`. Each card holds a note id, a place and a size. No key can hold a row, a member id, a count, a note's text, a yaw, a zoom, a focus, an open list, an emphasis or an undo record without the test failing.
- A scene written to disk and read back is the same object.
- A reading anchor is the last heading at or above the top of the view, how far past it, and the scroll fraction. With no heading above, it holds no heading and the scroll position. A document that does not scroll has a fraction of 0.
- An anchor is found again under its heading when text was added above that heading. When the heading is gone the fraction is used and the result says the passage moved. The position is never past the end of a text that got shorter.
- An anchor for a note that is not on the scene's desk is not saved.
- Opening a scene brings its view, its search text, its filters, its collection layout and its documents at their places and sizes. Another view's desk is not touched.
- The desk that was there before is built by the window with the same function a scene is built with, and `apply-scene` puts it back: the view, the search text and that view's documents. Putting it back adds nothing to the list of saved scenes.
- A note kept on every view stays when a scene is opened, and is on the desk once.
- Rename keeps every field under a new key, and the open scene's name follows it. Renaming onto a name that is taken, or onto a blank name, changes nothing. Delete removes the scene. `restore-desk` puts the deleted object back under its key, and does not replace a scene saved under that name since.
- A desk saved with `save-desk` has no version, is listed as a desk, and opens on the view that is on screen with its cards and no search of its own. A stored entry holding only a name, a workspace and cards reads as exactly that.
- A stored entry of version 3 keeps every field through a load and a save, including fields this Deck has never heard of. It is listed as unreadable with a sentence naming its version, is not opened, and is not replaced by a scene saved under its name.
- A version 2 entry whose fields are not what they should be is read with those fields dropped.
- The report names missing notes, a smaller field with the documents drawn inside it, and moved passages, one sentence each. It is empty when nothing changed and when the field is larger. It never mentions a count or members.
- A stored entry with no name, or with no workspace, is not read as a scene. Only the desk a window keeps for its undo, which is never saved, may be unnamed. A field whose width or height is zero, negative or not a number is dropped, and a field's size is rounded to whole pixels. The list of scenes names one workspace's scenes and no other's.

## What the suite does not assert

- **That opening a scene is one store revision.** `open-desk` on a scene returns one new state from one call (`applyScene` in `store-state.ts`), and no test counts revisions.
- **That opening changes no reading-size preference and no session value.** No test compares `readingSizes` before and after. The scripted walk compares the focus, the open list, the relationship picked out, the turn and the zoom in a window ([[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]).
- **That the desk put back restores the collection layout and the filters.** The test compares the view, the search text and the documents.
- **A byte-for-byte comparison of an entry of a newer version.** The test compares the parsed object field by field. The reader replaces `cards` with an empty list when a newer entry's `cards` is not a list, so "exactly as found" holds for an entry whose `cards` is a list.
- **A comparison with the commit before scenes.** The old-desk test opens a desk saved with `save-desk` and checks what it does. It does not run the earlier code beside it.

## Evidence

- **2026-10-02, commit `e86b2e4`.** `npm test` in `desktop/` ran every suite, this one among them: 589 of 589 passed. The session that built the feature ran it and reported the count. This close-out did not run the suite. It read the ten tests against the lists above.
- **2026-10-02, commit `69301dd`,** the commit that added the tenth test.
- **2026-10-02, commit `b1bfa1d`,** the commit that added the suite: 550 of 550, nine of them these tests, by that commit's message.

## Adequacy (who verifies this test?)

Each rule of `scenes.ts` was broken once on 2026-10-02 and the suite run, to see whether a test fails. Fourteen rules were broken and each fails at least one test. The session that built the feature broke them and recorded which test failed. This close-out copied its list and did not repeat the run.

At the first try eleven of the fourteen failed a test. The three marked "since `69301dd`" failed nothing until that commit added the test they now fail.

| The rule as broken | The test that then fails |
| --- | --- |
| A reading position for a note that is not on the desk is kept in the scene | "a scene keeps the view, the search, the collection, each document and where it was read, and nothing derived"; "rename keeps the scene, delete removes it, and restore puts it back only into the gap it left" |
| A scene of a version this Deck does not know is taken for one it can open | "a scene saved by a newer Deck is kept untouched, listed as unreadable, not opened and not overwritten" |
| A desk saved before scenes is taken for one that cannot be read | "a desk saved before scenes opens exactly as it did" |
| The reading position is taken from a heading further down than the top of the view | "a reading position is kept by the heading above it, and found again when text is added above" |
| A passage is never found again by its heading | the same test |
| A passage whose heading is gone is not reported as moved | the same test |
| A note that is no longer in the workspace is not reported | "a reopened scene says what is not as it was saved, and nothing about the count" |
| A smaller field is not reported | the same test |
| A scene of an unknown version loses the fields this Deck does not know | "a scene saved by a newer Deck is kept untouched, listed as unreadable, not opened and not overwritten" |
| A reading position for a note the scene does not hold survives a reload | "a scene with fields that are not what they should be opens with those fields dropped" |
| A saved scene may have no name (since `69301dd`) | "a saved scene has a name, a field has a size, and the list is one workspace's" |
| A field of no size is kept (since `69301dd`) | the same test |
| The list of scenes names another workspace's scenes too (since `69301dd`) | the same test |
| A scene keeps a card with more than its place and size | "a scene keeps the view, the search, the collection, each document and where it was read, and nothing derived" |

What this does not show: the breaks were chosen by the session that wrote the code, one per rule it could name. A rule nobody named was not broken. The five things under "What the suite does not assert" have no break, because no test covers them.
