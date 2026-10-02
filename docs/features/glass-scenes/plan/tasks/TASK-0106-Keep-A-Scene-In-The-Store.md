---
type: "[[task]]"
id: TASK-0106
title: "Keep a scene in the store"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
parent: "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"
effort: M
due: ""
depends: []
blocks: ["[[TASK-0107-Save-Reopen-And-Undo-Scenes-In-Glass]]"]
related: ["[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
tests: ["[[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]]"]
---

# Keep a scene in the store

The store learns what a scene is, with no window involved. A scene is the saved desk in `state.desks`, marked `version: 2` (ADR-0007, part A). Everything in this task is pure and is checked by `desktop/tests/scenes.test.mjs`.

## Definition of Done

- [ ] `Desk` in `desktop/src/shared/types.ts` gains optional fields and nothing else changes shape: `version`, `view`, `query`, `filters`, `collection`, `anchors` (one reading anchor per open note id), `field` (width and height) and `savedAt`. `deskKey` and the `desk=` address parameter are unchanged.
- [ ] A scene built from a state holds the view, search text, filters, the collection's place, size, collapsed state and presentation, and each open document's note id, place, size and stacking. The test asserts the saved object's exact set of keys, so a row, a member id, a count, a note body, a yaw, a zoom, a focus, an open list, an emphasis or an undo record cannot be added without the test failing.
- [ ] A reading anchor is taken from a list of headings with their tops and a scroll position: the last heading at or above the top of the view by its words, how far past it, and the scroll fraction. With no heading above, the heading is empty and the offset is the scroll position.
- [ ] A reading anchor is applied to a list of headings: the saved heading plus offset when the heading exists, clamped to the document; the fraction when it does not, with a flag saying the passage moved. An anchor for a note that is not on the scene's desk is dropped at save.
- [ ] Opening a scene, as one store revision, selects the scene's view, then sets its search text and filters, the collection layout and the view's own documents in the saved stacking order, and sets `deskName`. Notes kept on every view stay where they are (FEAT-0015, decision 11). Opening changes no `readingSizes` entry and no session value.
- [ ] Opening returns or records the desk that was there: the view, its documents, its collection layout, the search text and the filters. A second action restores exactly that. The record is per window and per session and is never written to the state file.
- [ ] Rename moves the scene to the new key, keeps every other field, and updates `deskName` when the renamed scene is the open one. Renaming onto a name that exists is refused by the store; asking the person is the window's job.
- [ ] Delete removes the scene and hands back what was removed, so the window can offer "restore". Restoring puts back the identical object under the identical key.
- [ ] A desk with no `version` is read with only its cards, as today, and `open-desk` on it does what it did: the test opens a desk fixture written before this task and compares the result with the result on the commit before it.
- [ ] A stored entry whose `version` is not one this Deck writes is returned by the state file's reader exactly as it was found, is listed as unreadable with its version and a sentence saying why, and is refused by open with no change to the state. The test loads such an entry, saves the state, and compares the entry byte for byte.
- [ ] A report function takes a scene, the set of its notes that exist now, the field size now and the list of passages that moved. It returns one sentence each for missing notes, a smaller field (naming the documents drawn inside it) and moved passages, and nothing when nothing changed. A different member count produces no sentence, and the function has no input from which it could produce one.
- [ ] `bash tools/scripts/run-desktop-tests.sh scenes` passes, `npm test` in `desktop/` passes, and `desktop/tests/store.test.mjs`, `view-desks.test.mjs` and `served-state.test.mjs` pass unchanged.

## Steps

- [ ] Read ADR-0007 part A, REQ-0004 and FEAT-0015's decision 11 and its open question about a saved desk's view.
- [ ] Write `desktop/src/shared/scenes.ts`: the scene's shape, building one from a state, the reading anchor both ways, the list of scenes with their kind, the report, and reading a stored entry.
- [ ] Add the store actions in `desktop/src/shared/store-state.ts` and route the state file's reader for `desks` through the scene reader.
- [ ] Write `desktop/tests/scenes.test.mjs`, one focused test per line of the definition of done.
- [ ] Commit the suite and [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]] together. The note's `command:` names the suite, and `python3 tools/scripts/run-tests.py` reports a note whose suite does not exist as failing (ISS-0028).
- [ ] Break each rule once and confirm a test fails, and record what was broken in TST-0074's `adequacy:`.

## Notes

Nothing is built by this note. The order inside opening a scene matters: `select-view` clears the filters and the open desk's name today, so the view is selected before the scene's filters and name are applied.

The search text and the filters are one value each for the whole store, shared by every window. Opening a scene changes them for every window on the workspace. That is the existing store's behaviour and is recorded as a consequence in ADR-0007.

A scene keeps a note's id and no path. Whether a reopened scene should also name a note whose file moved is open under ADR-0007's Acceptance, and this task does not add a path until Edwin decides.
