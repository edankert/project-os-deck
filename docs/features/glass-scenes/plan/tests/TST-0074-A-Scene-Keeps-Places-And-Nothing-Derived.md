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

**The suite exists, so this note can be committed.** `command:` names `scenes`, and `desktop/tests/scenes.test.mjs` was committed on 2026-10-02 in `b1bfa1d`, while this note was being written. A note whose suite is missing makes `bash tools/scripts/run-desktop-tests.sh <suite>` exit 2 and `python3 tools/scripts/run-tests.py` report it failing, which is the failure [[ISS-0028-A-Test-Note-Names-A-Suite-That-Does-Not-Exist]] recorded. The expected results below were written from the requirement and not from that suite, so TASK-0106 reconciles the two.

The status is `active` and not `ready`. A test with a `command:` records no verdict on its note; the run is the verdict (`tools/instructions/STATUSES.md`, `[[test]]`).

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh scenes`.

## Expected results

- A scene built from a state has exactly these keys and no other: name, workspace, cards, version, view, query, filters, collection, anchors, field, savedAt. Each card holds a note id, a place and a size when one was chosen, in stacking order, and no field a desk card does not already have.
- A scene holds no collection row, member id or count, and no yaw, zoom, focus document, open list, emphasis or undo record, whatever the state it was built from holds.
- A reading anchor is the last heading at or above the top of the view, how far past it, and the scroll fraction. With no heading above, it holds no heading and the scroll position.
- An anchor is found again under its heading when text was added or removed above that heading. When the heading is gone the fraction is used and the result says the passage moved. The position is never outside the document.
- An anchor for a note that is not on the scene's desk is not saved.
- Opening a scene selects its view, then applies its search, filters, collection layout and documents in the saved stacking order, as one revision. Notes kept on every view stay. No reading-size preference and no session value changes.
- The desk that was there before is kept and put back exactly: the view, its documents, its collection layout, the search text and the filters. It is not in what the store writes to disk.
- Rename keeps every field under a new key. Renaming onto an existing name is refused. Delete returns what it removed, and restoring it puts back an identical scene.
- A desk fixture with no version opens exactly as it did before scenes.
- A stored entry of a version this Deck does not write is byte-for-byte the same after the state is loaded and saved, is listed as unreadable with its version, and cannot be opened.
- The report names missing notes, a smaller field with the documents drawn inside it, and moved passages, one sentence each. It is empty when nothing changed, and a different member count never produces a sentence.

## Evidence (fill after running)

- None recorded. The suite was committed in `b1bfa1d` on 2026-10-02 and has not been run for this note.

## Adequacy (who verifies this test?)

- To be recorded by TASK-0106: each rule above broken once in the module, with the test that failed.
