---
type: "[[requirement]]"
id: REQ-0005
title: "A handoff between windows is acknowledged before the source lets go"
status: approved
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["Edwin 2026-10-02: 'Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff.'", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
priority: high
scope: "A note sent from a Glass desk to another Deck window, a display or the tablet"
acceptance: ["A handoff is offered as two differently named acts: Move to, after which the note is on the destination desk and not on the source desk, and Also show in, after which both show it; a reader window, a new reader on an empty display and the tablet are offered Also show in only.", "Before release, the target strip and the keyboard chooser name the destination window, its display and the act, and for a move say that the note will leave this desk.", "A move's source document is removed only after the destination window reports it has drawn the note's document, with its text in or with a labelled failure to read it.", "When no acknowledgement arrives within the stated time, the destination closes or its display disconnects, the landing is undone, the source document stays usable where it was, the source says what happened, and no desk holds the note twice.", "The destination opens the document at the size and reading position it had at the source.", "The destination marks the arrived document and names where it came from, and offers send back, which returns it by the same acknowledged handoff while the source window exists; under reduced motion nothing travels and the mark and message are the same.", "The keyboard offers the same two acts on a document and the same send back.", "The tablet cannot be a source and cannot acknowledge; a send to it is Also show on the desk it follows and is said to be unconfirmed; the served host still refuses every method that is not a read, and no handoff changes a file in the workspace or is saved."]
implements: "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"
verifies: ["[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]", "[[TST-0075-A-Move-Is-Never-Half-Done]]", "[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]"]
related: ["[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
tests: ["[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]", "[[TST-0075-A-Move-Is-Never-Half-Done]]", "[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]"]
---

# A handoff between windows is acknowledged before the source lets go

## Statement

A person sending a note from a Glass desk to another window must know before release where it is going and whether it will leave their desk. The source must keep its document until the destination has drawn the note. The document must arrive at the size and reading position it had. A handoff that fails must leave the source usable and no desk holding the note twice. The tablet stays a read-only companion.

The two acts, the acknowledgement and the rollback are decided in [[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]], part B, which is at `proposed`. The handoff extends the throw and the keyboard send that [[FEAT-0014-The-Hands]] built.

## Acceptance Criteria

- [ ] A handoff is offered as two differently named acts: Move to, after which the note is on the destination desk and not on the source desk, and Also show in, after which both show it; a reader window, a new reader on an empty display and the tablet are offered Also show in only. — evidence to be collected: [[TST-0075-A-Move-Is-Never-Half-Done]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
- [ ] Before release, the target strip and the keyboard chooser name the destination window, its display and the act, and for a move say that the note will leave this desk. — evidence to be collected: [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]], [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]
- [ ] A move's source document is removed only after the destination window reports it has drawn the note's document, with its text in or with a labelled failure to read it. — evidence to be collected: [[TST-0075-A-Move-Is-Never-Half-Done]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
- [ ] When no acknowledgement arrives within the stated time, the destination closes or its display disconnects, the landing is undone, the source document stays usable where it was, the source says what happened, and no desk holds the note twice. — evidence to be collected: [[TST-0075-A-Move-Is-Never-Half-Done]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]], [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]
- [ ] The destination opens the document at the size and reading position it had at the source. — evidence to be collected: [[TST-0075-A-Move-Is-Never-Half-Done]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
- [ ] The destination marks the arrived document and names where it came from, and offers send back, which returns it by the same acknowledged handoff while the source window exists; under reduced motion nothing travels and the mark and message are the same. — evidence to be collected: [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]], [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]
- [ ] The keyboard offers the same two acts on a document and the same send back. — evidence to be collected: [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
- [ ] The tablet cannot be a source and cannot acknowledge; a send to it is Also show on the desk it follows and is said to be unconfirmed; the served host still refuses every method that is not a read, and no handoff changes a file in the workspace or is saved. — evidence to be collected: [[TST-0075-A-Move-Is-Never-Half-Done]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]], [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]

## Evidence collected, 2026-10-02

No criterion is ticked. Ticking is a person's act at the feature's close-out, after [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]] has been walked, and it has not been walked. The table says what exists for each criterion and what is still owed. "The suite" is the sixteen tests of `desktop/tests/handoff.test.mjs` ([[TST-0075-A-Move-Is-Never-Half-Done]]), which passed in the full run of 586 tests at commit `9379a0c`. "The walk" is the scripted walk `glass-handoff`, 24 checks, all held, in a Linux container with one display at commit `4243fc2` ([[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]). "The smoke run" is the same container and commit. A scripted walk is not a person's walk.

| Criterion | What exists | Still owed |
| --- | --- | --- |
| 1. Two named acts; a reader, a new reader and the tablet are offered Also show in only | The suite covers which acts each kind of destination takes and is offered. The walk sees "Move to" and "Also show in" for a desk window, "Also show in" alone for a reader and for the tablet, a move ending with the note on the destination desk only, and a show ending with both holding it. The smoke run moves a note onto a desk panel and shows one there. | A new reader on an empty display: the container has one display. Its entry would read "Also show in the a new reader on …", which nobody has seen on a screen. |
| 2. Before release the strip and the chooser name the window, its display and the act, and a move says the note will leave | The walk reads the chooser's answers and the strip's entries before anything is released: "Move to the desk on the main display", "Also show in the reader on the main display". The smoke run finds the keyboard on the first answer. | The sentence that a move leaves this desk is the strip entry's tooltip. It is not in the entry's visible text and not in the chooser. Whether a person sees a tooltip during a drag is not shown. A desk window is named by what it carries and its display, not by the view it draws. |
| 3. A move's source document is removed only after the destination has drawn the note | The suite shows the removal comes from the acknowledging step alone. The walk watches the store and sees the note on the source desk, then on both, then on the destination only. The smoke run asks the desk panel what it had drawn at the first look that finds the note gone from the source. | A destination whose document is a labelled failure to read: no check produces one. A person's walk. |
| 4. No answer in time, a closed destination or a disconnected display undoes the landing and says so; no desk holds the note twice | The suite covers all three and a refusal, and forty runs of twelve handoffs end with no note twice on a desk and none lost. The walk keeps a desk window busy past the wait and closes one before it answers; both times the main window says why and both desks are exactly as they were. | A display disconnected during a handoff: the listener is in the main process and has never fired in a run. TST-0073 step 9. |
| 5. The document arrives at the size and reading position it had | The suite checks the size on the destination desk. The walk finds the stored size equal, the document back in the main window at the same size under the same heading, and the reader scrolled to that heading. | One difference: a desk window draws cards, so neither size nor reading position is seen there. A person's walk. |
| 6. The arrival is marked, names where it came from and offers send back while the source window exists; reduced motion | The walk reads the arrival message in a desk window, the main window and a reader, sends a note back from a desk window and from a reader, and under reduced motion finds the returned document marked with no animation. | A defect: the walk's record shows "Send back" offered for a desk window that had closed. Two differences: the mark lasts 2.4 seconds and is drawn in Glass only, and the message is the status line. Reduced motion at a desk window or a reader: not checked. |
| 7. The keyboard offers the same two acts and the same send back | The walk opens the chooser with `S` and reads both acts in it, and "Send back to …" as its first answer for a note that arrived. The smoke run finds the keyboard on the first answer and sends with Enter. | A note sent back by keyboard: every send back in the walk is a pointer press. Arrow keys and Escape in the chooser: not pressed by a check. |
| 8. The tablet cannot be a source and cannot acknowledge; the host refuses writes; no file changes; nothing is saved | The suite covers the tablet's landing and finds no handoff field in what the store saves. The walk sees "Also show in the tablet", the sentence that a tablet cannot confirm, a served page with no bridge and no "send back", a 405 to a write, and nothing about a handoff in the store. `git status` in the workspace was the same before and after the walk. | A real tablet: the served page was a window on the same machine. |

## Approval

Approved for building on 2026-10-02. Edwin asked for this to be delivered in full with DES-0003 as the baseline: “Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

The decision these criteria rest on, ADR-0007, is proposed and not accepted. Approval here means the criteria are the ones being built against. It does not mean Edwin has accepted the decision.

The table above names one defect and three places where the build differs from a criterion: a "send back" offered for a closed window, the tooltip that carries a move's consequence, a desk window that shows a card and so no size or reading position, and the short-lived arrival mark. The defect is in code this feature changed, so `tools/instructions/QUALITY.md` has it fixed in this feature; it is not fixed yet. Each difference needs either a change to the build or an amendment here before its criterion can be ticked. That choice is Edwin's.

## Traceability

- Implements: [[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]
- Verified by: [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]], [[TST-0075-A-Move-Is-Never-Half-Done]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
