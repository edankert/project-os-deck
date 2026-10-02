---
type: "[[task]]"
id: TASK-0109
title: "Show the destination, the arrival and the way back"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
parent: "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"
effort: M
due: ""
depends: ["[[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]]"]
blocks: ["[[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]]"]
related: ["[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[FEAT-0014-The-Hands]]"]
tests: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]"]
---

# Show the destination, the arrival and the way back

The window's half of the handoff. A person sees where a note is going and which act it is before they let go, sees it arrive in the other window, and can send it back. TASK-0108 supplies the states; this task draws them. It was built in commit `f80339f`, and the arrival in a desk window was changed in `5f706a5` and `9379a0c`.

**Where it stands, 2026-10-02.** The task stays `doing`. Nine boxes are open, each with what is missing under it. One of them is a defect the walk's record shows: "send back" is offered for a window that has closed. The evidence is the scripted walk `glass-handoff`, run in a Linux container with one display at commit `4243fc2` with 24 checks, all of which held, and the smoke run at the same commit ([[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]). A quoted check below is one of that walk's unless the smoke run is named.

## Definition of Done

- [x] While a document is dragged toward an edge, the target strip names each destination by what the window carries, its display and the act. A desk on another view has two entries, "Move to the desk on …" and "Also show in the desk on …". A reader window has "Also show in the reader on …" only. Shown by "dragged to the edge, the strip names each place with its act, and each says what releasing there does" and by "released on "Move to", it moves, and the main window says so when the desk window has answered". The tablet's entry is shown in the chooser, by "with a served page following, the tablet is offered "Also show in" only".
- [ ] The strip's entry for an empty display reads "Also show in …" only.
  Not run: the container has one display. Its label would read "Also show in the a new reader on …", because the place is named "a new reader on …" and every entry puts "the" before the name.
- [ ] A "Move to" entry says, before release, that the note will leave this desk.
  Built as a tooltip, and not shown to be seen. The entry's `title` reads "Move FEAT-0002 to the desk on the main display: it leaves this desk once that window shows it", which the strip check reads. The entry's visible text is "Move to the desk on the main display" (`07-the-strip-names-the-act.png`). Nothing shows that a tooltip appears while a document is being dragged. The keyboard chooser's rows carry the label and not the sentence.
- [x] `S` on a document opens a chooser with the same entries and the same words as the strip. The keyboard is on the first answer and Enter chooses it. Shown by "S on the document asks where, and names the act with each place: a desk is offered "Move to" and "Also show in"; a reader, which is not a desk, only "Also show in"", and by the smoke run's checks "send to names the note and asks where, each answer naming its act, and the keyboard is on the first answer" and "and Enter sends ISS-0071 to the Also show in the Deck on the main display".
- [ ] In the chooser the arrow keys move between answers, and Escape closes it and changes nothing.
  No check presses either there. The walk chooses an answer with the pointer and closes the chooser with its "cancel" answer.
- [x] Between release and the answer the source document stays on its desk. Shown by "it was on both desks before it left this one, and never on neither: the source let go after the destination had it" and by the smoke run's check "a note held on the Features desk and moved to that panel is on the Issues desk and drawn there, and it left the Features desk only after the panel had drawn it".
- [ ] Between release and the answer the source document is marked as being sent, and the person can still read and scroll it.
  Not built as a mark on the document. After a release on the strip the window says "<the entry's name>: waiting for that window to show <the note>" (`desktop/src/renderer/glass.ts`). After a choice in the chooser it says nothing until the answer comes. No check reads the waiting line, and none scrolls the document during the wait. In the container the answer came 159 ms after release.
- [x] After an acknowledged move the source document is gone and the source says, by name, which window has the note. After an acknowledged "Also show in" the source document is unchanged. Shown by "Move: FEAT-0002 is on the Issues desk and off this one, and the main window says the other window is showing it" and "Also show: the reader window now shows FEAT-0002, and this desk still holds it".
- [x] After a handoff that failed, the source desk holds the note at the place and size it had, and the status line says why in a sentence: the window did not answer, or the window closed. The box first said the message stays until dismissed; it is the window's status line and stays until the next thing is said there. The reading position is not compared, because the document was never taken down. Shown by "a desk window that does not answer: after 4.2 s the main window says the note stays here, and both desks are exactly as they were" and "a desk window closed before it answered: the note stays here, and both desks are as they were".
- [ ] After a display is disconnected during a handoff the source says so.
  Not run: no display was removed in any run. The sentence is tested without a window in [[TST-0075-A-Move-Is-Never-Half-Done]].
- [x] The destination draws the note at the size it had at the source and, where it draws documents, scrolls it to the carried reading anchor once its text is in. It answers once. A desk window draws its notes as cards, so there the size is in the desk's stored entry and nothing is scrolled. Shown by "it arrived at the size it was read at", "back in the main window it is the size it was and is read where it was being read, and the main window says it arrived" and "the reader opens it where it was being read, says the other window keeps it too, and scrolls inside itself so that message stays on screen". That it answers once is read in `receiveArrival` in `desktop/src/renderer/renderer.ts`, which keeps the ids it has answered.
- [x] The destination shows a message naming the window the note came from, and in Glass the arrived document is outlined. Shown by "the desk window, which lists Issues and draws its desk as cards, draws the feature as a card marked "not in this view", says where it came from, and offers "send back"", by the main window's and the reader's messages in the checks quoted above, and by "with reduced motion the returned document does not travel; it is marked as arrived and the message is the same".
- [ ] The arrival mark and the message remain until the person dismisses the message or acts on the document.
  Not built. The outline is taken off after 2.4 seconds (`markArrived` in `glass.ts`). The message is the status line, and the next thing said there replaces it. A desk window and a reader window draw no arrival mark.
- [x] The message offers "send back". It returns the note by the same acknowledged handoff: a moved note moves back, and for a note that was also shown the source's document is found and raised. Shown by ""send back" on the desk window moves it back: it is on this desk and off that one" and ""send back" from the reader brings the note to the front in the main window, which held it all along: one document for it, not two".
- [ ] When the source window no longer exists, "send back" is not offered and the message says the window is closed.
  Contradicted by the walk's record, and not fixed. After the desk window the note had come back from was destroyed, the chooser's first answer was still "Send back to the desk on the main display". The cause, by reading the code, is in [[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]], Notes. Separately, a "send back" button already on the status line stays there after the source window closes, and pressing it is refused with a sentence saying that window has closed; that is read in `main.ts` and not run.
- [ ] "Send back" is reachable from the keyboard on the arrived document.
  Built and not walked by keyboard. `S` on a document that arrived lists "Send back to …" as its first answer, which the walk's record of the chooser shows, and an arrival in Glass puts the keyboard on the document's header. Every "send back" in the walk is a pointer press on the status line's button.
- [x] Under `prefers-reduced-motion: reduce` the arriving document does not travel, and the arrival mark and the message are the same. Shown by the reduced-motion check quoted above, which finds the document marked with no animation running. At the sending end no document travels with or without reduced motion: only a card thrown from the field is flown, which is read in `glass.ts`. Reduced motion was not emulated in a desk window or a reader.
- [x] A send to the tablet is listed as "Also show in the tablet" and, after release, the source says the note is on the desk the tablet follows and that a tablet cannot confirm it arrived. Shown by "with a served page following, the tablet is offered "Also show in" only" and "sent to the tablet: said plainly as unconfirmed, and this desk keeps the note".
- [x] The served page has no bridge, is never told of an arrival, offers no "send back" and no arrangement controls. Shown by "the served page has no bridge: it is never told of an arrival, offers no "send back", and the host still answers 405 to a write".
- [ ] On the served page `S` gives the sentence that a tablet follows the Mac and sends nothing back, and a drag to the edge shows no strip.
  Not pressed by any check. Both are read in the code: `sendTo` in `renderer.ts` and the drag handlers in `glass.ts`, which ask `host.canArrange()` first.
- [x] No handoff changes `git status` in the workspace. Shown by the handoff walk's record, `workspaceUnchanged: true`, which compares `git status` in the workspace before and after the walk, and by the smoke run's check "git status in the workspace is unchanged after every Glass check".

## Steps

- [x] Read REQ-0005, ADR-0007 part B and DES-0003's input contract, including Escape and reduced motion.
- [x] Extend the target strip in `desktop/src/renderer/glass.ts` and `sendTo` and `throwTo` in `desktop/src/renderer/renderer.ts` to carry the act, the size and the reading anchor.
- [x] Draw the outcome messages, the arrival mark and message, and "send back". The pending state is one line said after a release on the strip, and no mark; see the open box above.
- [x] Answer the arrival message from the destination window when the document is drawn.
- [x] Add the handoff steps to a walk, with a second window opened by the walk. They are in `desktop/demos/glass-handoff.cjs`, a walk of its own, and not in `glass-scenes.cjs` as first planned.

## Acceptance checks reopened

- [[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]]: for a document, the target strip's entries change from one per destination to one per destination and act, and the message after a send changes. A card thrown from the field keeps one entry per destination.

That check has no invalidation event in the working ledger for this task. This close-out writes nothing to the ledger.

## Notes

**How the act is chosen during a drag.** A document goes only where it is released on a named entry of the strip. A fast release past the edge does not send a document anywhere: the speed of a throw is read for a card from the field only, and such a card carries no act and is shown, not moved. This is read in the two drag handlers in `glass.ts`.

**"Send back" after "Also show in".** The source already has the document, so there is nothing to move, and the build finds and raises it. That reading is flagged to Edwin with the other readings in ADR-0007.

**Two windows with the same name.** An entry names a window by what it carries and its display, so two desk windows on one display both read "the desk on …", whichever view each draws. By reading `sendTo`, the keyboard chooser keeps one answer per name, so the second such window cannot be chosen there. No run had two desk windows open at once.
