---
type: "[[task]]"
id: TASK-0108
title: "Acknowledge a handoff in the main process"
status: backlog
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

Today the main process lands a thrown note and answers `ok` before the destination has drawn anything (`deck:window:throw` in `desktop/src/main/main.ts`). After this task it lands the note, waits for the destination window to say it has drawn the document, and only then lets a move's source go. A landing that is not acknowledged is undone (ADR-0007, part B).

## Definition of Done

- [ ] A pure module, `desktop/src/shared/handoff.ts`, holds a handoff's record and its states: landing, acknowledged, and undone with a reason. The reasons are: no answer in time, the destination closed, the display disconnected, and the destination refused. Every transition is a function of the record and an event, with no window and no timer inside it.
- [ ] A request names the act, `move` or `also-show`, as well as the note, the workspace, the view and the target. A request with no act is refused with a sentence; nothing defaults to a move.
- [ ] The module says which acts a destination may be offered. A desk panel and the focus window are offered both. A reader window, a new reader on an empty display and the tablet are offered `also-show` only. A destination that draws the same view's desk as the source is not offered `move`, and neither is a note kept on every view. A Needs-you strip is offered neither, with the sentence it gives today.
- [ ] The request carries the document's size and its reading anchor, and the landing puts the note on the destination at that size. The anchor reaches the destination window with the arrival message.
- [ ] For a move, the source's document is taken off its desk in the same step that marks the handoff acknowledged, and in no other step. The unit test walks every path through the states and asserts the source desk still holds the note on every path that does not end acknowledged.
- [ ] An undone handoff removes exactly what its landing added. When the destination desk already held the note, the landing raises that document and the undo leaves it there. When a reader window was re-addressed, the undo re-addresses it to what it showed before. When a new reader window was opened, the undo closes it.
- [ ] After any sequence of handoffs and failures in the unit test, no desk holds a note id twice.
- [ ] The wait is a named constant of a few seconds. The main process starts it at landing and ends the handoff as undone when it expires. A late acknowledgement for a handoff already undone is ignored and changes nothing.
- [ ] The main process ends a handoff as undone when the destination window emits `closed` and when Electron's `screen` reports the destination's display removed.
- [ ] The destination window receives one arrival message through the preload bridge, naming the handoff, the note, the size, the anchor and where it came from, and answers once with drawn or failed-with-a-label. Both count as acknowledged. The served page has no bridge and never receives or sends either.
- [ ] A send to the tablet is `also-show` on the desk it follows, is never waited on, and is answered to the source as landed and unconfirmed.
- [ ] The main process keeps, for the session, where each arrived note came from, so "send back" can name a source window that still exists. Nothing about a handoff is written to the state file: the test saves the state after a handoff and finds no handoff field in it.
- [ ] Deck's HTTP host gains no route. `desktop/tests/host.test.mjs` and `write-channel.test.mjs` pass unchanged, and the smoke run's checks that the host answers 405 to every method that is not a read still hold.
- [ ] The existing throw checks are reconciled and not left failing: `desktop/tests/reach-and-throw.test.mjs`, the smoke run's throw section and the steps of [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] that throw to a reader, a desk panel and an empty display.
- [ ] `bash tools/scripts/run-desktop-tests.sh handoff` and `npm test` in `desktop/` pass.

## Steps

- [ ] Read REQ-0005, ADR-0007 part B and its section on what the decisions imply, and TASK-0055 for what a throw does today.
- [ ] Write `desktop/src/shared/handoff.ts` and `desktop/tests/handoff.test.mjs`.
- [ ] Change `deck:window:throw` to open a handoff record, land, start the wait and answer the source when the record ends. Add the arrival message and the acknowledgement to `desktop/src/preload.ts`.
- [ ] Listen for the destination window closing and for a display being removed.
- [ ] Reconcile the existing throw checks.
- [ ] Commit the suite and [[TST-0075-A-Move-Is-Never-Half-Done]] together (ISS-0028).
- [ ] Break each rule once, confirm a test fails, and record it in TST-0075's `adequacy:`.

## Acceptance checks reopened

- [[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]]: a throw now asks which act, the source keeps its document until the destination answers, and a throw to the focus window lands on its desk where it used to focus the note.

## Notes

Nothing is built by this note. Three readings in this task follow from ADR-0007 and are not in its numbered decisions. They are written in that note under "What these two decisions imply" so Edwin can dispute them: the focus window counts as a desk, a destination on the same view's desk is not offered a move, and an undo removes only what the landing added.

A note kept on every view is already on every view's desk in the workspace, the destination's included, and `take-off-desk` would take it off all of them. Such a note is therefore offered `also-show` only, by the same rule as a destination on the same desk. The unit test covers it.

The number of seconds is not fixed here. Choose it when the acknowledgement times are known, and record it in TASK-0110 beside them.
