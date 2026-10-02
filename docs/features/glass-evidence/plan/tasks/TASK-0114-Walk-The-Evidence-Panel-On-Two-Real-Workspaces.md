---
type: "[[task]]"
id: TASK-0114
title: "Walk the evidence panel on two real workspaces"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"]
parent: "[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"
effort: M
due: ""
depends: ["[[TASK-0113-Show-Evidence-Beside-The-Claim-In-The-Glass-Document]]"]
blocks: []
related: ["[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]", "[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]", "[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]]"]
tests: ["[[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]", "[[TST-0077-A-Claims-Evidence-Stands-Beside-It]]"]
---

# Walk the evidence panel on two real workspaces

The evidence for FEAT-0024. A scripted walk drives the panel in the real application with a real pointer and keyboard and keeps pictures, on this workspace and on a second real one. The acceptance check is a person's, and this task prepares it without recording a verdict for it.

## Definition of Done

- [ ] `bash tools/scripts/walk-in-a-box.sh glass-evidence --copy` runs `desktop/demos/glass-evidence.cjs` on a throwaway copy of this repository's notes, records each claim with what was seen in `drive.json`, and keeps pictures in `desktop/dist/walks/glass-evidence/`.
- [ ] The walk opens a note that tests name and records the panel's rows against the workspace's own files: the same test ids as a search of the notes' `covers`, `tests`, `verifies` and `tasks` keys finds, each with the key it was found under.
- [ ] The walk opens a note no test names and records "no test names this note", on a note whose status is `done`.
- [ ] The walk records one acceptance check of each kind this workspace's ledger holds, compared with `docs/releases/ledgers/WORKING-app.json` read from disk: one with a standing verdict (mark, date, author, method, platform), one never walked ("not walked: no verdict is recorded"), and one invalidated (the change, the date, and the verdict before it shown as no longer standing). It opens the history and records the events in the ledger's order, newest first.
- [ ] The walk records a manual test below acceptance level with its status and last-verified date labelled as the test note's. In the copy it sets one such test's `last_verified` to more than 90 days ago and records the stale label with the rule's name.
- [ ] The walk records a test with a command reading "run by a command; its result is not recorded anywhere Deck can read", with no mark and no date in the row.
- [ ] The walk stops the copy's sidecar, or withholds the acceptance answer, and records "the acceptance record could not be read" with no row reading "not walked".
- [ ] The walk opens an excerpt on a test note with an Evidence heading and on one without, and records the section's text in the first and "this test note has no Evidence section" in the second. It opens the test note from a row and records the document scrolled to that heading, then the same note opened again raising the one document.
- [ ] The walk finds a criterion line that links a test note and one that links none, and records the control reading "named on this line" on the first and no control on the second.
- [ ] The walk repeats open, history, excerpt, open the original and close by keyboard alone, and records focus returning to the control. It repeats opening with `prefers-reduced-motion: reduce` emulated and records no travel.
- [ ] The walk loads the served page with no preload bridge and records the same panel, the host's 405 to a write on the acceptance path, and no control in the panel that records a verdict.
- [ ] The copy's files differ from the start only by the one `last_verified` edit the walk made itself.
- [ ] The walk is also run with `--workspace` on at least one other real project-os repository on this machine that keeps a ledger, and its result is recorded with the repository's note count and its ledger platforms. A repository with two ledgers is preferred, so that two platforms' verdicts for one check are seen.
- [ ] The size and the time of the acceptance payload are recorded for both workspaces in [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]], with where they were taken. A time taken in the box says nothing about the Mac.
- [ ] What cannot be scripted is listed and left to [[TST-0077-A-Claims-Evidence-Stands-Beside-It]]: Safari on the tablet, a screen reader, and whether a person reads "not walked" and "run by a command" as intended.
- [ ] The finding about `/api/cockpit/scope-tests` and `/api/cockpit/release-item` is written up as text ready to file in the cockpit repository: the request, the empty `blocking` list returned, and the bare id compared against link slugs. Filing it there is reported to Edwin and not done from this repository's notes.
- [ ] Every defect the walk finds in code this feature changed is fixed in this feature and listed in TST-0079 with what was seen. No check is weakened to pass.
- [ ] TST-0077's Setup is checked against the built application, so that a stranger can follow it. No verdict is recorded for it.

## Steps

- [ ] Read TST-0077 and write the scripted route to follow its steps in order.
- [ ] Run the walk in the box, read `drive: ok` and `drive: FAIL`, and look at every picture.
- [ ] Run it on a second workspace.
- [ ] Record the evidence in TST-0079 and reconcile FEAT-0024's Verification section and REQ-0006.
- [ ] Write the cockpit finding's text into this note and tell Edwin it is ready to file.

## Notes

Nothing is built by this note and no walk has been run. Window-opening runs on the Mac take the keyboard from whoever is typing (ISS-0075), so the box is the default.

The walk records no verdict in any ledger. It compares what the panel shows with the ledger file on disk, and the ledger file is not changed.
