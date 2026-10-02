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

## Approval

Approved for building on 2026-10-02. Edwin asked for this to be delivered in full with DES-0003 as the baseline: “Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

The decision these criteria rest on, ADR-0007, is proposed and not accepted. Approval here means the criteria are the ones being built against. It does not mean Edwin has accepted the decision.

One line of that decision is not a criterion yet. Whether a reopened scene also names a note whose file moved is open, because a scene keeps a note's id and no path. ADR-0007 lists it under Acceptance. If Edwin asks for it, this requirement is amended before close-out.

## Traceability

- Implements: [[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]
- Verified by: [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]], [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
