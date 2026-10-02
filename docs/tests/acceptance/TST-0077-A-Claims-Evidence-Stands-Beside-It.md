---
type: "[[test]]"
id: TST-0077
title: "A claim's evidence stands beside it"
status: active
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"]
scope: feature
level: acceptance
entrypoint: "The evidence control on a note's document in Glass"
command: ""
last_verified: ""
covers: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"]
issues: []
tasks: ["[[TASK-0113-Show-Evidence-Beside-The-Claim-In-The-Glass-Document]]", "[[TASK-0114-Walk-The-Evidence-Panel-On-Two-Real-Workspaces]]"]
artifacts: []
related: ["[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]", "[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]", "[[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]", "[[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]]"]
area: glass-evidence
after: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# A claim's evidence stands beside it

## Setup

Use a disposable copy of this repository, project-os-deck, because the walk edits one note. Copy the repository's folder, add the copy to Deck as a workspace, and open it. Run `git status` in the copy and keep the output.

Open the copy's `docs/releases/ledgers/WORKING-app.json` in a text editor and keep it open. It is the acceptance ledger: one entry per recorded verdict, with the check's id, the mark, the date and who recorded it. An entry with `invalidated_by` cancels the verdict before it. From it, write down two acceptance checks:

- one whose newest entry is a mark, with that mark, its date and its `by` (a check that was walked);
- one whose newest entry has `invalidated_by`, with the change named there, its date, and the mark on the entry before it (an invalidated check).

For each of the two, open the check's note under `docs/tests/acceptance/` and write down the first note its `covers:` names. That is the note whose evidence panel will list the check.

Check that `TST-0063` does not appear anywhere in the ledger file. It is the acceptance check for FEAT-0020 and had never been walked when this check was written. If it has been walked since, pick another acceptance check under `docs/tests/acceptance/` whose id is not in the ledger, and use it and the note its `covers:` names wherever the steps say TST-0063 and FEAT-0020's panel.

In the copy, open `docs/tests/TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer.md`. It is a test a person runs by hand, it is not an acceptance check, and its `covers:` names FEAT-0020. Change its `last_verified:` to a date more than 90 days before today and save.

You need a tablet on the same network for step 12. Start Deck with `cd desktop && npm run start:lan`, and open the address Deck prints in Safari on the tablet. Record the build and whether reduced motion is on.

## Steps

1. In Glass, open the Features view and open FEAT-0020 as a document. Read its header without clicking anything further.
2. Open the evidence control in the document's header. Read the list of tests and, for each, the words that say how it is joined to this note.
3. Read the row for TST-0063, an acceptance check that is not in the ledger.
4. Read the row for a test whose note has a `command:`, such as TST-0066. Look for any mark, date or colour that suggests it passed or failed.
5. Read the row for TST-0068, the test you edited.
6. Open the document of the note the walked check covers, and open its evidence panel. Read the check's verdict, date, author, method and platform, and where the row says they came from. Compare each with the ledger file. Read the line that gives the test note's own status.
7. Open "History" on that row and compare the events and their order with the ledger file.
8. Open the document of the note the invalidated check covers, open its evidence panel, and read that check's row.
9. In FEAT-0020's document press R to list what it is joined to, open ADR-0002 from that list, and read its evidence control. ADR-0002 is `accepted` and no test names it. Then open the control.
10. Back in FEAT-0020's panel, open "Excerpt" on TST-0068's row. Then use "Open the test note" and look at where the new document is scrolled. Use "Open the test note" on the same row again. Then open "Excerpt" on TST-0063's row.
11. No view lists a requirement, so open one from a feature: in FEAT-0020's related list open REQ-0001, and find a criterion line that ends with a link to a test note. From the same list open TASK-0095 and find the first checkbox line under Definition of Done, which links no test. Look for an evidence control on each line, and open the one you find.
12. On the tablet, open FEAT-0020, open its evidence panel, and read the same rows as in steps 3 to 5. Look for any control that would record or change a verdict.
13. On the Mac, using only the keyboard, open a document's evidence panel, move through its rows, open a history, and close the panel with Escape. Then turn on Reduce motion in macOS's Accessibility settings and open and close a panel.
14. Look through every panel you opened on the Mac for a control that would record, change or re-run anything. Then run `git status` in the workspace copy and compare it with the output from Setup.

## Expect

- After step 1, the note's text is readable and the header shows an evidence control with a number of tests, such as "evidence · 6". No panel is open.
- The panel is part of the document. In a document at least 760 px wide it stands to the right of the text. In a narrower one it stands above the text, and the related list closes to make room for it.
- The panel lists tests by title and id. Each row says how it is joined, in words that name a frontmatter key, such as "its `covers:` names this note".
- TST-0063's row reads "not walked: no verdict is recorded".
- The test with a command reads "run by a command; its result is not recorded anywhere Deck can read" and shows the command. It shows no mark, no date and no pass or fail colour.
- TST-0068's row shows its status and the date you typed, says they come from the test note, and is labelled stale with the words "a manual verification goes stale after 90 days".
- The walked check's row shows the same mark, date, author and method as the ledger file, names the platform "app", and says the source is the acceptance ledger. The mark is labelled a verdict. The test note's status is on its own line, labelled as the note's status, and reads `active`.
- "History" lists every entry the ledger holds for that check, newest first.
- The invalidated check's row says the verdict was invalidated, names the change and the date from the ledger, and shows the earlier mark as no longer standing. It does not read as passed.
- ADR-0002's control reads "evidence · no test" and its panel reads "no test names this note". Nothing in the panel says or suggests it is verified because its status is `accepted`.
- "Excerpt" on TST-0068 shows the text under that note's Evidence heading and nothing else. "Open the test note" opens TST-0068 as a document scrolled to that heading, and using it again raises the same document without a second copy. TST-0063's excerpt reads "this test note has no Evidence section".
- The criterion line in REQ-0001 has a control at its end reading "evidence named on this line", and it lists only the tests linked on that line. The line in TASK-0095 has no control. The checkbox on each line looks and behaves as it did.
- The tablet shows the same rows with the same words. It offers nothing that records or changes a verdict.
- By keyboard, every control is reached and operated, focus is visible, and Escape returns focus to the control that opened the panel. With Reduce motion on, the panel appears without sliding or flying.
- No panel on the Mac offers a control that records, changes or re-runs anything. `git status` shows only your one edit from Setup.

## Not this check

- A result for a test with a command. None is recorded where Deck can read it, and the panel says so. That is by decision (ADR-0008, "What no source provides").
- A picture, a capture or a file a test lists. None is shown, for the same reason.
- Evidence for a criterion that links no test on its own line. No such mapping exists.
- The levels, the flows, a level control and a level address. Those are [[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]], which is parked.
- Recording a verdict. That is done in the cockpit, and ticking a criterion in Deck is [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]].
- The panel when the sidecar cannot be reached or answers in another shape. That is checked without a window in [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]] and with one in [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]].
- A workspace with two ledgers. [[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]] is run on one.
- A screen reader. It is not walked here and no claim is made for it.

This note defines the walk. It records no outcome. What it describes was built on 2026-10-02 (`4243fc2`), and its Setup and Steps were checked that day against the built application: every control it names exists under that name, and steps 9 and 11 were rewritten to routes that exist, because no view lists a change note or a requirement. No person has walked it, and the ledger holds no verdict for it.
