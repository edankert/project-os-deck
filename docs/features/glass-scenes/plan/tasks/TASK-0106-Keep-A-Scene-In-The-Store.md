---
type: "[[task]]"
id: TASK-0106
title: "Keep a scene in the store"
status: done
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

The store knows what a scene is, with no window involved. A scene is the saved desk in `state.desks`, marked `version: 2` (ADR-0007, part A). The rules are in `desktop/src/shared/scenes.ts` and in the scene actions of `desktop/src/shared/store-state.ts`, and are checked by the ten tests of `desktop/tests/scenes.test.mjs` (commits `b1bfa1d` and `69301dd`).

**Where it stands, 2026-10-02.** The task is `done`. Every box under the Definition of Done is ticked and every step is taken. The last step was to break each rule once and see a test fail: fourteen rules were broken and fourteen were caught, three of them only after `69301dd` added a test ([[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], Adequacy). A quoted test below is one of that suite's. A quoted check is one of the scripted walk `glass-scenes`, run in a Linux container at commit `e86b2e4`, where all 38 of its checks held ([[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]).

## Definition of Done

- [x] `Desk` in `desktop/src/shared/types.ts` gains optional fields and nothing else changes shape: `version`, `view`, `query`, `filters`, `collection`, `anchors` (one reading anchor per open note id), `field` (width and height) and `savedAt`. `deskKey` and the `desk=` address parameter are unchanged. Shown by the `Desk` interface in `types.ts`, by `desktop/src/shared/address.ts` having no commit since before `b1bfa1d`, and by the scenes walk's check "the copied address names the scene and its view, so the scene is a state Deck can be sent to".
- [x] A scene built from a state holds the view, search text, filters, the collection's place, size, collapsed state and presentation, and each open document's note id, place, size and stacking. The test asserts the saved object's exact set of keys, so a row, a member id, a count, a note body, a yaw, a zoom, a focus, an open list, an emphasis or an undo record cannot be added without the test failing. Shown by the test "a scene keeps the view, the search, the collection, each document and where it was read, and nothing derived", and in a window by the walk's check "it holds no row, no member id, no count, no text, and nothing of how the field was turned or zoomed".
- [x] A reading anchor is taken from a list of headings with their tops and a scroll position: the last heading at or above the top of the view by its words, how far past it, and the scroll fraction. With no heading above, the heading is empty and the offset is the scroll position. Shown by the test "a reading position is kept by the heading above it, and found again when text is added above".
- [x] A reading anchor is applied to a list of headings: the saved heading plus offset when the heading exists, clamped to the document; the fraction when it does not, with a flag saying the passage moved. An anchor for a note that is not on the scene's desk is dropped at save. Shown by the same test, and by the first test's assertion that the anchor for `NOT-OPEN` is not kept.
- [x] Opening a scene sets, in one new state, the scene's view, its search text and filters, the collection layout, the view's own documents in the saved stacking order, and `deskName`. Notes kept on every view stay where they are (FEAT-0015, decision 11). Opening changes no `readingSizes` entry and no session value. The box first said the view is selected and then the rest is set; the build sets them together in `applyScene` (`store-state.ts`), which does not go through `select-view` and so has nothing to clear. Shown by the tests "opening a scene brings back its view, search, collection and documents, and can be taken back" and "a note kept on every view stays when a scene is opened, and is not doubled". That opening changes no session value is shown in a window by the walk's checks "after saving, the list shows the scene just saved; which document is the focus, which list is open and which relationship is picked out are not kept in a scene, and opening the scene on the same view leaves all three as they were" and "the field was turned and zoomed before the scene was reopened on its own view, and is turned and zoomed the same after: a scene keeps neither and changes neither". That it is one revision, and that it touches no reading size, is read in `applyScene`; no test asserts either.
- [x] The desk that was there before is kept by the window and put back by a second action. The box first said the store returns or records it. The build has the window build it with `sceneFrom` before it opens the scene, keep it in a variable (`beforeScene` in `desktop/src/renderer/renderer.ts`) and put it back with `apply-scene`. It is per window and per session and is never written to the state file. Shown by the same opening test, which puts back the view, the search text and the documents and finds nothing added to the saved scenes, and by the walk's checks "one press, named for what it does, puts back the Issues view with the note that was open there, where it stood; the scene is still saved" and "after a reload the scenes are still listed; the way back to "the desk before" was this window's and is gone". No test compares the collection layout and the filters after putting back.
- [x] Rename moves the scene to the new key, keeps every other field, and updates `deskName` when the renamed scene is the open one. Renaming onto a name that exists is refused by the store; asking the person is the window's job. Shown by the test "rename keeps the scene, delete removes it, and restore puts it back only into the gap it left".
- [x] Delete removes the scene, and restoring puts back the identical object under the identical key. The box first said delete hands back what it removed. The build has the window read the scene before it deletes it and hand that object to `restore-desk`. A restore does not replace a scene saved under that name since. Shown by the same test, and by the walk's checks "delete removes the scene from the list, leaves the desk on screen as it is, and offers restore" and "restore puts it back as it was saved".
- [x] A desk with no `version` is read with only its cards, and `open-desk` on it opens its notes on the view that is on screen and brings no view or search of its own. The box first asked for a comparison with the commit before; the test does not run the earlier code. Shown by the test "a desk saved before scenes opens exactly as it did" and by the walk's check "a desk saved the old way (no version) opens as it always did: its notes, on the view that is on screen, and it brings no view or search of its own".
- [x] A stored entry whose `version` is not one this Deck writes keeps every field through a load and a save, is listed as unreadable with its version and a sentence saying why, is refused by open with no change to the state, and is not replaced by a scene saved under its name. The box first asked for a byte-for-byte comparison; the test compares the parsed object field by field. Shown by the test "a scene saved by a newer Deck is kept untouched, listed as unreadable, not opened and not overwritten", and in a window by the walk's check "a scene saved by a newer Deck is listed with its version in its own text, cannot be chosen or opened, is refused by address with the reason, and is kept exactly as it was, with the field this Deck does not know". No newer Deck exists, so the walk put an entry of version 99 in the store itself.
- [x] A report function takes a scene, the set of its notes that exist now, the field size now and the list of passages that moved. It returns one sentence each for missing notes, a smaller field (naming the documents drawn inside it) and moved passages, and nothing when nothing changed. A different member count produces no sentence, and the function has no input from which it could produce one. Shown by the test "a reopened scene says what is not as it was saved, and nothing about the count" and by `SceneReportInput` in `scenes.ts`.
- [x] `npm test` in `desktop/` passes with the `scenes` suite in it, and `desktop/tests/store.test.mjs`, `view-desks.test.mjs` and `served-state.test.mjs` pass unchanged. Shown by the full run on 2026-10-02 at `e86b2e4`, 589 of 589, reported by the session that built the feature, and by `git log` showing no commit to those three files since before `b1bfa1d`. This close-out did not run the suite.

## Steps

- [x] Read ADR-0007 part A, REQ-0004 and FEAT-0015's decision 11 and its open question about a saved desk's view.
- [x] Write `desktop/src/shared/scenes.ts`: the scene's shape, building one from a state, the reading anchor both ways, the list of scenes with their kind, the report, and reading a stored entry.
- [x] Add the store actions in `desktop/src/shared/store-state.ts` and route the state file's reader for `desks` through the scene reader.
- [x] Write `desktop/tests/scenes.test.mjs`. It has ten tests. Two cover what the definition of done does not list: a version 2 entry with bad fields, and a saved scene having a name, a field having a size and the list being one workspace's.
- [x] Commit the suite before [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]]. The suite went in with `b1bfa1d` and the note with `9b7a062`, so the note never named a suite that did not exist (ISS-0028).
- [x] Break each rule once and confirm a test fails, and record what was broken in TST-0074's `adequacy:`. Fourteen rules of `scenes.ts` were each broken once on 2026-10-02 and the suite run. Eleven were caught at the first try. Three were not: a saved scene with no name was accepted, a field of no size was kept, and the list of scenes named another workspace's scenes. Commit `69301dd` added the test "a saved scene has a name, a field has a size, and the list is one workspace's", and all fourteen are caught now. The list is in TST-0074 under Adequacy.

## Notes

`applyScene` sets the view directly and does not dispatch `select-view`, which would clear the filters and the open desk's name. The scene's filters and name are therefore set in the same state as its view.

The search text and the filters are one value each for the whole store, shared by every window. Opening a scene changes them for every window on the workspace. That is the existing store's behaviour and is recorded as a consequence in ADR-0007.

A scene keeps a note's id and no path. Whether a reopened scene should also name a note whose file moved is open under ADR-0007's Acceptance, and the store holds no path until Edwin decides.

[[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]] lists, under "What the suite does not assert", the things in the boxes above that rest on reading the code or that the test checks more loosely than this note first asked.
