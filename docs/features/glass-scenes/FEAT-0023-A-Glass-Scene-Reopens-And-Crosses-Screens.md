---
type: "[[feature]]"
id: FEAT-0023
title: "A Glass scene reopens and crosses screens without losing its work"
status: doing
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

This feature extends two things the code already had. The store keeps named desks (`state.desks`, with `save-desk`, `open-desk` and `delete-desk`, and the `desk=` address parameter), and Spread has controls for them. A card can be thrown to another window or sent there with `S` (`deck:window:throw`). Before this feature Glass had no control for a saved desk, and a sent note was reported as landed before the other window drew it.

The list below is what was asked for. Where the build differs, the difference is under Decisions, "Settled while building", and in ADR-0007's section dated 2026-10-02.

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

**Where it stands, 2026-10-02.** The feature is built and committed (`b1bfa1d`, `9b7a062`, `f80339f`, `a37f8f2`, `5f706a5`, `0df09fe`, `9379a0c`, `4243fc2`). It stays at `doing`: all five tasks are at `doing`, each with an open box or an open step listed in its own note. The acceptance check has not been walked. None of these commits is pushed, so no CI run covers them.

**What was run.**

- **Every node suite.** `cd desktop && npm test`, on 2026-10-02 at commit `9379a0c`: 586 of 586 passed. `9379a0c` is the last commit that changed application code. The session that built the feature ran it and reported the count; the close-out that wrote this section did not run it again. The two suites of this feature are in that run: `scenes`, nine tests ([[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]]), and `handoff`, sixteen tests ([[TST-0075-A-Move-Is-Never-Half-Done]]).
- **The smoke run.** `bash tools/scripts/smoke-in-a-box.sh both`, on 2026-10-02 at commit `4243fc2`, in the `project-os-deck-smoke` Linux container (Electron under Xvfb, 1440 by 900, software rendering), from a separate clone: exit 0 for the loopback half and the network half. The loopback half was run once more with each check printed: 389 passed, 0 failed, 0 skipped, 2 not applicable (the throw to an empty display, and the checks shaped for a tablet on the network). The Glass section is 291 of those. The parts that drive this feature: `throw`, 11 checks; `desks`, 47 checks, two of which hand a note to a desk panel; `address`, 4 checks, the last of which is "git status in the workspace is unchanged after every Glass check"; and the verb section, 31 checks, one of which is the popped-out window keeping its own list after a write.
- **The scenes walk.** `bash tools/scripts/walk-in-a-box.sh glass-scenes --copy`, same day, commit and container: exit 0, 26 checks, none failed, four pictures.
- **The handoff walk.** `bash tools/scripts/walk-in-a-box.sh glass-handoff`, same day, commit and container: exit 0, 24 checks, none failed, seven pictures. `git status` in the workspace was the same before and after it.

Both walks are recorded in [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]], which moved to `passing` on 2026-10-02. A scripted walk sends real pointer and key events to the real application and checks what is on screen. It is not a person's walk.

**What was not done.**

- **[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]] has not been walked.** It is a person's, it rests at `active`, and the ledger holds no verdict for it. Its steps were corrected against the built application on 2026-10-02 from the code and the walks' records.
- **Nothing was tried on a second display.** That leaves unseen: a window landing on another display, a new reader opened on an empty display, and a display unplugged during a handoff. The rule for a removed display is tested without a window, and the listener in the main process has never fired in a run.
- **Nothing was tried on a real tablet, with a screen reader or by touch.** The served page was a second window on the same machine with no preload bridge.
- **Nothing was timed on the Mac.** The two times recorded, 159 ms to a desk window and 904 ms to a reader, are one reading each in the container. The time to reopen a scene and the frame cadence while one is restored were not measured anywhere.
- **Neither walk was run on a second workspace.**
- **No rule was broken on purpose to see a test fail,** so TST-0074 and TST-0075 have no adequacy record.
- **No files were compared for the scene actions.** The scenes walk runs on a copy that is not a git repository.
- **The walks do not repeat the route by keyboard alone or under reduced motion.** The keyboard chooses a scene in the list, types a name, and opens the handoff chooser. Reduced motion is emulated for one "send back".
- **The independent review has not been run.** TST-0076 reaching `passing` is one of its gates; the feature's one review covers it.
- **No invalidation event was written to the ledger** for the acceptance checks this feature reopened (TST-0038, TST-0063, TST-0064).

**Known and not fixed.** Each was found at the close-out on 2026-10-02 and is in code this feature changed.

- "Send back" is offered for a window that has closed. The handoff walk's record shows it, and no check asserts against it ([[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]], Notes).
- In a window 1180 pixels wide Glass's bar does not fit, and the undo button is cut off by the window's edge ([[TASK-0107-Save-Reopen-And-Undo-Scenes-In-Glass]], Notes).
- The entry for a new reader on an empty display reads "Also show in the a new reader on …". A unit test asserts the same words in another sentence. No machine with one display shows it.

## Decisions

The five questions this note listed before implementation are answered in [[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]. That decision is at `proposed`. The implementing session made it on 2026-10-02 and accepting it is Edwin's. This feature is built against the proposal.

| Question, as filed on 2026-10-01 | Where it is answered |
| --- | --- |
| Which values are part of a named scene, and do yaw, zoom, active subject and scroll anchors persist? | ADR-0007 A2 and A3. Reading anchors are kept. Yaw, zoom and the focus document are not. A desk with no version is unchanged. |
| How are scenes addressed, renamed, deleted and recovered, and what happens to a version that cannot be read? | ADR-0007 A1 and A7. The name is the `desk=` parameter. An unreadable version is kept and listed. |
| How do current results reconcile with removed notes, moved files and rearranged objects? | ADR-0007 A4 and A5. Everything is read live, and one message says what changed. A moved file is an open thread. |
| Which host owns the handoff acknowledgement, and how do cancellation, closure and disconnection recover? | ADR-0007 B3. The main process owns it and undoes a landing that is not acknowledged. |
| How are scene undo and arrangement undo presented? | ADR-0007 A6. Two controls with two names, neither touching a note. |

One more was settled while building, 2026-10-02, and it changes a view outside this feature.

- **A desk window draws a note handed to it even when its view does not list that note.** A desk window is always drawn as Spread cards, and Spread dropped a card its view does not list unless the note was kept on every view ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], decision 7). So "Move to the desk on …" from another view could never arrive. Spread now draws any note on its desk that the workspace has, marked "not in this view", as a Glass document already is. The first fix tried was a refusal with the reason (commit `5f706a5`); it was replaced because it left an offer that could never be taken up (commit `9379a0c`). The scripted walk had reported this move as working. It worked only because of a defect fixed in `a37f8f2`: after a write a popped-out window listed the main window's view. That is recorded in [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]].

**Settled while building, 2026-10-02.** These are routine details. Each says what the build does, with the reason where a commit or the code gives one. Those that differ from ADR-0007 are also listed there, in its section dated 2026-10-02, for Edwin to accept or send back.

- **Opening a scene is its own press.** Choosing a name in the list changes nothing, and an "open" button opens it. On some systems the arrow keys change a list's value at every step, and opening on that replaced the desk with each scene passed on the way (commit `b1bfa1d`).
- **A scene's name is asked for in the status line, with the open scene's name already typed.** Saving under another scene's name asks "replace it", "keep it" or "cancel". Saving under the open scene's own name replaces it without asking. No commit says why, and ADR-0007 A7 says saving under a name that exists asks first.
- **The list says what each entry is by what it shows.** A scene reads "name · view · n notes", a desk from before scenes reads "name · n notes", and a scene of a newer version reads "name (cannot be opened)", cannot be chosen, and has its version in a tooltip.
- **The desk before a scene is kept by the window.** The window builds it with the function that builds a scene and puts it back with one store action, `apply-scene`, so one piece of code applies both. It is never in the state file.
- **Opening a scene clears "Undo arrangement".** The desk that arrangement would put back was replaced as a whole.
- **A reading position waits five seconds for its text.** After that the scene reports with what it has, because a note that is gone never gets text. A retry that succeeds later is not scrolled to the saved position.
- **A document built again goes back to where this window last read the note,** for the session. Before, it opened at its top (commit `f80339f`). A scene's or a handoff's reading position is applied after it and wins.
- **Which of a scene's notes still exist is asked of Deck's own index.** When the index does not answer, the message says Deck could not check, and makes no claim.
- **A missing note's document keeps the text this window read earlier,** labelled as last read, with "retry" and "close".
- **The wait for a destination is four seconds, and twelve for a reader window.** A reader has to load a page before it can answer.
- **A destination answers for itself.** It looks every 100 ms for up to 3.5 seconds for the note on its own screen. If it has not drawn it by then it says so, and the landing is undone at once with that reason. It counts a card as shown only when the card is on screen, not when a hidden element still carries the note's id (commit `9379a0c`).
- **A landed note stands near the top left of the destination desk,** 16 pixels in, stepped down by one header for each note already there. So a note sent back does not return to the place it left.
- **A document goes only where it is released on a named entry of the strip.** A fast release past the edge sends a document nowhere. The speed of a throw is read only for a card from the field, which carries no act and is shown, not moved.
- **What releasing does is the strip entry's tooltip.** The entry's label names the act, what the window carries and its display. The keyboard chooser's rows carry the label only.
- **A window is named by what it carries and its display,** "the desk on the main display", and not by the view it draws.
- **After a release on the strip the window says it is waiting for the other window.** The document carries no mark of being sent.
- **The arrival mark is an outline for 2.4 seconds, in Glass.** The message is the window's status line, with "send back" in it. A desk window and a reader show the message and no mark.
- **`S` on a note that arrived lists "Send back to …" first.**
- **The box's image carries git,** so a run can ask whether the workspace is as it was. Without it a run could only say it was unable to ask (commit `9379a0c`).

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
- Tests: [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0075-A-Move-Is-Never-Half-Done]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
- Issue found and fixed: [[ISS-0091-A-Popped-Out-Window-Switches-The-Main-Windows-View]]
- Baseline: [[DES-0003-Collections-And-Documents-On-Glass]] states the principles this is built on and does not draw scenes or handoff, so this note carries no `design:` link.
