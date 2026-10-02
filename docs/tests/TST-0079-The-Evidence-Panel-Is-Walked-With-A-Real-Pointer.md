---
type: "[[test]]"
id: TST-0079
aliases: ["TST-0079"]
title: "The evidence panel is walked with a real pointer and keyboard: the tests that name a note, a ledger verdict beside the file it came from, a check never walked, a check invalidated, a stale manual test, a test run by a command, the excerpt, the original, and the same panel on the served page"
status: ready
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[TASK-0114-Walk-The-Evidence-Panel-On-Two-Real-Workspaces]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: integration
kind: manual
entrypoint: "desktop/demos/glass-evidence.cjs"
command: ""
last_verified: ""
covers: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]", "[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]"]
issues: []
tasks: ["[[TASK-0113-Show-Evidence-Beside-The-Claim-In-The-Glass-Document]]", "[[TASK-0114-Walk-The-Evidence-Panel-On-Two-Real-Workspaces]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0077-A-Claims-Evidence-Stands-Beside-It]]", "[[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]]", "[[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]]", "[[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]"]
---

# The evidence panel is walked with a real pointer

## Purpose

One route through the real application, the route [[TST-0077-A-Claims-Evidence-Stands-Beside-It]] asks a person to take, driven by `webContents.sendInputEvent` so every press is hit-tested as a person's is. Each claim is recorded with what was seen, and pictures are kept. What the panel shows is compared with the workspace's own files: the notes' frontmatter and the ledger file on disk. The walk edits one test note's `last_verified:` to make it stale, so it runs on a throwaway copy of the notes made inside the box.

It is not TST-0077. That check is a person's, and no verdict is recorded for it here.

It is run by hand with one command. `python3 tools/scripts/run-tests.py` and CI do not run it, because neither has Docker. That is why it has no `command:` and is `ready` until it has been run.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh glass-evidence --copy`.
3. Read the lines beginning `drive: ok` and `drive: FAIL`, and look at the pictures in `desktop/dist/walks/glass-evidence/`. The same lines are in `drive.json` there.
4. Run it once more on another real workspace that keeps a ledger: `bash tools/scripts/walk-in-a-box.sh glass-evidence --workspace <path> --name glass-evidence-<repository>`.

## Expected results, against TST-0077's steps

- **Steps 1 and 2, the control and the list.** A document opens with its text readable, an evidence control with a count, and no panel. The panel's test ids are the ones a search of the copy's notes finds under `covers`, `tasks`, `tests` and `verifies` for that note, and each row names the key it was found under.
- **Step 3, a check never walked.** An acceptance check whose id is not in the ledger file reads "not walked: no verdict is recorded".
- **Step 4, a test run by a command.** The row reads "run by a command; its result is not recorded anywhere Deck can read", shows the command, and holds no mark and no date.
- **Step 5, a stale manual test.** After the walk sets one manual test's `last_verified:` to more than 90 days ago, its row shows the note's status and that date, labelled as the test note's, and the stale label with the rule's name.
- **Steps 6 and 7, a walked check.** The row's mark, date, author, method and platform equal the newest entry for that check in the ledger file. The source is named as the acceptance ledger, and the test note's status is on a separate labelled line. "History" lists the ledger's entries for the check, newest first.
- **Step 8, an invalidated check.** The row says the verdict was invalidated, with the change and the date from the ledger file, and shows the earlier mark as no longer standing.
- **Step 9, a note no test names.** A note with a terminal status reads "no test names this note".
- **Step 10, the excerpt and the original.** "Excerpt" shows the text under the test note's Evidence heading, equal to that section of the file. A test note with no such heading reads "this test note has no Evidence section". "Open the test note" opens it as a document scrolled to the heading, and a second use raises the same document.
- **Step 11, a criterion line.** A checkbox line that links a test note has a control reading "named on this line", listing only the tests on that line. A checkbox line that links none has no control, and the checkbox's own `data-raw` is unchanged.
- **Step 12, the served page.** A page loaded with no preload bridge shows the same rows with the same words. The host answers 405 to POST, PUT, PATCH and DELETE on the acceptance path. No control in the panel records a verdict.
- **Step 13, keyboard and reduced motion.** Open, history, excerpt, open the original and close all work by keyboard, and focus returns to the control that opened the panel. With `prefers-reduced-motion: reduce` emulated the panel appears without travel.
- **Step 14, the record.** The copy's files differ from the start only by the one `last_verified:` edit the walk made itself. The ledger file is unchanged.
- **Beyond TST-0077: the record cannot be read.** With the acceptance answer withheld or the copy's sidecar stopped, the panel reads "the acceptance record could not be read" and no row reads "not walked". The rows that need no ledger are still shown.
- **Beyond TST-0077: a second workspace.** On another real repository the same claims hold against that repository's files. Where it keeps two ledgers, a check's row shows each platform's verdict with the platform's name.

## What it does not cover

- Whether a person reads "not walked" and "run by a command" as intended. That is TST-0077.
- Safari on a tablet, which is TST-0077's step 12 with real hardware.
- Every case of the model, including a payload of another schema version and a bare id under `covers:`, which are checked without a window in [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]].
- The host's refusals on the new path in full, which is [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]].
- A screen reader, and touch.

## Measurements

To be recorded by TASK-0114, each with build, workspace, note count, ledger platforms and where it was taken: the size of the acceptance payload, and the time from opening the panel to its acceptance rows being filled. A time taken in the box is software rendering and says nothing about the Mac.

## Evidence (fill after running)

- None. The walk has not been run for this note on 2026-10-02. `desktop/demos/glass-evidence.cjs` is in the working tree, uncommitted, and the expected results above were written from TST-0077 and not from that script.
