---
type: "[[task]]"
id: TASK-0107
title: "Save, reopen and undo scenes in Glass"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
parent: "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"
effort: L
due: ""
depends: ["[[TASK-0106-Keep-A-Scene-In-The-Store]]"]
blocks: ["[[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]]"]
related: ["[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
tests: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]"]
---

# Save, reopen and undo scenes in Glass

Glass has the controls for scenes: a list on the bar above the field, with "open", "save scene", "rename", "delete" and an undo back to the desk that was there. This task draws what TASK-0106 modelled and adds the two things only a window knows: where each document is being read, and how large the field is. It was built in commit `b1bfa1d`.

**Where it stands, 2026-10-02.** The task stays `doing`. Eight boxes are open, each with what is missing under it. The evidence is the scripted walk `glass-scenes`, run in a Linux container at commit `4243fc2` with 26 checks, all of which held ([[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]). A quoted check below is one of that walk's.

## Definition of Done

- [x] Glass's bar offers "save scene", a list of this workspace's scenes and saved desks, and "open", "rename" and "delete" for the name chosen in the list. A scene is listed with its view and how many notes it holds, and a desk from before scenes with its number of notes and no view. The box first said rename and delete are for the open scene; they are for the chosen name, which need not be the open one. Shown by "the list names it with its view and how many notes it holds, and rename and delete are offered for it" and "choosing the scene's name in the list changes nothing on the desk; "open" is then offered".
- [ ] An unreadable entry is listed with its version and cannot be opened.
  Not shown in a window: no walk put a scene of a newer version in the list. The code lists it as "<name> (cannot be opened)" and makes it unchoosable (`drawScenes` in `desktop/src/renderer/renderer.ts`). The version is in the entry's tooltip and not in the list's text. The store's rule is tested in [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]].
- [x] Saving reads each open document's headings and scroll position and the field's size from the window, and stores a version 2 scene. Saving under a name that belongs to another scene asks "replace it", "keep it" or "cancel", and "keep it" leaves the stored scene unchanged. The box first said every save under an existing name asks; saving under the open scene's own name replaces it with no question (`saveScene` in `renderer.ts`), and no commit says why. Shown by "the scene is saved under its name: its view, search, collection, the two notes and where each is being read" and "saving under a name that is taken asks first, and "keep it" leaves the saved scene exactly as it was". The save without a question is read in the code.
- [x] Opening a scene switches to its view, applies its search, and restores the collection and the documents at their places and sizes. The collection's count is the one the sidecar gives at that moment, and each document's text is read then. The box first asked for a network log; the walk keeps none, and compares the count on screen with the sidecar's own answer instead. Filters and stacking order are checked without a window in TST-0074; the walk sets no filter. Shown by "the scene chosen from the list brings back its view, its search and the collection as cards", "both notes are open where they stood, at the sizes they had" and "the count is the one the sidecar gives now, and with nothing changed the scene says so in one line and raises no report".
- [x] Each document is scrolled to its reading anchor after its text is in. Shown by "each is read where it was being read: under the same heading, the same distance past it", which also requires both documents to have their text.
- [ ] A document whose text fails to load keeps its labelled failure state, and its anchor is applied if a retry succeeds.
  Not shown, and not built as written. A waiting anchor is dropped after five seconds (`READING_WAIT_MS` in `desktop/src/renderer/glass.ts`), so a retry that succeeds later is not scrolled to it. No walk makes a read fail and then succeed.
- [x] One message says what changed and stays until it is dismissed: notes that no longer exist, a field smaller than the scene's, and passages that moved. Its element carries `role="status"` (`desktop/src/renderer/index.html`); no screen reader was run. With nothing to report the message is not shown, and the status line says the scene was reopened with everything where it was. Shown by "reopened after FEAT-0002 was deleted, a heading in FEAT-0003 was renamed and the window was made smaller: the scene says all three, and stays until dismissed", "dismiss closes the report" and the count check quoted above.
- [x] A note that no longer exists has a document on the desk under its own title, labelled with the note id. The label says there is no note at that path any more and offers "retry" and "close". When this window read the note earlier in the session the document still shows that text, said to be as last read. No other note's text is shown in it. The box first gave the label as "no longer in the workspace"; those words are in the scene's message. Shown by "FEAT-0002's document is there under its own title, labelled: the text this window read earlier, said to be as last read, and no other note stands in for it".
- [x] In a field smaller than the scene's, the stored places are unchanged: the store's desk for the view holds the saved coordinates after reopening. Shown by "the places and sizes the scene holds were not changed by being drawn in a smaller window".
- [ ] In a field smaller than the scene's, every document's header is inside the field and reachable.
  No check asserts it. The walk's picture `03-reopened-after-changes.png` shows both documents' headers on screen in a 1052 by 571 field, with the field turned.
- [x] `Undo: back to the desk before "<name>"` appears after a scene is opened and restores the view, the documents and the search that were there. It is a separate control from "Undo arrangement" with a different name. It is gone after a reload. Shown by "one press, named for what it does, puts back the Issues view with the note that was open there, where it stood; the scene is still saved" and "after a reload the scenes are still listed; the way back to "the desk before" was this window's and is gone".
- [ ] "Undo: back to the desk before …" and "Undo arrangement" can be on screen at once.
  Not shown. Opening a scene clears the arrangement undo, because the desk it would put back was replaced (`forgetArrangement` in `glass.ts`). Both would be on screen after an arrangement is applied on a reopened scene, and no walk does that.
- [x] Deleting a scene offers "restore" in a message, and restoring brings the scene back under its name as it was saved. The box first said the offer lasts until the window closes or another scene is deleted; it also ends when the message is dismissed or replaced. Shown by "delete removes the scene from the list, leaves the desk on screen as it is, and offers restore" and "restore puts it back as it was saved".
- [x] Yaw and zoom are the same before and after a scene is opened on the same view. Shown by "the field was turned and zoomed before the scene was reopened on its own view, and is turned and zoomed the same after: a scene keeps neither and changes neither".
- [ ] The focus document, open lists and relationship emphasis are the same before and after a scene is opened on the same view.
  No check compares them. A saved scene holds none of the three, which the walk's check of its keys shows.
- [ ] Every control is reachable and operable by keyboard with a visible focus, Escape closes the list or the question and nothing else, and under `prefers-reduced-motion: reduce` documents are at their places on the first frame.
  Shown by keyboard: a scene chosen in the list with the arrow keys, its name typed and entered with Return, and Return on the focused "keep it". Not shown: "open", "save scene", "rename", "delete", the undo, "restore" and "dismiss" are buttons, and the walk presses each with the pointer. Escape is never pressed. No scene is reopened with reduced motion on.
- [x] The scene's name is in the address the window copies (`desk=`), with its view. Shown by "the copied address names the scene and its view, so the scene is a state Deck can be sent to".
- [ ] Opening that address in Deck opens the scene on its view.
  Not walked. `applyAddress` in `renderer.ts` opens the scene named by `desk=` after it has selected the view. Neither walk nor the smoke run opens such an address.
- [x] The served page shows no scene control and no scene list. The check is made on a page with no preload bridge, as a tablet loads it. Shown by "the served page offers no scenes: it shows the desk the application has".
- [ ] Saving, opening, renaming, deleting and restoring a scene leave `git status` in the workspace unchanged.
  Not checked. The walk runs on a copy that is not a git repository, and it edits two notes itself. Its record says `workspaceUnchanged: true` because `git status` failed the same way before and after. Scene actions go to Deck's own store and to no write route, which is read in the code and not shown by a comparison of files.

## Steps

- [x] Read REQ-0004, ADR-0007 part A, and DES-0003's input contract and state and recovery cases.
- [x] Add the controls to Glass in `desktop/src/renderer/glass.ts` and wire them in `desktop/src/renderer/renderer.ts`, beside the existing desk list.
- [x] Capture reading anchors at save and apply them when each document's text arrives.
- [x] Draw the message, the labelled missing document and the undo control.
- [x] Keep the served page out of it through the capability the page already reads (`host.canArrange()`).
- [x] Add the scene steps to `desktop/demos/glass-scenes.cjs` and record what the walk found.

## Acceptance checks reopened

- [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]: Glass's bar gains controls beside "Undo arrangement". Look at the bar in a narrow window, where TST-0071 once found the bar's width pushing the field under the rail.
- [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]: the bar and the reload step. Reload must still restore the desk with no scene open.

Neither check has an invalidation event in the working ledger for this task. This close-out writes nothing to the ledger.

## Notes

**Seen in the walk's picture and not asserted by a check.** In a window 1180 pixels wide the bar does not fit: the undo button reads `Undo: back to the desk before "Review` and is cut off by the window's right edge (`03-reopened-after-changes.png`). The collection is also cut off at the field's left edge in that picture. The field had been turned, which carries the desk with it, so the picture does not say whether the bar's width moved the field. Nobody has decided whether the bar should wrap or the label shorten.

Spread's existing "Save desk…" control keeps working and saves through the same store actions; whether Spread should list scenes differently is not part of this task.

Opening a scene narrows every window on the workspace, because the search text and filters are shared. The message a person sees in a second window when that happens is not designed here, and no walk looked at a second window while a scene was opened.
