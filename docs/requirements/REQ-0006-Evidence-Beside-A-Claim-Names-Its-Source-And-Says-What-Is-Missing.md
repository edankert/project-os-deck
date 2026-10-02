---
type: "[[requirement]]"
id: REQ-0006
title: "Evidence beside a claim names its source and says what is missing"
status: approved
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["Edwin 2026-10-02: 'Deliver the structured-evidence experience described under FEAT-0021, establishing its required source contracts first. Respect the documented phase and authority boundaries. Do not fabricate evidence, relationship meanings or unsupported backend fields. Identify any genuinely external dependency precisely and continue all independent work.'", "[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]", "[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
priority: high
scope: "The evidence panel on a note opened as a Glass document, in the Electron shell and on the served page"
acceptance: ["The evidence panel of a note lists every test note that names it under `covers` or `tasks`, or that it names under `tests` or `verifies`, and no other; each row shows the frontmatter key the link was written under; a note no test names reads 'no test names this note', and nothing is inferred from its status, its feature's status or its tasks.", "A test at `level: acceptance` shows the standing verdict the ledger holds for it, with its date, who recorded it, by which method and on which platform; with no entry it reads 'not walked: no verdict is recorded'; an invalidated verdict is said to be invalidated, with the change and the date, beside the verdict before it; the history of every verdict opens from the row.", "A manual test that is not at acceptance level shows its own status and last-verified date, labelled as coming from the test note, and is labelled stale with the rule's name when that date is more than 90 days old; a test with a `command:` reads 'run by a command; its result is not recorded anywhere Deck can read' and shows no verdict and no date.", "A recorded verdict is never called a status and a note's status is never shown as a verdict; when the acceptance record cannot be read the panel reads 'the acceptance record could not be read' with the reason, and no row reads 'not walked'.", "Each evidence row names its source and its date and opens the full original, the test note as a document on the desk, at its Evidence section when it has one; an excerpt is that note's own text under its Evidence heading, and a note with no such heading reads 'this test note has no Evidence section'; nothing is quoted from anywhere else.", "A criterion line in a note's text gets an evidence control only when that line itself carries a link to a test note; the control reads 'named on this line' and lists only the tests the line names; a line with no such link gets no control.", "The panel is closed until a person opens it, opens and closes by pointer and by keyboard with focus returned to the control that opened it, and appears without travel under reduced motion.", "Nothing in the panel writes: it offers no control that records or changes a verdict, the served page shows the same panel through the same GET, Deck's host answers 405 to every method that is not GET or HEAD on the forwarded acceptance path, and `git status` in the workspace is unchanged by using the panel."]
implements: "[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"
verifies: ["[[TST-0077-A-Claims-Evidence-Stands-Beside-It]]", "[[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]]", "[[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]"]
related: ["[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]", "[[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]]"]
tests: ["[[TST-0077-A-Claims-Evidence-Stands-Beside-It]]", "[[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]]", "[[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]"]
---

# Evidence beside a claim names its source and says what is missing

## Statement

A person reading a note on the Glass desk must be able to ask what supports it and get an answer drawn only from what is recorded. The answer lists the tests that name the note. For each test it shows what the record holds: a verdict from the acceptance ledger, or the test note's own status and date, each with its source and the way to the full original. Where the record holds nothing, the panel must say so in plain words and must not fill the gap from a status. Nothing in the panel may write.

Which sources are read, what is shown for each kind of test and the exact words for what is absent are decided in [[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]], which is at `proposed`.

## Acceptance Criteria

- [ ] The evidence panel of a note lists every test note that names it under `covers` or `tasks`, or that it names under `tests` or `verifies`, and no other; each row shows the frontmatter key the link was written under; a note no test names reads "no test names this note", and nothing is inferred from its status, its feature's status or its tasks. — evidence to be collected: [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]], [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]
- [ ] A test at `level: acceptance` shows the standing verdict the ledger holds for it, with its date, who recorded it, by which method and on which platform; with no entry it reads "not walked: no verdict is recorded"; an invalidated verdict is said to be invalidated, with the change and the date, beside the verdict before it; the history of every verdict opens from the row. — evidence to be collected: [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]], [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]], [[TST-0077-A-Claims-Evidence-Stands-Beside-It]]
- [ ] A manual test that is not at acceptance level shows its own status and last-verified date, labelled as coming from the test note, and is labelled stale with the rule's name when that date is more than 90 days old; a test with a `command:` reads "run by a command; its result is not recorded anywhere Deck can read" and shows no verdict and no date. — evidence to be collected: [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]], [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]
- [ ] A recorded verdict is never called a status and a note's status is never shown as a verdict; when the acceptance record cannot be read the panel reads "the acceptance record could not be read" with the reason, and no row reads "not walked". — evidence to be collected: [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]], [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]
- [ ] Each evidence row names its source and its date and opens the full original, the test note as a document on the desk, at its Evidence section when it has one; an excerpt is that note's own text under its Evidence heading, and a note with no such heading reads "this test note has no Evidence section"; nothing is quoted from anywhere else. — evidence to be collected: [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]], [[TST-0077-A-Claims-Evidence-Stands-Beside-It]]
- [ ] A criterion line in a note's text gets an evidence control only when that line itself carries a link to a test note; the control reads "named on this line" and lists only the tests the line names; a line with no such link gets no control. — evidence to be collected: [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]], [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]
- [ ] The panel is closed until a person opens it, opens and closes by pointer and by keyboard with focus returned to the control that opened it, and appears without travel under reduced motion. — evidence to be collected: [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]], [[TST-0077-A-Claims-Evidence-Stands-Beside-It]]
- [ ] Nothing in the panel writes: it offers no control that records or changes a verdict, the served page shows the same panel through the same GET, Deck's host answers 405 to every method that is not GET or HEAD on the forwarded acceptance path, and `git status` in the workspace is unchanged by using the panel. — evidence to be collected: [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]], [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]], [[TST-0077-A-Claims-Evidence-Stands-Beside-It]]

### Evidence collected, 2026-10-02

No criterion is ticked here. Ticking a criterion with evidence is a person's act in the cockpit, and two criteria name the acceptance check, which no one has walked. This is what exists for whoever ticks them.

| Criterion | What exists | What is still owed |
| --- | --- | --- |
| The tests that name a note, by key; "no test names this note" | TST-0078 (18 tests, passing at `e86b2e4`); TST-0079 on two workspaces | A person's walk, TST-0077 steps 2 and 9 |
| An acceptance check's verdict, "not walked", an invalidation, the history | TST-0078; TST-0079 compared with the ledger files on both workspaces, two platforms on one | TST-0077 steps 3 and 6 to 8 |
| A manual test's status and date, stale after 90 days; a test with a command | TST-0078, including the day it turns stale; TST-0079 | TST-0077 steps 4 and 5 |
| A verdict is never a status; an unread record is not "not walked" | TST-0078; TST-0079 with the request refused | Nothing further is planned |
| Source, date and the original; the excerpt | TST-0079 on this repository | TST-0077 step 10 |
| A criterion's own control | TST-0078 for the rule; TST-0079 on REQ-0001 | TST-0077 step 11 |
| Closed until opened, keyboard, focus, reduced motion | TST-0079, with reduced motion emulated | TST-0077 step 13, with the real setting |
| Nothing writes; the served page; 405 | TST-0007 (the host suite); TST-0079 with the served page and the files compared at the end | TST-0077 steps 12 and 14, on a tablet |

## Approval

Approved for building on 2026-10-02. Edwin asked for this to be delivered with DES-0003 as the baseline: “Deliver the structured-evidence experience described under FEAT-0021, establishing its required source contracts first. Respect the documented phase and authority boundaries. Do not fabricate evidence, relationship meanings or unsupported backend fields. Identify any genuinely external dependency precisely and continue all independent work.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

The decision these criteria rest on, ADR-0008, is proposed and not accepted. Approval here means the criteria are the ones being built against. It does not mean Edwin has accepted the decision.

This requirement covers the part of FEAT-0021's findings that today's sources can answer. It does not cover a capture, a result for a test with a command, a criterion's own id, a per-subject evidence payload or a trace. ADR-0008 lists each under "What no source provides" with who decides it. If one of them becomes readable, this requirement is amended and not stretched.

Five threads are open under ADR-0008's Acceptance section. Two could change a criterion here. If Edwin asks for the walker's reason and name to be left off the served page, the last criterion's "the same panel" is narrowed. If he moves this work to PHASE-0004, the requirement moves with its feature.

## Traceability

- Implements: [[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]
- Verified by: [[TST-0077-A-Claims-Evidence-Stands-Beside-It]], [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]], [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]
- The host's refusal of every method that is not a read is checked by [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]], which TASK-0112 extends to the new path.
