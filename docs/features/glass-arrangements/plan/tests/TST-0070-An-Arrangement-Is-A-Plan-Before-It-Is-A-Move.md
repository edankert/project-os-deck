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

REQ-0003 says an arrangement changes layout only, can be previewed, cancelled and reversed, and never shrinks what a person chose to read at. All of that is decided in two pure modules before anything is drawn: `desktop/src/shared/arrange.ts` works out each plan, what a reworked preview says, and what an undo may put back, and `cardGrid` in `desktop/src/shared/collection.ts` lays out the Cards presentation. The store's part is one action, `arrange`, in `desktop/src/shared/store-state.ts`. This suite checks all three without a window. Two of its tests read the built page and the built stylesheet instead of a module.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh arrange`.

## Expected results

- **Read** puts the list down the left and the document beside it. A plan holds a place for each document it moves and no size, so nothing in it could change one. A second open note is not named, and the plan says it stays.
- When the list and the document do not fit side by side, the collection is collapsed to its header and the document stands under it. A document wider than the window keeps its width and the plan says so.
- **Compare** starts the second document after the first one's own width. With no room for the list as well, the collection is collapsed and the two are centred. In a window too narrow for both, each keeps its size and the plan says by how many pixels they overlap.
- Compare says how the note underneath is reached. Where the two overlap in part, pressing either brings it to the front. Where one covers the other completely, the plan names Tab and the covered note's header. In a narrow field, which shows one object at a time, it names the bar along the top.
- Compare with one open note, or with the same note twice, is refused in a sentence and plans nothing.
- **Show related** centres the document in the room beside the list, one row of cards down, makes it the focus and opens its list. When the note does not fit beside the list, the collection is folded to its header and the note stands under it.
- Show related says how many notes gather and how many its list holds, and gives both numbers when they differ. While the note's links have not been read it gives no number and does not say the note is joined to none.
- A plan that would move nothing names no object. A collection that would be drawn where it already is, is not named and not stored.
- The basis of a plan (what it was worked out from, compared to tell when a preview is stale) changes when a document is moved, resized or closed, when the stacking changes, when the collection is folded, changes between table and cards, is moved, is resized or leaves the field, when the window changes size, and when a changed result is waiting.
- A preview that was worked out again says what changed under it: each document by name and what was done to it, the collection, the window, notes changed on disk, a note's links read. It says nothing when nothing changed, and it does not say "desk" when only a note on disk changed.
- The preview's text is a polite live region in the built page.
- The "pick out" chips and the references among the cards have a 2 px outline in the accent colour on keyboard focus in the built stylesheet, and no rule takes it away.
- A plan leaves the collection's width and height alone. In a field that is not a whole number of pixels high the undo still recognises the collection the store holds. In a field smaller than the stored collection, Apply stores no fitted size, and Undo leaves the stored layout byte for byte what it was.
- An undo puts back exactly what the arrangement moved when nothing has changed since.
- A document that was moved, resized or closed since, and a collection that was changed since, are named and left alone.
- A note opened after the arrangement keeps its place in the stack through the undo: opened on top, it stays on top.
- An undo record belongs to one workspace and one view. It is forgotten in another workspace, and kept but not offered on another view.
- "Undo the rest" answers the question that was shown. When what has changed is different at the press, the question is not the same one.
- The Cards presentation lays the members out in whole rows inside its area with no two overlapping, draws only the rows in view, and reaches every member exactly once by moving the first row.
- The store applies an arrangement as one revision, changes no size and no reading-size preference, opens no note, and ignores a place it cannot use.
- `arrange` is an action a window may send, and it names the view whose desk it changes: an arrangement naming one view changes that view's desk and no other.

Two rules of this feature are held by tests in other suites. `hands` lists `arrange` among the actions that cross the window channel. `relations` checks that "pick out" counts the notes joined to the document its chip was pressed on.

## Evidence

The file holds 27 tests. `npm test` in `desktop/` builds and runs every suite, this one among them. On 2026-10-02 at commit `18f5405` it passed 645 of 645. That run was the main session's. For this close-out the suite was run on its own at the same commit, `node --test tests/arrange.test.mjs`: 27 of 27 passed. So were the two suites that each hold one rule of this feature: `hands`, 10 of 10, and `relations`, 7 of 7.

Before the review the file held 15 tests. The review's fixes added twelve, widened one and rewrote one (commits `b3c4219`, `d9dbb73`, `cc3c926`, `fdb7e3e` and `1603042`).

This note records no verdict. The suite has a `command:`, so CI is its verdict (`STATUSES.md`, `[[test]]`).

## Defects the review found that this suite now holds

The independent review of FEAT-0022 on 2026-10-02 found the defects below. Each now has a test, here or in the suite named. For the first four, the commit says the rule was removed again, the test was seen to fail, and the rule was restored. Round two of the review, on the same day at `cbae0d3`, took rules out of the built modules itself and ran the suites `arrange`, `hands` and `store` (51 tests, all passing before any break). The last column says what failed. Where it says "not broken in round two", the commit's account is all there is. For the second row the commit says the test was seen to fail. For the other two rows the tests were written with their fixes, and nobody has run them against the code as it was before.

| Defect | The test that holds it | Commit | Broken again in round two |
| --- | --- | --- | --- |
| The basis of a plan could lose the collection's form, table or cards, with every test passing. The test changed only whether the collection was folded. | "the basis of a plan changes when anything it was worked out from changes", which now also changes the collection's form, place and size | `d9dbb73` | With the form taken out of the basis: 50 of 51 passed, 1 failed. |
| Show related's fold of the collection to its header, when the note does not fit beside the list, could be removed with every test passing. | "Show related folds the collection to its header when the note does not fit beside the list, and stands the note under it" | `d9dbb73` | Not broken in round two. |
| `arrange` could be taken out of the list of actions a window may send with every test passing. The window's Apply and Undo were then dropped at the channel. | `hands`: "the hands and the panes cross the window channel; restore still does not", which now lists `arrange` | `d9dbb73` | 2 tests failed. |
| `arrange` could be taken out of the list of actions that name the window's own view with every test passing. | "an arrangement is a desk action a window may send: it names the view whose desk it changes" | `d9dbb73` | 1 test failed. |
| In a field smaller than the stored collection, Apply stored the fitted height, and Undo put the fitted layout back and said nothing had changed. Stored 820 high and 60 down in a field 600 high, the collection came back 600 high at the top. | "in a field smaller than the stored collection, Apply stores no fitted size and Undo leaves the stored layout byte for byte what it was", and "a collection that would be drawn where it already is, is not named and not stored" | `b3c4219` | With the fitted height written again: 3 tests failed. |
| Undo put a note opened after the arrangement at the bottom of the stack. With C, B, A open, Compare applied and D opened on top, the stack ended D, C, B, A. | "Undo leaves a note opened after the arrangement where it is in the stack: opened on top, it stays on top" | `d9dbb73` | With the old order put back: the new test failed. |
| A preview that was worked out again said "The desk changed" whatever had changed, named no object, and was not announced. | "a preview that was worked out again says what changed under it, and says nothing when nothing did", and "the sentence a preview says is announced: its text is a polite live region" | `cc3c926` | A change on disk made to say "the desk changed": a test failed. `aria-live` removed: a test failed. |
| Show related said "its list of all N" for a list that held more, and "joined to no other note" before the note's links had been read. | "Show related says how many notes gather and how many its list holds, and gives both when they differ" | `cc3c926` | Not broken in round two. |
| Undo arrangement was offered in another workspace that had a view of the same id. "Undo the rest" applied a result the question had not listed. Compare said "pressing either brings it to the front" of a note that was wholly covered. | "an undo record belongs to one workspace and one view", '"Undo the rest" is the answer to the question that was shown', and "Compare says how the note underneath is reached" | `fdb7e3e` | Not broken in round two. |
| The "pick out" chips and the references among the cards showed keyboard focus as the hover border alone. | 'the "pick out" chips and the references among the cards show where the keyboard is with an outline, not the hover border alone' | `1603042` | With both outline rules removed: the stylesheet test failed. |

## What it does not cover

- Anything drawn. The outline, the bar that names what moves, the travel and the keyboard are walked in [[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]. So are two documents that overlap on screen by the number of pixels the plan says.
- The undo putting back the focus, the open list and the relationship picked out. Those are the window's and are not part of `checkUndo`. The walk in TST-0071 reads the picked-out relationship after an undo.
- What the field does with these modules. That the field says the reworked sentence in its status line, that it shows the undo's question again, and that it asks "pick out" about the right document are in `desktop/src/renderer/glass.ts`, which no node suite loads. Round two of the review took the line that says the sentence out of the field, and no node test failed. The walk checks each on screen, and each held in the pass at `18f5405`.
- An Apply pressed at the instant the plan changes. The rule that such a press shows the new plan and applies nothing is in the renderer (commit `972ce73`), and neither this suite nor the walk drives it.
