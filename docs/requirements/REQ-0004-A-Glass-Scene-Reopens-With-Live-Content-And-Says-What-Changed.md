---
type: "[[requirement]]"
id: REQ-0004
title: "A Glass scene reopens with live content and says what changed"
status: approved
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["Edwin 2026-10-02: 'Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff.'", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
priority: high
scope: "A named, saved arrangement of one view's Glass desk in the Electron shell"
acceptance: ["A reopened scene shows the collection's current members and count and each document's current text; the saved scene holds no row, member id, count or note body.", "A scene restores the view it was saved on, its search text and filters, the collection's place, size, collapsed state and presentation, and each open document's place, size and stacking; yaw, zoom, the focus document, open lists, relationship emphasis and undo history are never in a saved scene and are left as the window has them.", "Each document reopens where it was being read once its text is in: under the saved heading when that heading still exists, and at the saved fraction when it does not, in which case the scene says the passage moved.", "A reopened scene says what changed in one message that stays until dismissed: a note that no longer exists keeps its document, labelled, and is never replaced by another note; a field smaller than the one the scene was arranged in draws the documents inside it and leaves their stored places unchanged; a different member count is not reported.", "Opening a scene is undone by a control named for the desk before it, which restores that desk, collection, search and filters for this window's session; it is a different control from Undo arrangement, and neither changes a note's text or undoes a project action.", "A scene is saved, opened, renamed, deleted and restored after a delete by pointer and by keyboard; saving under an existing name asks before replacing; the scene's name is the `desk=` parameter of its address.", "A desk saved before scenes opens exactly as it did; a stored scene whose version is newer than this Deck reads is kept unchanged, listed as unreadable with its version, and not opened.", "The served page lists and opens no scene, and saving, opening, renaming or deleting a scene changes no file in the workspace."]
implements: "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"
verifies: ["[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]", "[[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]]", "[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]"]
related: ["[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
tests: ["[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]", "[[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]]", "[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]"]
---

# A Glass scene reopens with live content and says what changed

## Statement

A person must be able to save one view's Glass desk under a name and come back to it later. The scene must restore where things stood and where each document was being read. It must read every member, count and note text from the source at the moment it is reopened, and it must say plainly what is no longer as it was saved. Opening a scene must be reversible, and a desk saved before scenes existed must still open.

A scene is the saved desk the store already keeps, marked `version: 2`. What it keeps and what it never keeps are decided in [[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]], part A, which is at `proposed`.

## Acceptance Criteria

- [ ] A reopened scene shows the collection's current members and count and each document's current text; the saved scene holds no row, member id, count or note body. — evidence to be collected: [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
- [ ] A scene restores the view it was saved on, its search text and filters, the collection's place, size, collapsed state and presentation, and each open document's place, size and stacking; yaw, zoom, the focus document, open lists, relationship emphasis and undo history are never in a saved scene and are left as the window has them. — evidence to be collected: [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
- [ ] Each document reopens where it was being read once its text is in: under the saved heading when that heading still exists, and at the saved fraction when it does not, in which case the scene says the passage moved. — evidence to be collected: [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
- [ ] A reopened scene says what changed in one message that stays until dismissed: a note that no longer exists keeps its document, labelled, and is never replaced by another note; a field smaller than the one the scene was arranged in draws the documents inside it and leaves their stored places unchanged; a different member count is not reported. — evidence to be collected: [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]], [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]
- [ ] Opening a scene is undone by a control named for the desk before it, which restores that desk, collection, search and filters for this window's session; it is a different control from Undo arrangement, and neither changes a note's text or undoes a project action. — evidence to be collected: [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]], [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]
- [ ] A scene is saved, opened, renamed, deleted and restored after a delete by pointer and by keyboard; saving under an existing name asks before replacing; the scene's name is the `desk=` parameter of its address. — evidence to be collected: [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
- [ ] A desk saved before scenes opens exactly as it did; a stored scene whose version is newer than this Deck reads is kept unchanged, listed as unreadable with its version, and not opened. — evidence to be collected: [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]]
- [ ] The served page lists and opens no scene, and saving, opening, renaming or deleting a scene changes no file in the workspace. — evidence to be collected: [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]], [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]

## Evidence collected, 2026-10-02

No criterion is ticked. Ticking is a person's act at the feature's close-out, after [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]] has been walked, and it has not been walked. The table says what exists for each criterion and what is still owed. "The suite" is the nine tests of `desktop/tests/scenes.test.mjs` ([[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]]), which passed in the full run of 586 tests at commit `9379a0c`. "The walk" is the scripted walk `glass-scenes`, 26 checks, all held, in a Linux container at commit `4243fc2` ([[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]). A scripted walk is not a person's walk.

| Criterion | What exists | Still owed |
| --- | --- | --- |
| 1. Current members, count and text; nothing derived saved | The suite asserts the exact set of keys a scene holds. The walk reads the saved scene's keys in a window, finds the count on screen equal to the sidecar's at the moment of reopening (144), and sees a renamed heading reported, which needs the note's new text. | The count after a note joins or leaves the view under a saved scene: the walk adds no member and does not compare the count after it deletes one. A person's walk. |
| 2. View, search, filters, collection and documents restored; nothing of the session saved or changed | The suite covers view, search, filters, collection layout, places, sizes and stacking in the store. The walk shows the view, the search, the collection as cards and both documents at their places and sizes, with the turn and the zoom unchanged. | Filters in a window: the walk sets none. The focus document, open lists and relationship emphasis before and after: no check compares them. One difference: opening a scene clears the arrangement undo, so undo history is not left as the window had it. |
| 3. Each document reopens where it was being read | The suite covers the anchor both ways, a heading that moved and a heading that is gone. The walk finds each document under the same heading at the same distance, and the renamed heading reported as a passage that moved. | A document whose read fails and is retried: a waiting anchor is dropped after five seconds, and no check covers it. A person's walk. |
| 4. One message that stays; a missing note keeps its document; a smaller field; no count | The suite covers the three sentences and the absence of a count. The walk sees all three in one message, the missing note's document under its own title with a label, the stored places unchanged in the smaller field, and the message gone only when dismissed. | A check that every document's header is inside the smaller field: only the walk's picture shows it. A person's walk. |
| 5. Undo named for the desk before; separate from Undo arrangement; no note changed | The suite puts back the view, the search and the documents. The walk presses `Undo: back to the desk before "Review Glass"`, finds the Issues desk back as it stood, and finds the control gone after a reload. | The collection layout and the filters after the undo: not compared. Both undo controls on screen at once: not shown. That neither changes a note's text: no files were compared, because the walk's copy is not a git repository. |
| 6. Saved, opened, renamed, deleted and restored by pointer and by keyboard; asks before replacing; `desk=` | The walk does each by pointer, chooses a scene in the list with the arrow keys, types the names, sees "replace it", "keep it" and "cancel" for a name that is taken, and finds the scene's name and view in the copied address. | "open", "rename", "delete" and "restore" by keyboard: the walk presses them with the pointer. Opening the copied address. One difference: saving under the open scene's own name replaces it without asking. |
| 7. A desk from before scenes opens as it did; a newer version is kept, listed with its version and not opened | The suite covers both in the store. The walk opens a desk with no version and finds it on the view on screen with no search of its own. | An unreadable entry in a window: no walk made one. One difference: the list reads "(cannot be opened)" and the version is in a tooltip, not in the list's text. |
| 8. The served page lists and opens no scene; no file changes | The walk loads the served page with no preload bridge and finds the scene controls hidden. | A comparison of the workspace's files before and after: not made. A real tablet. |

## Approval

Approved for building on 2026-10-02. Edwin asked for this to be delivered in full with DES-0003 as the baseline: “Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

The decision these criteria rest on, ADR-0007, is proposed and not accepted. Approval here means the criteria are the ones being built against. It does not mean Edwin has accepted the decision.

One line of that decision is not a criterion yet. Whether a reopened scene also names a note whose file moved is open, because a scene keeps a note's id and no path. ADR-0007 lists it under Acceptance. If Edwin asks for it, this requirement is amended before close-out.

The table above names three places where the build differs from a criterion: the arrangement undo is cleared when a scene opens, saving under the open scene's own name does not ask, and an unreadable scene's version is in a tooltip. Each needs either a change to the build or an amendment here before its criterion can be ticked. That choice is Edwin's.

## Traceability

- Implements: [[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]
- Verified by: [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]], [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
