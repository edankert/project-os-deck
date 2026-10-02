---
type: "[[test]]"
id: TST-0075
aliases: ["TST-0075"]
title: "A move is never half done: the source keeps its document until the destination has drawn the note, an unanswered or interrupted handoff is undone, and no desk ever holds a note twice"
status: active
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/handoff.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh handoff"
covers: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]"]
issues: []
tasks: ["[[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
---

# A move is never half done

## Purpose

REQ-0005 says a move's source document is removed only after the destination has drawn the note, and that a handoff which fails leaves the source usable and no desk holding the note twice. Those are rules about states and their order, so they are checked in a pure module, `desktop/src/shared/handoff.ts`, with the answers fed in by the test: the destination says it is showing the note, says it could not, does not answer, closes, or loses its display. No window and no timer is involved.

The suite is `desktop/tests/handoff.test.mjs`. It was committed with twelve tests in `9b7a062` on 2026-10-02 and has sixteen since `f80339f`.

The status is `active` and not `ready`. A test with a `command:` records no verdict on its note; the run is the verdict (`tools/instructions/STATUSES.md`, `[[test]]`).

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh handoff`.

## Expected results

These are what the sixteen tests assert, reconciled with the suite on 2026-10-02. The module names the two acts `move` and `show`, and a handoff's states `awaiting`, `done`, `unconfirmed` and `failed`.

- A desk panel and the main window take both acts. A reader window, a new reader on an empty display and the tablet take `show` only. The tablet cannot acknowledge. The wait is between two and ten seconds.
- What is said before release names the act, the note, the place and what happens at the source: "Move FEAT-0002 to the desk on Display 2: it leaves this desk once that window shows it", and "Also show FEAT-0002 in the reader on Display 2: this desk keeps it". The sentence for the tablet says a tablet cannot confirm it arrived.
- Landing on a desk puts the note there once. A note already on that desk is not put there again. A reader is re-addressed, a new reader is opened, and the tablet's landing is not waited on.
- A move to something that is not a desk is refused with a sentence and is not turned into a show.
- A move onto the desk the note is already on is refused, because source and destination are one desk. A show there puts nothing twice.
- For a move, the step that marks the handoff `done` is the step that yields "take the note off the source desk", and no other step yields it. For a show, no step touches the source.
- With no answer, with the window closed, and with an answer that the note could not be shown, the handoff ends `failed`, the note the landing put on the destination's desk is taken off again, and the sentence begins "FEAT-0002 stays here" and ends "Nothing was moved."
- When the destination desk already held the note, a failed handoff takes nothing off it.
- A second answer, and an answer after the handoff failed, change nothing.
- A card thrown from the field is on no desk, so a move takes nothing off.
- A send to the tablet ends `unconfirmed` at once, with a sentence saying a tablet cannot confirm it arrived and this desk keeps the note.
- The way back is the same handoff in reverse. It carries the size and the reading anchor the document has at the destination when they are known, and the ones it left with when they are not. From a desk it is a move. From a reader it is a show. There is no way back from the tablet, for a card that came from the field, or for a handoff that failed.
- A destination drawing the same view's desk as the source, and a note kept on every view, are offered `show` only.
- A failed handoff to a reader names the address the reader showed before. A failed handoff to a new reader says the window is to be closed. A window that has itself closed is left alone. A display removed ends the handoff `failed` with a sentence saying the display was disconnected.
- With the store driven by the rule as the main process drives it: on every path that does not end `done`, the source desk still holds the note and the destination desk does not. After a move that ends `done`, the note is on the destination desk at the size it had and off the source desk.
- After forty runs of twelve handoffs each, chosen by a fixed seed among two notes, both acts, six destinations and four answers, no desk holds a note twice and no note is on no desk. What the store would write to disk holds no field named for a handoff.

## What the suite does not assert

- **A request with no act is refused.** That refusal is in the main process's handler, `deck:window:throw` in `desktop/src/main/main.ts`, and not in the module. No test sends such a request.
- **A Needs-you strip is offered neither act.** The same handler refuses it with the sentence it gave before this feature. The module has no such destination.
- **"Send back" is withheld once the source window has closed.** The module's `returnOf` does not know which windows exist. The main process checks, and no test covers it. The handoff walk's record shows a "send back" still offered after its window closed; see [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]], "What the record shows that no check asserts".
- **The sentence for a new reader on an empty display reads badly.** The test asserts the words "the display the a new reader on Display 3 is on was disconnected". The label of such a destination begins "a new reader on", and every sentence puts "the" in front of the label. The same happens to "Also show in the a new reader on …" in the strip. A machine with one display never shows it.

## Evidence

- **2026-10-02, commit `9379a0c`.** `npm test` in `desktop/` ran every suite, this one among them: 586 of 586 passed. The session that built the feature ran it and reported the count. `9379a0c` is the last commit that changed application code.
- **2026-10-02, commit `f80339f`,** the commit that brought the suite to sixteen tests: 566 of 566, by that commit's message.
- This close-out did not run the suite again. It read the sixteen tests against the lists above.

## Adequacy (who verifies this test?)

- Not recorded. No rule was broken on purpose to see a test fail, so `adequacy:` is empty. The one that matters most is moving the source's removal out of the acknowledging step, which must fail "a move takes the note off the source desk only when the destination says it is showing it". [[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]] keeps that step open.
