---
type: "[[test]]"
id: TST-0070
aliases: ["TST-0070"]
title: "An arrangement is a plan before it is a move: Read, Compare and Show related name what they move, never change a size, leave alone what they do not name, and can be put back except where a person has changed something since"
status: active
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[TASK-0102-Preview-Apply-And-Undo-Glass-Arrangements]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/arrange.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh arrange"
covers: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]", "[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]"]
issues: []
tasks: ["[[TASK-0102-Preview-Apply-And-Undo-Glass-Arrangements]]", "[[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
---

# An arrangement is a plan before it is a move

## Purpose

REQ-0003 says an arrangement changes layout only, can be previewed, cancelled and reversed, and never shrinks what a person chose to read at. All of that is decided in two pure modules before anything is drawn: `desktop/src/shared/arrange.ts` works out each plan and what an undo may put back, and `cardGrid` in `desktop/src/shared/collection.ts` lays out the Cards presentation. The store's part is one action, `arrange`, in `desktop/src/shared/store-state.ts`. This suite checks all three without a window.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh arrange`.

## Expected results

- **Read** puts the list down the left and the document beside it. A plan holds a place for each document it moves and no size, so nothing in it could change one. A second open note is not named, and the plan says it stays.
- When the list and the document do not fit side by side, the collection is collapsed to its header and the document stands under it. A document wider than the window keeps its width and the plan says so.
- **Compare** starts the second document after the first one's own width. With no room for the list as well, the collection is collapsed and the two are centred. In a window too narrow for both, each keeps its size and the plan says by how many pixels they overlap.
- Compare with one open note, or with the same note twice, is refused in a sentence and plans nothing.
- **Show related** centres the document in the room beside the list, one row of cards down, makes it the focus and opens its list.
- A plan that would move nothing names no object.
- The basis of a plan changes when a document is moved, resized or closed, when the stacking changes, when the collection changes form, when the window changes size, and when a changed result is waiting.
- A field that is not a whole number of pixels high still plans whole pixels, so the undo recognises the collection the store then holds.
- An undo puts back exactly what the arrangement moved when nothing has changed since.
- A document that was moved, resized or closed since, and a collection that was changed since, are named and left alone.
- The Cards presentation lays the members out in whole rows inside its area with no two overlapping, draws only the rows in view, and reaches every member exactly once by moving the first row.
- The store applies an arrangement as one revision, changes no size and no reading-size preference, opens no note, and ignores a place it cannot use.
