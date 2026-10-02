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

Glass gains the controls for scenes. Spread already has controls for a saved desk; Glass has none. This task draws what TASK-0106 modelled and adds the two things only a window knows: where each document is being read, and how large the field is.

## Definition of Done

- [ ] Glass's bar offers, by name, saving the desk as a scene, a list of this workspace's scenes and saved desks, and rename and delete for the open one. The list marks which entries are scenes, which are desks from before scenes, and which are unreadable with their version. An unreadable entry cannot be opened.
- [ ] Saving reads each open document's headings and scroll position and the field's size from the window, and stores a version 2 scene. Saving under a name that exists asks before replacing, and Cancel leaves the stored scene unchanged.
- [ ] Opening a scene switches to its view, applies its search and filters, and restores the collection and the documents at their places, sizes and stacking. The collection's rows and count and each document's text are requested again; the network log in the walk shows the requests after the scene was opened.
- [ ] Each document is scrolled to its reading anchor after its text is in, and not before. A document whose text fails to load keeps its labelled failure state and its anchor is applied if a retry succeeds.
- [ ] One message says what changed and stays until it is dismissed: notes that no longer exist, a field smaller than the scene's, and passages that moved. It is announced to a screen reader once. With nothing to report, no message is shown.
- [ ] A note that no longer exists has a document on the desk that names the note id, says it is no longer in the workspace and offers Close. No other note's text is shown in it.
- [ ] In a field smaller than the scene's, every document's header is inside the field and reachable. The stored places are unchanged: the store's desk for the view holds the saved coordinates after reopening.
- [ ] "Undo: back to the desk before <name>" appears after a scene is opened and restores the desk, collection, search and filters that were there. It is a separate control from "Undo arrangement" with a different name, and both can be on screen at once. It is gone after a reload.
- [ ] Deleting the open scene offers "restore" until the window closes or another scene is deleted. Restoring brings back the scene under its name.
- [ ] Yaw, zoom, the focus document, open lists and relationship emphasis are the same before and after a scene is opened on the same view.
- [ ] Every control is reachable and operable by keyboard with a visible focus, Escape closes the list or the question and nothing else, and under `prefers-reduced-motion: reduce` documents are at their places on the first frame.
- [ ] The scene's name is in the address the window copies (`desk=`), and opening that address in Deck opens the scene on its view.
- [ ] The served page shows no scene control and no scene list. The check is made on a page with no preload bridge, as a tablet loads it.
- [ ] Saving, opening, renaming, deleting and restoring a scene leave `git status` in the workspace unchanged.

## Steps

- [ ] Read REQ-0004, ADR-0007 part A, and DES-0003's input contract and state and recovery cases.
- [ ] Add the controls to Glass in `desktop/src/renderer/glass.ts` and wire them in `desktop/src/renderer/renderer.ts`, beside the existing desk list.
- [ ] Capture reading anchors at save and apply them when each document's text arrives.
- [ ] Draw the message, the labelled missing document and the undo control.
- [ ] Keep the served page out of it through the capability the page already reads (`host.canArrange()`).
- [ ] Add the scene steps to `desktop/demos/glass-scenes.cjs` and record what the walk found.

## Acceptance checks reopened

- [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]: Glass's bar gains controls beside "Undo arrangement". Look at the bar in a narrow window, where TST-0071 once found the bar's width pushing the field under the rail.
- [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]: the bar and the reload step. Reload must still restore the desk with no scene open.

## Notes

Nothing is built by this note. Spread's existing "Save desk…" control keeps working and saves through the same store actions; whether Spread should list scenes differently is not part of this task.

Opening a scene narrows every window on the workspace, because the search text and filters are shared. The message a person sees in a second window when that happens is not designed here. If the walk shows it confuses, file it as an issue with what was seen.
