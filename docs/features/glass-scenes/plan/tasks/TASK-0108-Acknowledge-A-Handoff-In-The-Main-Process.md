---
type: "[[task]]"
id: TASK-0108
title: "Acknowledge a handoff in the main process"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
parent: "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"
effort: L
due: ""
depends: []
blocks: ["[[TASK-0109-Show-The-Destination-The-Arrival-And-The-Way-Back]]"]
related: ["[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[FEAT-0014-The-Hands]]", "[[TASK-0055-Throw-To-A-Screen]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
tests: ["[[TST-0075-A-Move-Is-Never-Half-Done]]"]
---

# Acknowledge a handoff in the main process

The main process lands a handed note, tells the destination window, and answers the source only when that window says it is showing the note. A move takes the note off the source desk at that moment and not before. A landing that is not acknowledged is undone (ADR-0007, part B). Before this task the main process answered `ok` before the destination had drawn anything. The rule is in `desktop/src/shared/handoff.ts` (commit `9b7a062`) and the main process carries it out in `desktop/src/main/main.ts` (commit `f80339f`).

**Where it stands, 2026-10-02.** The task stays `doing`. One box under the Definition of Done is open: no display has been removed during a handoff. One step is not done: no rule was broken on purpose to see a test fail. One defect is recorded under Notes and is not fixed. The evidence is the sixteen tests of `desktop/tests/handoff.test.mjs`, the scripted walk `glass-handoff` (24 checks, all held, in a Linux container at commit `4243fc2`) and the smoke run at the same commit ([[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]). A quoted test below is one of that suite's, and a quoted check is one of that walk's unless the smoke run is named.

## Definition of Done

- [x] A pure module, `desktop/src/shared/handoff.ts`, holds a handoff's record and its states. The box first named them landing, acknowledged and undone; the module calls them `awaiting`, `done` and `failed`, with `unconfirmed` for the tablet. The reasons a handoff fails are: no answer in time, the destination closed, its display removed, and the destination saying it could not show the note. Every step is a function of the record and an answer (`settle`, `settleUnconfirmed`), with no window and no timer inside it. Shown by reading the module, and by every test of the suite feeding it answers with no window.
- [x] A request names the act, `move` or `show`, as well as the note, the workspace, the view and the target. The box first called the second act `also-show`. A request with no act is refused with a sentence, and nothing defaults to a move. The refusal is read in the `deck:window:throw` handler in `main.ts`; no test sends such a request. A card thrown from the field carries no act and is sent as a show, shown by "a card thrown from the field is on no desk, so its targets carry no act and are named as they were".
- [x] The module says which acts a destination may be offered. A desk panel and the main window are offered both. A reader window, a new reader on an empty display and the tablet are offered `show` only. A destination that draws the same view's desk as the source is not offered a move, and neither is a note kept on every view. Shown by the tests "only something that is a desk can have a note moved onto it" and "a destination on the same desk, and a note kept on every view, are offered "also show" only", and in a window by "a desk window that draws this same view's desk is offered "Also show in" only: a move would take the note off the desk it is on" and "a note kept on every view is offered "Also show in" only: it is on every desk already". A Needs-you strip is refused by the handler in `main.ts` with the sentence it gave before, and not by the module; that is read in the code.
- [x] The request carries the document's size and its reading anchor, and the landing puts the note on the destination at that size. The anchor reaches the destination window with the arrival message. Shown by the test "on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it", which also checks the size after a move, and by "it arrived at the size it was read at", "back in the main window it is the size it was and is read where it was being read, and the main window says it arrived" and "the reader opens it where it was being read, says the other window keeps it too, and scrolls inside itself so that message stays on screen".
- [x] For a move, the source's document is taken off its desk in the same step that marks the handoff `done`, and in no other step. On every path that does not end `done` the source desk still holds the note. Shown by the tests "a move takes the note off the source desk only when the destination says it is showing it" and "on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it", by "it was on both desks before it left this one, and never on neither: the source let go after the destination had it", and by the smoke run's check "a note held on the Features desk and moved to that panel is on the Issues desk and drawn there, and it left the Features desk only after the panel had drawn it".
- [x] A failed handoff removes exactly what its landing added. When the destination desk already held the note, the landing raises that document and the failure leaves it there. When a reader window was re-addressed, the failure re-addresses it to what it showed before. When a new reader window was opened, the failure closes it. Shown by the tests "no answer, a refusal or a closed window undoes the landing and leaves the source untouched" and "an undone handoff gives a reader back what it showed, closes a reader it opened, and leaves a closed window alone", and for a desk window by "a desk window that does not answer: after 4.2 s the main window says the note stays here, and both desks are exactly as they were". No walk fails a handoff to a reader, so the re-addressing and the closing are shown as the rule's output and read in `finishHandoff`.
- [x] After any sequence of handoffs and failures in the unit test, no desk holds a note id twice. Shown by the test "after any sequence of handoffs and failures no desk holds a note twice, and no note is lost": forty runs of twelve handoffs.
- [x] The wait is a named constant. `HANDOFF_ACK_MS` is 4000. A reader window, which has to load a page before it can answer, gets 8000 more (`READER_BOOT_MS` in `main.ts`). The main process starts the wait at landing and ends the handoff as failed when it runs out. A late answer for a handoff already ended is ignored. Shown by the test "a second answer changes nothing: the first one stands" and by the check of a desk window that does not answer, quoted above, which waited 4.2 seconds.
- [x] The main process ends a handoff as failed when the destination window emits `closed`. Shown by "a desk window closed before it answered: the note stays here, and both desks are as they were".
- [ ] The main process ends a handoff as failed when Electron's `screen` reports the destination's display removed.
  Not run. The listener is in `main.ts` (`screen.on('display-removed', …)`), and the rule's answer to that event is tested without a window. No display has been removed in any run: the container has one.
- [x] The destination window is told of an arrival through the preload bridge, with the handoff's id, the note, the size, the anchor and where it came from, and answers once. It answers that it is showing the note when the document is drawn, with its text in or with its failure labelled, and that acknowledges the handoff. It answers that it could not show the note when it has not drawn it after 3.5 seconds, and that ends the handoff as failed. The box first said both answers count as acknowledged. The served page has no bridge and never receives or sends either. Shown by `desktop/src/preload.ts` and `receiveArrival` in `desktop/src/renderer/renderer.ts`, by the move checks quoted above, by the test of a refusal, and by "the served page has no bridge: it is never told of an arrival, offers no "send back", and the host still answers 405 to a write".
- [x] A send to the tablet is a show on the desk it follows, is never waited on, and is answered to the source as landed and unconfirmed. Shown by the test "the tablet is done at once, and said to be unconfirmed" and by "with a served page following, the tablet is offered "Also show in" only" and "sent to the tablet: said plainly as unconfirmed, and this desk keeps the note".
- [x] The main process keeps, for the session, where each arrived note came from. Nothing about a handoff is written to the state file. Shown by the last assertion of the forty-run test, which finds no handoff field in what the store would save, and by "the store holds nothing about a handoff: it is the session's, and is gone when Deck closes". What the main process keeps does not always match the windows that exist; see Notes.
- [x] Deck's HTTP host gains no route. No commit of this feature touches `desktop/src/main/host.ts`, `desktop/tests/host.test.mjs` or `desktop/tests/write-channel.test.mjs`; FEAT-0024 added to `host.test.mjs` in `1a71001`. The smoke run's checks "the records path refuses a POST with 405" and "the host refuses a POST with 405" hold at `4243fc2`.
- [x] The existing throw checks are reconciled and not left failing. `desktop/tests/reach-and-throw.test.mjs` is unchanged and passes in the full run. The smoke run's two checks that asserted the old throw were rewritten in `0df09fe` and again in `9379a0c`, and one check was added for a move onto a desk panel. They are the steps of [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] that throw to a reader, a desk panel and the tablet. The throw to an empty display did not run: the container has one display. Shown by the smoke run at `4243fc2`: the `throw` part's eleven checks and the two desk-panel checks of the `desks` part hold.
- [x] `npm test` in `desktop/` passes with the `handoff` suite in it. Shown by the full run on 2026-10-02 at `9379a0c`, 586 of 586, reported by the session that built the feature.

## Steps

- [x] Read REQ-0005, ADR-0007 part B and its section on what the decisions imply, and TASK-0055 for what a throw did before.
- [x] Write `desktop/src/shared/handoff.ts` and `desktop/tests/handoff.test.mjs`.
- [x] Change `deck:window:throw` to open a handoff record, land, start the wait and answer the source when the record ends. Add the arrival message and the acknowledgement to `desktop/src/preload.ts`.
- [x] Listen for the destination window closing and for a display being removed.
- [x] Reconcile the existing throw checks.
- [x] Commit the suite and [[TST-0075-A-Move-Is-Never-Half-Done]] together (ISS-0028). Both went in with `9b7a062`.
- [ ] Break each rule once, confirm a test fails, and record it in TST-0075's `adequacy:`.
  Not done. No commit and no note records a rule broken on purpose.

## Acceptance checks reopened

- [[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]]: a document now goes to another window as a named act, the source keeps its document until the destination answers, and a throw to the main window lands on its desk where it used to focus the note.

That check has no invalidation event in the working ledger for this task. This close-out writes nothing to the ledger.

## Notes

**A defect that is not fixed: "send back" is offered for a window that has closed.** The handoff walk's record at `4243fc2` shows it, and no check asserts against it. The chooser listed "Send back to the desk on the main display" after the desk window the note had come back from was destroyed. By reading the code: the main process keeps one record per window and note of where a note came from. The note had since been raised from the reader window, which replaced that record with one whose source is the reader, and the reader was still open. So the main process still counted the note as returnable, and the main window still held its older arrival from the desk window. Pressing the entry would be refused, with a sentence about a card from the field that does not describe what happened. No desk would change. The open box for this is in [[TASK-0109-Show-The-Destination-The-Arrival-And-The-Way-Back]].

Three readings in this task follow from ADR-0007 and are not in its numbered decisions. They are written in that note under "What these two decisions imply" so Edwin can dispute them: the main window counts as a desk, a destination on the same view's desk is not offered a move, and a failure removes only what the landing added.

A note kept on every view is already on every view's desk in the workspace, the destination's included, and `take-off-desk` would take it off all of them. Such a note is therefore offered `show` only, by the same rule as a destination on the same desk.

The wait was chosen as four seconds. [[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]] records the measured answer times beside it.
