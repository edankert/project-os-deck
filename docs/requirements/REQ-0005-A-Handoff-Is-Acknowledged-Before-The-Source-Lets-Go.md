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

## Approval

Approved for building on 2026-10-02. Edwin asked for this to be delivered in full with DES-0003 as the baseline: “Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

The decision these criteria rest on, ADR-0007, is proposed and not accepted. Approval here means the criteria are the ones being built against. It does not mean Edwin has accepted the decision.

## Traceability

- Implements: [[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]
- Verified by: [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]], [[TST-0075-A-Move-Is-Never-Half-Done]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]
