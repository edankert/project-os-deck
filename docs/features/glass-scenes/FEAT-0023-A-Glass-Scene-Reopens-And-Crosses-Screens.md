---
type: "[[feature]]"
id: FEAT-0023
title: "A Glass scene reopens and crosses screens without losing its work"
status: planned
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["Edwin 2026-10-02: 'Complete the documented later Glass enhancements: Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff.'", "Edwin 2026-10-01: 'This sounds great update the documents to support this fully.'", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
goal: "A person can return to a named arrangement of a view's live collection and documents, and send a document to another window or display without losing its identity, size or reading position."
requirements: ["[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]"]
tasks: ["[[TASK-0106-Keep-A-Scene-In-The-Store]]", "[[TASK-0107-Save-Reopen-And-Undo-Scenes-In-Glass]]", "[[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]]", "[[TASK-0109-Show-The-Destination-The-Arrival-And-The-Way-Back]]", "[[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]]"]
release: ""
acceptance_exception: ""
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]", "[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]", "[[PHASE-0002-Glass]]"]
---

# Return to a Glass scene and carry work across screens

> [!quote] As asked — Edwin, 2026-10-02
> 4. Complete the documented later Glass enhancements: Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff. […] Respect the documented phase and authority boundaries. Do not fabricate evidence, relationship meanings or unsupported backend fields. Identify any genuinely external dependency precisely and continue all independent work.

## Goal

A person saves one view's Glass desk under a name and comes back to it later. The collection lists the notes it holds that day, each document shows that day's text where it was being read, and the scene says what is no longer as it was saved.

A person sends a document to another Deck window or display and knows, before letting go, where it is going and whether it leaves their desk. The source keeps the document until the destination has drawn it, and there is a way back.

## Scope

This feature extends two things the code already has. The store keeps named desks (`state.desks`, with `save-desk`, `open-desk` and `delete-desk`, and the `desk=` address parameter), and Spread has controls for them. A card can be thrown to another window or sent there with `S` (`deck:window:throw`). Glass has no control for a saved desk, and a sent note is reported as landed before the other window draws it.

**Scenes.**

- A scene is a saved desk marked `version: 2`. It keeps the view, the search text and filters, the collection's place, size, collapsed state and presentation, each open document's note id, place, size and stacking, each document's reading anchor, the field size and the time it was saved. A reading anchor (where a document was being read) is the nearest heading above the top of the view, how far past it, and the scroll fraction as a fallback.
- A scene keeps no collection row, member id or count, no note body, and nothing of the session: no yaw, zoom, focus document, open list, relationship emphasis or undo history.
- Reopening switches to the scene's view, applies its search and filters, restores the collection and documents, and reads members, counts and text from the source then. Reading anchors are applied once each document's text is in.
- One message, which stays until dismissed, says what changed: notes that no longer exist, a field smaller than the one the scene was arranged in, and a reading passage that moved. A missing note keeps its labelled document. A different member count is not a change.
- "Undo: back to the desk before <name>" restores the desk, collection, search and filters that were there, for this window's session. It is a different control from "Undo arrangement".
- A scene can be renamed and deleted. A deleted scene can be restored until the window closes or another scene is deleted. Saving over an existing name asks first. A desk with no version opens as before. A scene of a newer version is kept, listed as unreadable and not opened.

**Handoff.**

- Two acts with two names. **Move to**: the note leaves this desk and stands on that one. **Also show in**: that window shows it too and this desk keeps it. A desk is offered both. A reader window, a new reader on an empty display and the tablet are offered "Also show in" only.
- The target strip and the keyboard chooser name the window, the display and the act before release.
- The main process lands the note and waits for the destination window to report it has drawn the document. Only then does a move remove the source's document. With no answer in a few seconds, a closed destination or a disconnected display, the landing is undone and the source says so.
- The document arrives at the size and reading position it had. The destination marks it, names where it came from and offers "send back". Under reduced motion nothing travels and the mark and message are the same.
- `S` on a document offers the same two acts, and "send back" is reachable from the keyboard.
- The tablet is read-only. It cannot be a source and cannot acknowledge. A send to it is "Also show" on the desk it follows, said to be unconfirmed.
- Handoff records belong to the main process for the session. Nothing about a handoff is saved.

**Out of scope.** Camera persistence (yaw, zoom). Several independent collections on one desk. A scene that spans several views or several windows. Arranging or writing from the tablet. Headset input. FEAT-0021's evidence and levels. A new sidecar route, a new write route, a new dependency.

## Acceptance

- A scene saved on one day and reopened after notes changed shows the current members, count and text. The state file's entry for the scene holds no row, member id, count or note body.
- Reopening restores the view, search, filters, collection layout and each document's place, size, stacking and reading position. It changes no yaw, zoom, focus document, open list or emphasis.
- A scene whose note was deleted keeps a labelled document for it and says so. A scene reopened in a smaller field draws every document inside the field, says so, and leaves the stored places unchanged. A heading that is gone is reported as a passage that moved.
- "Undo: back to the desk before <name>" restores the previous desk, collection, search and filters. "Undo arrangement" is a different control. Neither changes a note file.
- Rename, delete, restore and replace-with-confirmation work by pointer and by keyboard. A desk with no version opens as it did. A scene of a newer version is listed as unreadable with its version and is still in the state file afterwards.
- "Move to" and "Also show in" are named in the strip and in the chooser before release. After a move the note is on the destination desk and not on the source desk. After "Also show in" both show it.
- A move's source document is still there until the destination reports it has drawn the note. A destination that does not answer, closes, or loses its display leaves the source document where it was, with a message, and no desk holding the note twice.
- The document arrives at its size and reading position, marked, with a message naming where it came from and a working "send back". Reduced motion shows the mark and the message without travel.
- The served page offers no scene control and no handoff. A send to the tablet is named "Also show" and unconfirmed. The host still answers 405 to every method that is not a read. `git status` in the workspace is unchanged by any of it.

## Verification

Nothing is built and no check has been run. The checks that will hold the evidence are:

- [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]], the acceptance check a person walks, including a second display and the tablet.
- [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], the scene model without a window: `bash tools/scripts/run-desktop-tests.sh scenes`.
- [[TST-0075-A-Move-Is-Never-Half-Done]], the handoff's states without a window: `bash tools/scripts/run-desktop-tests.sh handoff`.
- [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]], the scripted walk in the box: `bash tools/scripts/walk-in-a-box.sh glass-scenes --copy`.

TASK-0110 records the measurements and the pictures. Before the review, this section is replaced by the full test command, its date and its result count.

## Decisions

The five questions this note listed before implementation are answered in [[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]. That decision is at `proposed`. The implementing session made it on 2026-10-02 and accepting it is Edwin's. This feature is built against the proposal.

| Question, as filed on 2026-10-01 | Where it is answered |
| --- | --- |
| Which values are part of a named scene, and do yaw, zoom, active subject and scroll anchors persist? | ADR-0007 A2 and A3. Reading anchors are kept. Yaw, zoom and the focus document are not. A desk with no version is unchanged. |
| How are scenes addressed, renamed, deleted and recovered, and what happens to a version that cannot be read? | ADR-0007 A1 and A7. The name is the `desk=` parameter. An unreadable version is kept and listed. |
| How do current results reconcile with removed notes, moved files and rearranged objects? | ADR-0007 A4 and A5. Everything is read live, and one message says what changed. A moved file is an open thread. |
| Which host owns the handoff acknowledgement, and how do cancellation, closure and disconnection recover? | ADR-0007 B3. The main process owns it and undoes a landing that is not acknowledged. |
| How are scene undo and arrangement undo presented? | ADR-0007 A6. Two controls with two names, neither touching a note. |

Three threads are open under ADR-0007's Acceptance section, and each is Edwin's: whether a scene names a note whose file moved, whether a scene should remember its view (FEAT-0015 left that question to him), and whether a heading's words may be kept as a locator.

## Impact analysis

Checked on 2026-10-02 against REQ-0001, REQ-0002, REQ-0003, FEAT-0015, FEAT-0014, FEAT-0020, FEAT-0022, ADR-0001, ADR-0003 and ADR-0006.

**No conflict found with:**

- **REQ-0001.** Its last criterion says saved collection state "holds query identity, filters and layout, then resolves current rows; an old desk without that state opens with safe defaults". A scene keeps exactly those and resolves rows live.
- **REQ-0002.** One spatial representation per note holds across a handoff: a move ends with the note on one desk, and landing on a desk that already holds the note raises the document that is there. The tablet stays read-only.
- **REQ-0003 and FEAT-0022.** "Undo arrangement" keeps its meaning and its per-window session state. Scene undo is a second control. FEAT-0022 says "FEAT-0023 owns named restoration and richer handoffs".
- **FEAT-0020.** It says "Named scenes and polished cross-screen return belong to FEAT-0023" and keeps regression coverage of the existing second-window behaviour, which TASK-0108 must keep passing.
- **ADR-0001 and ADR-0003.** No route is added to Deck's host and no write is added. The acknowledgement travels through the preload bridge, which the served page does not have.
- **ADR-0006.** Its consequence reads "A saved desk records a collection query and arrangement, not a copied result". A scene is that.

**Three tensions, none resolved here. Each is listed for Edwin under ADR-0007's Acceptance or below.**

1. **FEAT-0015 left a question to Edwin that this feature answers for scenes.** FEAT-0015 says: "Should a saved desk remember the view it was saved on? As planned it does not" and "until Edwin answers, a saved desk opens on whichever view is current". ADR-0007 A1 and A4 say a scene keeps its view and reopening switches to it. Desks with no version keep FEAT-0015's behaviour.
2. **DES-0003 says scroll anchors are local, and a scene saves one.** DES-0003: "Window scroll anchors and transient focus remain local." It also defers scenes to this feature's persistence decision. A scene saves a reading anchor only when a person saves the scene; ordinary scrolling is still not stored.
3. **The search text and filters are shared by every window.** The store's own comment on them is "Shared, so a second window narrows with it". Opening a scene therefore narrows every window on the workspace, and scene undo puts them back for every window. This is the existing store's behaviour and not a new rule.

**Behaviour of FEAT-0014 that changes.** Today a note thrown to the focus window is focused there (`focus-note`) and nothing is put on a desk. Under ADR-0007 the focus window is a desk destination, so that "send back" can return a note to the window it left. Today's answer of `ok` before anything is drawn is replaced by an acknowledgement. TST-0045's throw steps and the smoke run's throw checks must be reconciled in TASK-0108.

**Phase.** PHASE-0002 already lists this feature and has an exit criterion for it: its "acceptance walk records restoration, fresh query membership and recovery from an unavailable display". TST-0073 walks all three. No later-phase dependency is needed. FEAT-0021's evidence and levels stay in PHASE-0004 and are not used.

## Risk scan

Scanned on 2026-10-02 against the five triggers in `tools/instructions/LIFECYCLE.md`.

- **A new external dependency or version constraint: none.** No package is added and the sidecar is not asked for anything new.
- **A new required environment variable or configuration surface: none.**
- **A directory layout or artifact path change: none.** The state file stays where it is. What changes is the shape of one entry in it, which is the next point.
- **A runtime increase or new long-running step: none.** A handoff waits a few seconds at most for an acknowledgement, and the wait has a stated limit.
- **A security, credential or licence exposure: none new.** The acknowledgement passes between Deck's own windows through the preload bridge. The served page has no bridge, and the host refuses every method that is not a read. The served state already carries saved desks to the tablet (`shared/served-state.ts`); a scene adds search text and heading words to that, and the tablet can already read every note's text.

Two hazards are not on the trigger list and are real. A saved shape changes, and a move could lose or double a document. Both are the kind [[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]] tracks, so that risk is widened and no new risk note is opened. It now names the scene version, the unknown-version rule and the handoff's rollback, with TASK-0106 and TASK-0108 as mitigation.

## Provenance

This note was filed on 2026-10-01 as a backlog finding, with Edwin's words "This sounds great update the documents to support this fully." Its findings, kept as filed:

> A scene is a named arrangement of live collection queries and note identities, such as “Review Glass” or “Compare designs”. Reopening resolves current content and exact current memberships. A scene must never pass a saved result copy off as a live query.
>
> The scene should restore useful positions, presentations, sizes and a meaningful reading anchor. Missing or inaccessible notes remain labelled so a reopened scene explains what changed. A smaller window or disconnected display keeps every object reachable and discloses any rearrangement.
>
> The cross-screen handoff builds on the existing throw and named-window send routes. Preview the destination before release, indicate arrival, preserve the document's chosen size and reading position, and offer a return route. The destination must acknowledge the handoff before the source discards ownership. A cancelled or failed send leaves the source usable. Define move versus additional-window reference explicitly so handoff cannot create accidental duplicate objects in a desk.
>
> Keyboard users get the same destination choice and return command. Reduced motion omits travel without omitting arrival feedback. The served tablet remains a read-only companion; remote arrangement and writes require a separate authority decision. Headset input is not part of this feature.

Its delivery boundary said to start after FEAT-0020 and FEAT-0022 established object identity and reversible arrangements, and to run the scaffold, impact analysis and risk scan at adoption. Both features are at `doing` on 2026-10-02, and this note is that adoption.

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Decision: [[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]] (proposed)
- Requirements: [[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]], [[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]
- Tasks: [[TASK-0106-Keep-A-Scene-In-The-Store]], [[TASK-0107-Save-Reopen-And-Undo-Scenes-In-Glass]], [[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]], [[TASK-0109-Show-The-Destination-The-Arrival-And-The-Way-Back]], [[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]]
- Acceptance: [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]
- Baseline: [[DES-0003-Collections-And-Documents-On-Glass]] states the principles this is built on and does not draw scenes or handoff, so this note carries no `design:` link.
