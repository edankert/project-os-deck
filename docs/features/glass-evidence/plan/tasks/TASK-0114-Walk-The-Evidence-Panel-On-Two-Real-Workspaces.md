---
type: "[[task]]"
id: TASK-0114
title: "Walk the evidence panel on two real workspaces"
status: done
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

- [x] `bash tools/scripts/walk-in-a-box.sh glass-evidence --copy` runs `desktop/demos/glass-evidence.cjs` on a throwaway copy of this repository's notes, records each claim with what was seen in `drive.json`, and keeps pictures in `desktop/dist/walks/glass-evidence/`.
- [x] The walk opens a note that tests name and records the panel's rows against the workspace's own files: the same test ids as a search of the notes' `covers`, `tests`, `verifies` and `tasks` keys finds, each with the key it was found under.
- [x] The walk opens a note no test names and records "no test names this note", on a note whose status is terminal where the subject is joined to one (`fixed` on `your-trainer`; on this repository the subject's only such note is a reference note at `active`).
- [x] The walk records one acceptance check of each kind this workspace's ledger holds, compared with `docs/releases/ledgers/WORKING-app.json` read from disk: one with a standing verdict (mark, date, author, method, platform), one never walked ("not walked: no verdict is recorded"), and one invalidated (the change, the date, and the verdict before it shown as no longer standing). It opens the history and records the events in the ledger's order, newest first.
- [x] The walk records a manual test below acceptance level with its status and last-verified date labelled as the test note's. In the copy it sets one such test's `last_verified` to more than 90 days ago and records the stale label with the rule's name.
- [x] The walk records a test with a command reading "run by a command; its result is not recorded anywhere Deck can read", with no mark and no date in the row.
- [x] The walk stops the copy's sidecar, or withholds the acceptance answer, and records "the acceptance record could not be read" with no row reading "not walked".
- [x] The walk opens an excerpt on a test note with an Evidence heading and on one without, and records the section's text in the first and "this test note has no Evidence section" in the second. It opens the test note from a row and records the document scrolled to that heading, then the same note opened again raising the one document.
- [x] The walk finds a criterion line that links a test note and one that links none, and records the control reading "named on this line" on the first and no control on the second.
- [x] The walk repeats open, history, excerpt, open the original and close by keyboard alone, and records focus returning to the control. It repeats opening with `prefers-reduced-motion: reduce` emulated through the debugger and records the panel in its place at once, whole, and unmoved half a second later.
- [x] The walk loads the served page with no preload bridge and records the same panel, the host's 405 to a write on the acceptance path, and no control in the panel that records a verdict.
- [x] The copy's files differ from the start only by the one `last_verified` edit the walk made itself.
- [x] The walk is also run with `--workspace` on at least one other real project-os repository on this machine that keeps a ledger, and its result is recorded with the repository's note count and its ledger platforms. A repository with two ledgers is preferred, so that two platforms' verdicts for one check are seen.
- [x] The size and the time of the acceptance payload are recorded for both workspaces in [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]], with where they were taken. A time taken in the box says nothing about the Mac.
- [x] What cannot be scripted is listed and left to [[TST-0077-A-Claims-Evidence-Stands-Beside-It]]: Safari on the tablet, a screen reader, and whether a person reads "not walked" and "run by a command" as intended.
- [x] The finding about `/api/cockpit/scope-tests` and `/api/cockpit/release-item` is written up as text ready to file in the cockpit repository: the request, the empty `blocking` list returned, and the bare id compared against link slugs. Filing it there is reported to Edwin and not done from this repository's notes.
- [x] Every defect the walk finds in code this feature changed is fixed in this feature and listed in TST-0079 with what was seen. No check is weakened to pass.
- [x] TST-0077's Setup is checked against the built application, so that a stranger can follow it. No verdict is recorded for it.

## Steps

- [x] Read TST-0077 and write the scripted route to follow its steps in order.
- [x] Run the walk in the box, read `drive: ok` and `drive: FAIL`, and look at every picture.
- [x] Run it on a second workspace.
- [x] Record the evidence in TST-0079 and reconcile FEAT-0024's Verification section and REQ-0006.
- [x] Write the cockpit finding's text into this note and tell Edwin it is ready to file.

## Notes

Run on 2026-10-02 at `18f5405`, in the Linux box. On this repository's copy: 41 checks, all holding, none not run. On a copy of `your-trainer` (3269 notes, 685 test notes, ledgers for `android` and `ios`): 29 checks, all holding, 5 parts not run. What each run showed, the pictures' names and the parts not run are in [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]].

Window-opening runs on the Mac take the keyboard from whoever is typing (ISS-0075), so the box is the default. The walk records no verdict in any ledger. It compares what the panel shows with the ledger file on disk, and it checks at its end that the ledger files are entry for entry what they were.

## A finding for the cockpit: `blocking` and `originated` come back empty in a repository that links by file name

This is text ready to file as an issue in project-os-cockpit. It is not filed from here: Deck's notes do not write into the cockpit's, and filing it is Edwin's or a cockpit session's.

**What a person sees.** In the cockpit, a feature's scope panel says nothing blocks it, in a repository where an acceptance check that covers the feature has never been walked. Asked on 2026-10-02 of the sidecar serving this repository (cockpit at `d1df13c`): `GET /api/cockpit/scope-tests?id=FEAT-0020` answers `"blocking": []`. TST-0063 is an acceptance check with `covers: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]`, it has no entry in the ledger, and the same answer lists it under `tests` at `active`.

**Why.** `blocking_for` in `acceptance.py` keeps a check when `subjects & set(item.refs)` is not empty. `subjects` holds bare ids (`FEAT-0020`), built in `cockpit.py` from the target and its features' `note_id`. `item.refs` holds what the check's links were written as. This repository writes links by file name, so the reference is `FEAT-0020-Collections-And-Full-Notes-Live-On-Glass`, and the two never intersect. The payload of `/api/cockpit/acceptance` shows the references as they are held: `"refs": ["FEAT-0020-Collections-And-Full-Notes-Live-On-Glass"]`. In the cockpit's own repository and in `your-trainer` links are written as `[[FEAT-0002]]`, the reference is the bare id, and the comparison works. That is why it was not seen there.

**The same comparison in a second place.** `publication.py` builds a release item's `originated` list with `fid in (i.refs or ())`, a bare id against the same references. In a repository that links by file name, a release item's originated checks come back empty for the same reason.

**What it costs.** Both lists fail open: an empty list reads as "nothing blocks this" and "this release originated no checks". The gate count itself is not affected where `subjects` is `None`.

**A suggestion.** Compare on the id a reference resolves to, not on the text it was written as: resolve each entry of `refs` through the index once when the suite is loaded, or reduce both sides with the id pattern `_FOCUS_ID_RE` already used a few lines above for decisions.

Deck does not read either route, and FEAT-0024 does not work around this (ADR-0008, "What no source provides", item 5).

