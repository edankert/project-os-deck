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
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
---

# A scene keeps places and nothing derived

## Purpose

REQ-0004 says a scene restores where things stood and reads everything else live. Whether that holds is decided before anything is drawn, in one pure module, `desktop/src/shared/scenes.ts`, and in the store's scene actions in `desktop/src/shared/store-state.ts`. This suite checks both without a window.

The suite is `desktop/tests/scenes.test.mjs`, committed in `b1bfa1d` on 2026-10-02. It has nine tests.

The status is `active` and not `ready`. A test with a `command:` records no verdict on its note; the run is the verdict (`tools/instructions/STATUSES.md`, `[[test]]`).

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh scenes`.

## Expected results

These are what the nine tests assert, reconciled with the suite on 2026-10-02. The list this note carried before was written from the requirement, and four of its lines asked for more than the suite checks. Those four are under "What the suite does not assert".

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

## What the suite does not assert

- **That opening a scene is one store revision.** `open-desk` on a scene returns one new state from one call (`applyScene` in `store-state.ts`), and no test counts revisions.
- **That opening changes no reading-size preference and no session value.** No test compares `readingSizes` before and after.
- **That the desk put back restores the collection layout and the filters.** The test compares the view, the search text and the documents.
- **A byte-for-byte comparison of an entry of a newer version.** The test compares the parsed object field by field. The reader replaces `cards` with an empty list when a newer entry's `cards` is not a list, so "exactly as found" holds for an entry whose `cards` is a list.
- **A comparison with the commit before scenes.** The old-desk test opens a desk saved with `save-desk` and checks what it does. It does not run the earlier code beside it.

## Evidence

- **2026-10-02, commit `9379a0c`.** `npm test` in `desktop/` ran every suite, this one among them: 586 of 586 passed. The session that built the feature ran it and reported the count. `9379a0c` is the last commit that changed application code; `4243fc2`, where the walks and the smoke run were made, changed one walk script after it.
- **2026-10-02, commit `b1bfa1d`,** the commit that added the suite: 550 of 550, nine of them these tests, by that commit's message.
- This close-out did not run the suite again. It read the nine tests against the lists above.

## Adequacy (who verifies this test?)

- Not recorded. No rule was broken on purpose to see a test fail, so `adequacy:` is empty. [[TASK-0106-Keep-A-Scene-In-The-Store]] keeps that step open.
