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

FEAT-0023 was built against this proposal on 2026-10-02 (commits `b1bfa1d` to `b085ad7`). Where nothing is listed, the build does what the decision says. The evidence is in [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0075-A-Move-Is-Never-Half-Done]] and [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]. This section changes no decision. Each difference is Edwin's to accept or to send back.

This section was first written at commit `4243fc2` and is brought up to commit `e86b2e4`. Four differences it listed then are gone, because commit `9d94fa0` built what the decision says: saving over the open scene asks first (A7), an unreadable scene's version is in the list's own text (A7), what a move does to this desk is written on the strip's entry (B2), and an arrival has a line of its own and a mark that stays (B5).

**Differences from part A.**

- **A4: opening is its own press.** Choosing a scene's name in the list changes nothing; an "open" button beside the list opens it. The reason is in commit `b1bfa1d`: on some systems the arrow keys change a list's value at every step, and opening on that replaced the desk with each scene passed on the way.
- **A4: a reading position waits five seconds for its text.** A document whose read fails, and is retried later than that, is put where this window last read the note and not where the scene kept it. In a session that has not read the note it opens at its top. The scripted walk shows a retry landing under the right heading, in a session where the two places are the same.
- **A5: a missing note's document.** It says there is no note at that path any more and offers "retry" and "close". When this window had read the note earlier in the session it still shows that text, labelled as last read. The words "no longer in this workspace" are in the scene's message.
- **A6: opening a scene clears "Undo arrangement".** The desk that arrangement would put back was replaced as a whole (`forgetArrangement` in `desktop/src/renderer/glass.ts`). The two controls are separate and differently named, as decided, and the walk sees both on screen at once after an arrangement is applied on a reopened scene.
- **A7: the offer of "restore" ends sooner.** It is in the message shown after a delete, and it ends when that message is dismissed or replaced, as well as when the window closes or another scene is deleted.
- **A7: restore fills only the gap.** A deleted scene is not restored over a scene saved under its name since.

**Differences from part B.**

- **B1: the acts are `move` and `show` in the code.** On screen they read "Move to the …" and "Also show in the …".
- **B2: the chooser says what an act does for one answer at a time.** The strip writes "it leaves this desk" or "this desk keeps it" under every entry. The keyboard chooser says it for the answer the keyboard or the pointer is on, in the room left beside the answers. In a window 1100 pixels wide that room cuts the sentence off before the words about leaving this desk.
- **B3: the wait is four seconds for a desk and twelve for a reader.** `HANDOFF_ACK_MS` is 4000. A reader window has to load a page before it can answer, so it gets 8000 more (`READER_BOOT_MS` in `desktop/src/main/main.ts`).
- **B3: a fourth way to be undone.** A destination that has not drawn the note 3.5 seconds after being told answers that it could not show it, and the landing is undone at once with that reason.
- **B3: what counts as drawn.** In Glass, a document whose text is in or whose failure is labelled. In a reader window, the note's text. In a desk window, a card on screen.
- **B4: size and reading position are not seen in a desk window.** A desk window is always drawn as cards. The size is carried into that desk's stored entry and the reading anchor into the arrival message, and both show when the note next stands as a document.
- **B5: the arrival mark is drawn on a Glass document only.** A desk window, which draws cards, and a reader show the line that says the note arrived and mark nothing.
- **B5: "send back" from a reader is a show.** A reader holds no desk, so the note is raised in the window that kept it.
- **B5: a note shown here from a reader has no way back.** A reader is no desk to return a note to. The main process keeps where a note came from only when the note can go back there, and drops it when that window closes.

**One decision the build added.** A desk window draws every note on its desk that the workspace has, marked "not in this view" when its view does not list it (commit `9379a0c`). Without that, "Move to" a desk window on another view could never be acknowledged. It changes [[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], decision 7, and FEAT-0023 records how it was found.

**Measured, in a Linux container that draws in software, at commit `e86b2e4`, on this repository.** From release to the answer: 155 ms to a desk window and 809 ms to a reader window, against waits of 4000 ms and 12000 ms. A desk window that was kept busy was given up on; the walk timed 4.2 s from opening the chooser to the main window saying so. From pressing "open" to both of a scene's documents being read where they were: 128 ms. Each is one reading. The same on a copy of `your-trainer` is in TST-0076. Nothing was measured on the Mac.

**Not tried.** A second display, a new reader opened on an empty display, a display really unplugged during a handoff, and a real tablet. The rule for a removed display is tested without a window. The scripted walk sent the main process the event Electron sends when a display is removed, and the main window said the display was disconnected and kept the note. No display was unplugged.

## What the independent review changed in these rules, 2026-10-02

Two reviewers read FEAT-0023 at commit `5e66f48` on 2026-10-02 and asked for changes. The fixes changed or sharpened several rules of this decision. Each is stated below as the rule the build now keeps, with the commit and the numbered item it belongs to. The findings and their evidence are in [[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]] under Review. A second round, by one reviewer at `cbae0d3`, found all ten refuted claims fixed and approved the fixes. This section changes no status: the decision stays proposed, and each rule here is Edwin's to accept or to send back with the rest.

Three things in the section above are no longer true and are replaced here: A4's line on a retry later than five seconds, B2's line on the chooser cutting its sentence off, and the measurements, which were taken again and are at the foot of this section.

**Rules of part A as now built.**

- **A2 and A4: a scene restores the list's layout whatever it was, a list nobody had moved included.** A scene saved while the list had never been moved keeps no layout for it. Reopening that scene takes the stored layout away, so the list stands where a view puts it by default. Before, the list stayed wherever it had been dragged since (commits `bb99700`, `426e3ec`).
- **A4: a scene with no search or filters of its own clears them.** A scene restores its search and filters whatever they were. A desk from before scenes kept neither and leaves both as they are (commit `972ce73`).
- **A2: a reading position records which occurrence of its heading it is under,** counted from 1. In a note where the same words head two sections, a position under the second goes back to the second. A position saved without a count means the first. When the text now has fewer headings with those words than the position counts, the fraction is used and the passage is said to have moved (commit `52dcd6c`).
- **A4: a scene's reading position is kept for a late retry.** The scene reports after five seconds with what it has. A document that is still on the desk without its text keeps the scene's position, so a retry pressed later opens it where the scene had it (commit `972985f`).
- **A5: a reopened scene always gets its message.** A scene with no document to put back says in one line that it reopened. A note that arrives from another window during the reopen does not take the scene's report away. The message stands at the field's lower left and is the first thing in the field for the Tab key (commits `22678b9`, `972985f`).
- **A5: a document with no size of its own counts at the size it is drawn at** when the message says what fits a smaller field (commit `fd8b6a9`).
- **A6: "back to the desk before" puts back the desk and the list the scene replaced, on the view where it replaced them.** A scene opened from another view replaces its own view's desk and list. The undo puts those back there, restores the search and the filters, and shows the view the person was on. Before, the undo went back to the view on screen and what the scene had replaced on its own view was gone for good (commits `093c198`, `4f5d266`).
- **A7: a scene this Deck cannot read is never changed, by any control, and is said to be from a different Deck.** No save, no old-style "save desk" and no rename replaces or alters it, and it is written back with every field it had and nothing added. It can be chosen in the list. The one act offered for it is "delete", with "restore" after it. Every sentence about it says "saved by a different Deck (version N)", with the version written as it is stored, because an entry of version 1 is not newer. A7 said "newer than this Deck understands"; the rule built covers every version this Deck does not read (commit `ff25f28`).
- **A7: "save desk" on the cards surface asks before it replaces a scene this Deck can read.** Over a desk from before scenes it replaces as it always did (commit `ff25f28`).
- **A1 and A7: a scene's name is one its address accepts.** That is up to 64 characters and no control characters, the rule the `desk=` parameter already had. "save scene", "rename" and the store refuse any other name, so every saved scene has an address Deck can be sent to (commit `509c770`).
- **A8: the served page opens no scene from its address.** Sent an address that names a saved desk, it scrolls nothing, says nothing was reopened, and says that it shows the desk the Mac has (commits `2646cf5`, `4f5d266`).

**Rules of part B as now built.**

- **B2: in the keyboard chooser the sentence for an answer is drawn whole,** above the status line, and no answer moves when it appears (commit `972985f`).
- **B3: a note with a handoff waiting cannot be sent again.** Until the destination answers, any second send of that note is refused, whatever the act and the place, and the window says where the note is already going. Before, the same move sent twice could end with the note on no desk: the first landing timed out and took it off the destination, and the second was acknowledged and took it off the source. Another note is not held up (commit `5d5b38f`).
- **B3: a destination that answers after the source has stopped waiting shows nothing of an arrival.** The landing has been undone by then, so the window neither marks the document nor says it arrived (commit `972ce73`).
- **B5: a "send back" that fails keeps its way back.** Where a note came from is forgotten only when the window it went back to says it is showing it. A send back that is refused, not answered or undone can be pressed again (commit `39915fe`).
- **What the decisions imply, a note kept on every view: the rule itself refuses to move it.** Such a note was already offered "Also show in" only. The refusal of a move is now in the tested rule, which the main process hands the fact, and no longer in the main process alone (commit `5d5b38f`).

**Kept as built, though a reviewer raised it.**

- **A note kept on every view is not moved to the scene's place when a scene is reopened.** It belongs to every view and not to the scene. This is the rule under "What these two decisions imply", and it stands.
- **A second arrival replaces the first one's line.** B5 does not say how many arrival lines a window shows. It shows one, for the latest arrival. Each document that arrived keeps its own mark, and `S` on it still offers "Send back".

**Left open, for a decision.** The cards surface's list of saved desks opens a scene straight through the store: no "back to the desk before", no reading position, no message. A6 and A5 are met in Glass only. Whether the cards surface should open a scene the way Glass does is not decided here.

**Shown in a window, 2026-10-02, at commit `18f5405`.** Every suite, the smoke run and both scripted walks were run again on the code as fixed, in the Linux container that draws in software, and every run held. The walks have a check for six of the rules above, and each held on this repository and on a copy of `your-trainer`: the list and the other view's desk put back by the undo, an entry from a different Deck offered "delete" only and refused by "save desk", a scene with no note open saying it reopened, the served page opening no scene from an address, a late retry read where the scene kept it, and a "send back" that went unanswered and could be pressed again. The other rules are held by node tests alone, and one by nothing: a destination that answers too late. [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]] has what each check saw.

**Measured again in that pass, on this repository.** From release to the answer: 155 ms to a desk window, against a wait of 4000 ms. To a reader window, 1178 ms against 12000 ms; that reading now starts before three arrow-key presses the walk makes, so about 360 ms of it is the walk's own waiting. A desk window that was kept busy was given up on after 4.2 s, timed from opening the chooser. From pressing "open" to both of a scene's documents being read where they were: 132 ms. Each is one reading. Nothing was measured on the Mac.

## Acceptance

Three threads are open. Each is Edwin's to settle, and the decision can be accepted with one still open.

- [ ] **A note whose file moved.** Decision A5 was first written to name "notes whose file moved" in the message. A scene keeps each document's note id and no path (A2), and DES-0003 says a path is not identity. A note that moved and kept its id reopens as the same document with nothing to report. A note whose id is gone reads as no longer existing. Reporting a move would need the scene to keep each note's path. Decide: keep the path so a move can be named, or leave the message as it is. Until decided, the scene keeps no path and reports no move.
- [ ] **A saved desk that remembers its view.** FEAT-0015 asks "Should a saved desk remember the view it was saved on?" and says "until Edwin answers, a saved desk opens on whichever view is current". This decision answers yes for version 2 scenes and leaves desks with no version as they are. Confirm, or say that a scene should open on the current view too.
- [ ] **The heading words in a reading anchor.** A3 says a scene holds no note's text, and A2 keeps the words of one heading per open document so the passage can be found again. Confirm that a heading kept as a locator is acceptable, or ask for the fraction alone.
