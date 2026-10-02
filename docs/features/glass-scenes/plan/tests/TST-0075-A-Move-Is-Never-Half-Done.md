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

REQ-0005 says a move's source document is removed only after the destination has drawn the note, and that a handoff which fails leaves the source usable and no desk holding the note twice. Those are rules about states and their order, so they are checked in a pure module, `desktop/src/shared/handoff.ts`, with the events fed in by the test: an acknowledgement, the wait running out, the destination closing, its display being removed. No window and no timer is involved.

**This note must be committed together with its suite.** `command:` names `handoff`, and [[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]] writes `desktop/tests/handoff.test.mjs`. Until that file exists, `bash tools/scripts/run-desktop-tests.sh handoff` exits 2 ("no suite called 'handoff'") and `python3 tools/scripts/run-tests.py` reports this test failing, which is the failure [[ISS-0028-A-Test-Note-Names-A-Suite-That-Does-Not-Exist]] recorded. Written at planning time on 2026-10-02 and not committed then.

The status is `active` and not `ready`. A test with a `command:` records no verdict on its note; the run is the verdict (`tools/instructions/STATUSES.md`, `[[test]]`).

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh handoff`.

## Expected results

- A request with no act is refused. Nothing defaults to a move.
- A desk panel and the focus window are offered Move to and Also show in. A reader window, a new reader on an empty display and the tablet are offered Also show in only. A destination on the same view's desk as the source is not offered a move, and neither is a note kept on every view. A Needs-you strip is offered neither.
- Landing puts the note on the destination desk at the carried size, and the record carries the reading anchor to the destination.
- For a move, the source desk still holds the note in every state except acknowledged. The step that marks the handoff acknowledged is the step that takes the note off the source desk.
- For Also show in, the source desk holds the note in every state, acknowledged included.
- With no answer when the wait runs out, with the destination closed, and with its display removed, the handoff ends undone with that reason, the note is off the destination desk, and the source desk is as it was.
- When the destination desk already held the note, landing raises it and an undo leaves it there.
- An undone handoff to a reader window names the address the reader showed before, so it can be put back. An undone handoff to a new reader says the window is to be closed.
- A drawn answer and a failed-with-a-label answer both acknowledge. A second answer, and an answer after the handoff was undone, change nothing.
- A send to the tablet is Also show in on the desk it follows, is not waited on, and is answered as landed and unconfirmed.
- After any sequence of handoffs, failures and returns the test runs, no desk holds a note id twice.
- "Send back" is offered while the record's source window exists and not after it closed. After a move it is a move in reverse; after Also show in it names the source's document to raise.
- The state the store writes to disk after a handoff holds no field about it.

## Evidence (fill after running)

- None. The suite is not written on 2026-10-02.

## Adequacy (who verifies this test?)

- To be recorded by TASK-0108: each rule above broken once in the module, with the test that failed. The one that matters most is moving the source's removal out of the acknowledging step, which must fail the fourth result above.
