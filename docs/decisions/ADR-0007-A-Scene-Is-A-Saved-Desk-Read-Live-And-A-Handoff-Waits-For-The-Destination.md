---
type: "[[adr]]"
id: ADR-0007
aliases: ["ADR-0007"]
title: "A scene is a saved desk that is read live when reopened, and a handoff between windows waits for the destination to draw the note"
status: proposed
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source:
  - "Edwin 2026-10-02: 'Complete the documented later Glass enhancements: Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff.'"
  - "Edwin 2026-10-02: 'Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.'"
  - "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]], the five questions it listed before implementation"
decision: "A scene is the saved desk Deck already has, marked version 2: it keeps one view's places, sizes, search, filters, collection layout and reading positions, keeps nothing derived and nothing of the session, and is read live when reopened. A handoff between windows is one of two named acts, Move to and Also show in; the main process lands the note, waits for the destination window to report it has drawn the document, and only then lets a move's source go. A handoff that is not acknowledged is undone."
context: "FEAT-0023 was filed with five open questions: what a named scene holds, how it is addressed and versioned, how it meets notes that changed, which host owns a handoff's acknowledgement, and how scene undo sits beside arrangement undo. Today a saved desk holds a name and a list of cards, and a note sent to another window is reported as landed before that window has drawn anything."
alternatives:
  - "A new `scenes` table beside `desks`, with its own address parameter: two saved things with one job, and every address written with `desk=` would name the lesser one"
  - "Save the collection's rows with the scene so it reopens identically: a saved result copy then passes as a live query, which REQ-0001 and FEAT-0023's findings rule out"
  - "Save yaw, zoom and the focus document in the scene: DES-0003 says not to, and the phase keeps them as window state"
  - "Keep one act, 'send', and let the source decide afterwards whether to close its document: the person cannot tell before release whether the note will leave"
  - "Let the source window confirm with the destination directly: two renderers would each hold half of a move, and neither could undo the other's half when a window closes"
  - "Report a handoff as landed when the store accepts it, as today: the store accepting a note is not the destination drawing it"
consequences:
  - "The `Desk` shape in the state file gains optional fields and a `version`; a desk with no version reads and opens exactly as before"
  - "The address grammar does not change: `desk=` names a scene as it names a saved desk"
  - "One new message passes between the main process and a destination window through the preload bridge; the served page has no bridge and takes no part"
  - "Opening a scene changes the search text and filters, which every window on the workspace shares"
  - "FEAT-0015's open question, whether a saved desk remembers its view, is answered for version 2 scenes only, and that answer is Edwin's to confirm"
  - "RISK-0007 is widened to cover the scene version and a handoff's rollback"
supersedes: ""
superseded: ""
amends: ""
related: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]", "[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
---

# A scene is a saved desk read live, and a handoff waits for the destination

**This decision is proposed, not accepted.** The implementing session made it on 2026-10-02 so that FEAT-0023 could be built, under Edwin's instruction to "resolve routine design details using its principles and record your decisions". Accepting it is Edwin's. FEAT-0023, REQ-0004 and REQ-0005 are built against the proposal as written here, and three threads it leaves open are listed under Acceptance.

## Context

FEAT-0023 was filed on 2026-10-01 with five questions to answer before anything was built. They were: what a named scene holds, how it is addressed, versioned and recovered, how it meets notes that changed since it was saved, which host owns a handoff's acknowledgement, and how scene undo sits beside arrangement undo.

The code already has most of the parts. The store keeps named desks in `state.desks`, keyed by workspace and name, each holding a name, a workspace and a list of cards. The actions are `save-desk`, `open-desk` and `delete-desk`, and the name is the `desk=` parameter of a Deck address. Spread has the controls for them and Glass has none. The store also keeps, per view, the documents on the desk (`viewDesks`), the collection's place and presentation (`collections`) and the reading size (`readingSizes`). The search text and the filters are single values every window shares.

A note can already be sent to another window. Dragging a card to an edge, or pressing `S` on a document, asks the main process to land it (`deck:window:throw`). The main process puts it on a desk panel's desk, re-addresses a reader window, or opens a new reader on an empty display. It answers `ok` at once. Nothing confirms that the destination drew the note. The document's size and reading position are not carried. The source keeps its document, and there is no way back.

## Decision

### A. What a scene is

1. **A scene is a named, saved arrangement of one view's Glass desk.** It extends the saved desk in `state.desks`. It keeps the same key and the same `desk=` address parameter, and it is marked `version: 2`. A desk saved before this has no version and still opens exactly as it did.
2. **A scene keeps where things stand and how they are shown.** That is: the view it was saved on; the search text and the filters; the collection's place, size, collapsed state and presentation; each open document's note id, place, size and stacking; each document's reading anchor; the size of the field it was arranged in; and when it was saved. A reading anchor (where a document was being read) is the nearest heading above the top of what is in view, by its words, plus how far past that heading the view was, plus the scroll position as a fraction of the whole for when the heading is gone.
3. **A scene never keeps anything derived, and nothing of the session.** It holds no collection row, no member id and no count. It holds no note's text. It holds no yaw, no zoom, no record of which document is the focus, no open list, no relationship emphasis and no undo history. DES-0003 says: "Do not save yaw, focus or the undo history under the label of a scene". A saved copy of a result must never pass as a live query. The one place a scene holds words from a note is the heading in a reading anchor, which is a locator and is listed under Acceptance.
4. **Reopening reads everything live.** Deck switches to the scene's view, applies its search and filters, restores the collection and the documents, and then reads. The collection's members and count are the current ones. Each document's text is read now. A reading anchor is applied once that document's text is in. When the heading no longer exists, the fraction is used and the scene says the passage moved.
5. **A reopened scene says what changed, in one message that stays until it is dismissed.** It names the notes that no longer exist. Their documents stay on the desk, labelled, and are never replaced by another note. It says when the field is smaller than the one the scene was arranged in; the documents are then drawn inside the field and their stored places are not changed. It says when a reading passage moved. A member count that differs from the day the scene was saved is not reported, because the count is live by definition. Whether the message also names a note whose file moved is open; see Acceptance.
6. **Opening a scene can be undone.** Opening replaces this view's desk, so the window offers "Undo: back to the desk before <name>". It restores the desk, the collection, the search and the filters that were there, and it lasts for this window's session. It is a separate control from "Undo arrangement" and carries a different name. Neither changes a note's text or undoes a project action.
7. **Rename, delete and recovery.** Renaming keeps the scene and changes its name and its address. Deleting removes it and offers "restore" until the window is closed or another scene is deleted. Saving under a name that exists asks before replacing. A stored scene whose version is newer than this Deck understands is kept untouched, listed as unreadable with its version, and not opened.
8. **The served page lists and opens no scene.** Scenes belong to the shell. A tablet shows whatever desk the Mac has.

### B. What a handoff is

1. **There are two acts, and they are named differently everywhere.** **Move to** means the note leaves this desk and stands on that one. **Also show in** means that window shows it too and this desk keeps it. A destination that is a desk is offered both. A reader window, a new reader on an empty display and the tablet are offered "Also show in" only, because none of them is a desk a note can be moved onto.
2. **The destination is shown before release.** The target strip, and the keyboard chooser, name the window, the display and the act. For a move they say that the note will leave this desk.
3. **The destination acknowledges before the source lets go.** The main process lands the note and tells the destination window. It then waits for that window to report that it has drawn the note's document: its text is in, or the document says by name that the text could not be read. Only then is a move's source document removed. If no answer comes within a few seconds, or the destination closes, or its display disconnects, the landing is undone, the source document stays, and the source says so. A move is never half done. No failure leaves two copies on one desk.
4. **The handoff carries the document's size and its reading anchor.** The destination opens the document at that size and at that position.
5. **Arrival is shown, and there is a way back.** The destination marks the document and shows a message naming where it came from. It offers "send back", which is the same handoff in reverse while the source window exists. Under reduced motion nothing travels across the screen; the arrival mark and the message are the same.
6. **The keyboard has the same choice.** `S` on a document, which exists today, becomes a chooser of "Move to …" and "Also show in …". "Send back" is reachable from the keyboard too.
7. **The tablet's authority is unchanged.** It is read-only. It cannot be a source. It cannot acknowledge, because it has no route back to the shell. A send to it is "Also show" on the desk it follows, and the source says plainly that the arrival is unconfirmed.
8. **A handoff is session state.** The records of handoffs in progress and of where a note came from are the main process's, for the session. Nothing about a handoff is saved.

### What these two decisions imply, stated so it is not discovered while building

- **A desk is one view's desk in one workspace, shared by every window that draws that view.** Two windows on the same view draw the same desk. A move between them would take the note off the desk it is meant to land on. Such a destination is offered "Also show in" only, or the strip says the note is already on that desk.
- **The focus window is a desk destination.** "Send back" from a desk panel has to be able to return a note to the window it left, and that window is usually the focus window. Today a throw to the focus window only focuses the note (`focus-note`); under this decision it lands the note on the desk of the view that window shows.
- **"Send back" after "Also show in" finds the source's document.** The source kept its document, so there is nothing to move back. "Send back" raises the document in the source window. After a move it moves the note back.
- **A rollback removes only what the landing added.** When the destination desk already held the note, landing raises the document that is there, and undoing the landing leaves it there.
- **A note kept on every view stays one note.** FEAT-0015, decision 11, says opening a saved desk leaves notes on every view where they are. A scene follows that rule. Such a note is already on every view's desk in the workspace, the destination's included, and taking it off one desk takes it off all of them (`take-off-desk`). It is therefore offered "Also show in" only.

## Alternatives

- **A separate `scenes` table and a `scene=` address parameter.** Rejected. Spread's saved desk and a Glass scene would be two saved things doing one job, and an address written last month with `desk=` would open the lesser one. Extending the desk keeps one list, one key and one parameter.
- **Save the collection's rows.** Rejected. The scene would reopen looking exact while showing last week's members. REQ-0001 already requires that saved collection state "resolves current rows".
- **Save the camera and the focus.** Rejected. DES-0003 and PHASE-0002 keep yaw, zoom and focus as window state. A scene that turned the field on reopening would also fight a second window on the same view.
- **One act called "send".** Rejected. The person would learn only after release whether the note left their desk. FEAT-0023's findings ask to "define move versus additional-window reference explicitly so handoff cannot create accidental duplicate objects in a desk".
- **Renderer-to-renderer acknowledgement.** Rejected. The main process already owns the windows, the displays and the store. It is the only party that sees a window close or a display disconnect, so it is the only party that can undo a landing.
- **Acknowledge on the store's answer.** Rejected. That is today's behaviour, and it reports success for a window that has drawn nothing.

## Consequences

- The `Desk` type gains optional fields. The state file's reader must return a scene of an unknown version exactly as it found it, so that a newer Deck's scene survives being loaded and saved by an older one.
- The search text and the filters are shared by every window on a workspace. Opening a scene therefore narrows every window's collection, and "Undo: back to the desk before" puts them back for every window. This follows from the existing store and is stated so nobody is surprised by it.
- Switching view clears the filters and the name of the open desk today (`select-view`). Opening a scene therefore switches view first and applies the scene's filters and name afterwards.
- A handoff adds one message from the main process to a destination window and one answer back, both through the preload bridge. Deck's HTTP host gains no route and still answers 405 to every method that is not a read (ADR-0001, ADR-0003).
- Out of scope, and not decided here: camera persistence, several independent collections on one desk, a scene that spans several views or several windows, arranging or writing from the tablet, headset input, and FEAT-0021's evidence and levels.

## What the build changed or measured against this decision, 2026-10-02

FEAT-0023 was built against this proposal on 2026-10-02 (commits `b1bfa1d` to `9379a0c`). Where nothing is listed, the build does what the decision says. The evidence is in [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0075-A-Move-Is-Never-Half-Done]] and [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]. This section changes no decision. Each difference is Edwin's to accept or to send back.

**Differences from part A.**

- **A4: opening is its own press.** Choosing a scene's name in the list changes nothing; an "open" button beside the list opens it. The reason is in commit `b1bfa1d`: on some systems the arrow keys change a list's value at every step, and opening on that replaced the desk with each scene passed on the way.
- **A5: a missing note's document.** It says there is no note at that path any more and offers "retry" and "close". When this window had read the note earlier in the session it still shows that text, labelled as last read. The words "no longer in this workspace" are in the scene's message.
- **A6: opening a scene clears "Undo arrangement".** The desk that arrangement would put back was replaced as a whole (`forgetArrangement` in `desktop/src/renderer/glass.ts`). The two controls are separate and differently named, as decided.
- **A7: saving over the open scene does not ask.** "save scene" asks "replace it", "keep it" or "cancel" only when the name belongs to a scene that is not the open one. Typing the open scene's own name saves over it. No commit says why.
- **A7: an unreadable scene's version is not in the list's text.** The list reads "<name> (cannot be opened)" and the entry cannot be chosen. The version is in the entry's tooltip. No walk produced such an entry in a window; the store's rule is in TST-0074.
- **A7: restore fills only the gap.** A deleted scene is not restored over a scene saved under its name since.

**Differences from part B.**

- **B1: the acts are `move` and `show` in the code.** On screen they read "Move to the …" and "Also show in the …".
- **B2: the sentence about leaving the desk is a tooltip.** A strip entry's label names the act, what the window carries and its display: "Move to the desk on the main display". "It leaves this desk once that window shows it" is the entry's tooltip. The keyboard chooser's rows carry the label and not that sentence.
- **B3: the wait is four seconds for a desk and twelve for a reader.** `HANDOFF_ACK_MS` is 4000. A reader window has to load a page before it can answer, so it gets 8000 more (`READER_BOOT_MS` in `desktop/src/main/main.ts`).
- **B3: a fourth way to be undone.** A destination that has not drawn the note 3.5 seconds after being told answers that it could not show it, and the landing is undone at once with that reason.
- **B3: what counts as drawn.** In Glass, a document whose text is in or whose failure is labelled. In a reader window, the note's text. In a desk window, a card on screen.
- **B4: size and reading position are not seen in a desk window.** A desk window is always drawn as cards. The size is carried into that desk's stored entry and the reading anchor into the arrival message, and both show when the note next stands as a document.
- **B5: the arrival mark lasts 2.4 seconds and is drawn in Glass only.** A desk window and a reader show the message and no mark. The message is the window's status line, so the next thing said there replaces it.
- **B5: "send back" from a reader is a show.** A reader holds no desk, so the note is raised in the window that kept it.

**One decision the build added.** A desk window draws every note on its desk that the workspace has, marked "not in this view" when its view does not list it (commit `9379a0c`). Without that, "Move to" a desk window on another view could never be acknowledged. It changes [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], decision 7, and FEAT-0023 records how it was found.

**Measured, in a Linux container that draws in software, at commit `4243fc2`.** From release to the answer: 159 ms to a desk window and 904 ms to a reader window, against waits of 4000 ms and 12000 ms. A desk window that was kept busy was given up on; the walk timed 4.2 s from opening the chooser to the main window saying so. Each is one reading. Nothing was measured on the Mac.

**Not tried.** A second display, a display unplugged during a handoff, a new reader opened on an empty display, and a real tablet. The rule for a removed display is tested without a window, and the listener is in the main process, and no display has been removed under it.

## Acceptance

Three threads are open. Each is Edwin's to settle, and the decision can be accepted with one still open.

- [ ] **A note whose file moved.** Decision A5 was first written to name "notes whose file moved" in the message. A scene keeps each document's note id and no path (A2), and DES-0003 says a path is not identity. A note that moved and kept its id reopens as the same document with nothing to report. A note whose id is gone reads as no longer existing. Reporting a move would need the scene to keep each note's path. Decide: keep the path so a move can be named, or leave the message as it is. Until decided, the scene keeps no path and reports no move.
- [ ] **A saved desk that remembers its view.** FEAT-0015 asks "Should a saved desk remember the view it was saved on?" and says "until Edwin answers, a saved desk opens on whichever view is current". This decision answers yes for version 2 scenes and leaves desks with no version as they are. Confirm, or say that a scene should open on the current view too.
- [ ] **The heading words in a reading anchor.** A3 says a scene holds no note's text, and A2 keeps the words of one heading per open document so the passage can be found again. Confirm that a heading kept as a locator is acceptable, or ask for the fraction alone.
