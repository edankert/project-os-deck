---
type: "[[test]]"
id: TST-0079
aliases: ["TST-0079"]
title: "The evidence panel is walked with a real pointer and keyboard: the tests that name a note, a ledger verdict beside the file it came from, a check never walked, a check invalidated, a stale manual test, a test run by a command, the excerpt, the original, and the same panel on the served page"
status: passing
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
last_verified: 2026-10-02
covers: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]", "[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]"]
issues: []
tasks: ["[[TASK-0113-Show-Evidence-Beside-The-Claim-In-The-Glass-Document]]", "[[TASK-0114-Walk-The-Evidence-Panel-On-Two-Real-Workspaces]]"]
artifacts: ["desktop/demos/glass-evidence.cjs", "desktop/demos/lib.cjs", "tools/scripts/walk-in-a-box.sh"]
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

It is run by hand with one command. `python3 tools/scripts/run-tests.py` and CI do not run it, because neither has Docker. That is why it has no `command:`. Its status is this note's own, with the date it was last run.

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
- **Step 9, a note no test names.** A note no test names reads "no test names this note", with a terminal status where the subject is joined to such a note.
- **Step 10, the excerpt and the original.** "Excerpt" shows the text under the test note's Evidence heading, equal to that section of the file. A test note with no such heading reads "this test note has no Evidence section". "Open the test note" opens it as a document scrolled to the heading, and a second use raises the same document.
- **Step 11, a criterion line.** A checkbox line that links a test note has a control reading "named on this line", listing only the tests on that line. A checkbox line that links none has no control, and the checkbox's own `data-raw` is unchanged.
- **Step 12, the served page.** A page loaded with no preload bridge shows the same rows with the same words. The host answers 405 to POST, PUT, PATCH and DELETE on the acceptance path. No control in the panel records a verdict.
- **Step 13, keyboard and reduced motion.** Open, history, excerpt, open the original and close all work by keyboard, and focus returns to the control that opened the panel. With `prefers-reduced-motion: reduce` emulated the panel appears without travel.
- **Step 14, the record.** Every file under the copy's `docs` is compared by content at the end. The only difference is the one `last_verified:` edit the walk made itself. The ledger files are unchanged.
- **Beyond TST-0077: the record cannot be read.** With the acceptance answer withheld or the copy's sidecar stopped, the panel reads "the acceptance record could not be read" and no row reads "not walked". The rows that need no ledger are still shown.
- **Beyond TST-0077: a second workspace.** On another real repository the same claims hold against that repository's files. Where it keeps two ledgers, a check's row shows each platform's verdict with the platform's name.

## What it does not cover

- Whether a person reads "not walked" and "run by a command" as intended. That is TST-0077.
- Safari on a tablet, which is TST-0077's step 12 with real hardware.
- Every case of the model, including a payload of another schema version and a bare id under `covers:`, which are checked without a window in [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]].
- The host's refusals on the new path in full, which is [[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]].
- A screen reader, and touch.

## Measurements

Taken on 2026-10-02 at `e86b2e4` in the Linux box (the `project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900). The box draws in software, so the times include the sidecar's work and Deck's reading and say nothing about how fast the Mac draws.

| Workspace | Notes | Test notes | Ledger platforms | Acceptance answers read | Size of each platform's answer | From pressing E to the rows being filled |
| --- | --- | --- | --- | --- | --- | --- |
| this repository, a copy | 430 | 80 | `app` | 2 | 499 KB | 156 ms |
| `your-trainer`, a copy | 3269 | 685 | `android` and `ios` | 3 | 3.3 MB and 4.0 MB | 473 ms |

The answers are kept until the notes change or a person presses "read again", so a second panel costs no request.

## Evidence (fill after running)

**2026-10-02, at `e86b2e4`, in the Linux box.** Every press was sent with `webContents.sendInputEvent`. Pictures and `drive.json` are in `desktop/dist/walks/glass-evidence/` and `desktop/dist/walks/glass-evidence-your-trainer/`, which are build output and are not committed.

**On a copy of this repository: 36 checks, all holding, none not run.** The subject was FEAT-0020, chosen by the walk as the feature whose tests are of the most kinds. What was seen, in the order of the expected results:

- The document opened with its panel closed and the header reading "evidence · 7". No request for the acceptance record had been made. A task whose tests are all below acceptance level (TASK-0063) showed its rows and still no request was made.
- Opening the subject's panel asked for the record twice, once for the platforms and once for `app`. The rows were the tests the frontmatter names and no other, each with its title before its id and the key it was found under.
- At its own size (560 px) the panel stood above the text and the related list closed to make room. Filling the field it stood to the right of the text.
- A check a person walks showed a "verdict" from the acceptance ledger and, on its own line, the "status of the test note". TST-0063 has no entry in the ledger file and read "not walked: no verdict is recorded". A test run by a command showed the sentence and its command, in the plain text colour, with no mark and no date. A test done by hand showed its note's status and date.
- "Excerpt" quoted the text under a test note's Evidence heading, compared with the note as the sidecar renders it. A note with no such heading read "this test note has no Evidence section". "Open the test note" opened the note with its Evidence heading at the top of the text; asked again, it raised the same document; closing it put the keyboard back on the row.
- TST-0008 on FEAT-0005 read "pass on 2026-09-07 by user:edwin, manual", as its newest entry in the ledger file does, and "History" listed its two entries newest first. TST-0015 read as a question with the walker's reason, in the colour of a check held open. TST-0010 on FEAT-0008 read as invalidated on 2026-09-08 by the change the ledger names, with "The verdict before it, pass on 2026-09-07, no longer stands."
- On REQ-0001, each criterion that links a test note had a control reading "evidence named on this line", and Enter on it listed only that line's test. Escape put the keyboard back on that control. By keyboard alone the walk then opened an excerpt, opened the original, closed it with Delete and found the keyboard on the row it came from.
- A note no test names read "no test names this note. Nothing is inferred from its status."
- With one manual test's `last_verified:` set to 2026-06-01 in the copy, its row read "stale: a manual verification goes stale after 90 days; this was 123 days ago".
- With the request for the record refused, the panel said once "the acceptance record could not be read: the sidecar did not answer: Failed to fetch". The walked check said that in place of a verdict, and no row read "not walked". "read again" brought its own words back.
- With reduced motion asked for through the debugger, the panel was in its place at once and had not moved half a second later.
- The served page, with no bridge, showed the same control and the same rows with the same words. The host answered 405 to a POST on the acceptance path and on `mark-check`. No control in a panel records or re-runs anything.
- Of the copy's 438 files under `docs`, the only one that differed at the end was the test note the walk edited. The ledger file was entry for entry what it was.

**On a copy of `your-trainer`: 28 checks, all holding, 3 parts not run.** 3269 notes, 685 test notes, three ledger files for two platforms. The subject was FEAT-0104, with 20 tests of which 14 are retired.

- Each walked check showed two verdict lines, one for `android` and one for `ios`, each naming its platform. TST-0015 read "pass on 2026-08-30 by migration, migration: …" for android and "not walked: no verdict is recorded" for ios.
- For `ios`, whose ledger is one file, the sidecar's answer agreed with that file's newest entry for every one of 442 checks. For `android`, whose record is a sealed release's ledger and the open one, the walk held the panel to the sidecar's own answer and says so in its log.
- TST-0019 read as invalidated on 2026-09-29 by the newest of three invalidations in its ledger, on both platforms, with the verdict before it named only on android, where there was one.
- A retired test read "retired: it is no longer performed".
- TST-0015 has no Evidence section, and its excerpt read "this test note has no Evidence section".

**Parts not run on `your-trainer`, and why.** None of the subject's tests has an Evidence section, so no excerpt was quoted. No requirement there has a criterion that links a test note on its own line. The subject has no test done by hand, so the staleness rule was not seen there. All three were seen on this repository.

**Defects the walks found, each fixed in this feature. No check was weakened.**

| What was seen | What it was | Where it is fixed |
| --- | --- | --- |
| On `your-trainer`, TST-0019 read "invalidated on  by TASK-0385", with no date, for both platforms. | The row's `invalidated_by` is the test note's old frontmatter field, not the ledger's. The ledger held three dated invalidations. | The invalidation is read from the history (`evidence.ts`, ADR-0008 A2). |
| No criterion line had a control. | The sidecar wraps a criterion's checkbox in a label, and the code looked for the box as a direct child of the line. | `markClaims` in `glass.ts` finds the box by which line it belongs to. |
| "read again" could not be pressed in a document filling the field. | It was at the foot of the panel, under the compass. | It is at the top of the panel, and the panel's last row can be scrolled clear. |
| In a document at its own size, with the related list open, opening the evidence left the text a few lines. | Both panels stood above the text. | In a document under 760 px the evidence takes the related list's place. |
| A note reopened after the desk was swept came back with its related list open. | Only the × closed a document's panels. | A document that leaves the desk has its panels closed, however it left. |
| A walked check on a feature with retired tests was expected to have a verdict for each retired test. | The walk's own expectation, not the application: a retired test has no verdict to show. | The walk expects "retired: it is no longer performed". |
| The walk read a ledger entry spelled `result:` as an invalidation, and missed a test linked by its file's name. | Two mistakes in the walk's own reading of the files. | The walk reads `result` as the mark and resolves a link by file name. |
| The walk's record showed later requests beside the check that there had been none. | The log held the list of requests itself, which goes on growing. | Each check records a copy (`2692fe0`). |

**Not covered here.** Safari on a tablet. A screen reader, and touch. Whether a person reads "not walked" and "run by a command" as intended. A capture or a ledger evidence reference, which no route gives. The history pressed on the served page: the rows there were compared word for word, and the subject's walked check on this repository has no history to open. These are [[TST-0077-A-Claims-Evidence-Stands-Beside-It]]'s, which no one has walked.

