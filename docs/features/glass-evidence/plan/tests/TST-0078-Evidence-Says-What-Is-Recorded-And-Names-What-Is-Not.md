---
type: "[[test]]"
id: TST-0078
aliases: ["TST-0078"]
title: "Evidence says what is recorded and names what is not: the tests that name a note by the key they were written under, a ledger verdict or the plain statement that there is none, a manual test's own status and its staleness, and no result for a test run by a command"
status: active
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[TASK-0111-Work-Out-A-Notes-Evidence-Without-A-Window]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/evidence.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh evidence"
covers: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]", "[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]"]
issues: []
tasks: ["[[TASK-0111-Work-Out-A-Notes-Evidence-Without-A-Window]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0079-The-Evidence-Panel-Is-Walked-With-A-Real-Pointer]]", "[[TST-0077-A-Claims-Evidence-Stands-Beside-It]]", "[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]"]
---

# Evidence says what is recorded and names what is not

## Purpose

REQ-0006 says the evidence panel states only what is recorded and says plainly what is not. Whether that holds is decided before anything is drawn, in one pure module, `desktop/src/shared/evidence.ts`. This suite checks that module without a window and without a request.

**This note must be committed together with its suite.** `command:` names `evidence`. On 2026-10-02 `desktop/tests/evidence.test.mjs` and `desktop/src/shared/evidence.ts` are in the working tree and are not committed. A note whose suite is missing makes `bash tools/scripts/run-desktop-tests.sh <suite>` exit 2 and `python3 tools/scripts/run-tests.py` report it failing, which is the failure [[ISS-0028-A-Test-Note-Names-A-Suite-That-Does-Not-Exist]] recorded. The expected results below were written from the requirement and from ADR-0008, and not from that suite, so TASK-0111 reconciles the two.

The status is `active` and not `ready`. A test with a `command:` records no verdict on its note; the run is the verdict (`tools/instructions/STATUSES.md`, `[[test]]`).

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh evidence`.

## Expected results

- The tests that verify a note are found under exactly four keys: `covers` or `tasks` on a test naming the note, and `tests` or `verifies` on the note naming a test. Each is returned with the key it was found under. A link under `related`, `source`, `parent` or `phase`, a link in a note's text, and a link to a note that is not a test return nothing.
- A bare id under `covers:` or `tasks:` is found the same as a wikilink, and a test found by two routes is returned once.
- A test's facts are its own frontmatter and nothing else: status, level, command, last_verified, artifacts and review_verdict. A note that is not a test has none.
- An acceptance payload is read into a ledger: per check and platform, the standing verdict and any invalidation, and the history newest first with who recorded each event. A payload whose `schema_version` is not 4, or with no `view.tiers` or no `view.history`, gives no ledger and a reason. A malformed event is dropped and the others are kept.
- An acceptance check with a ledger entry gives the mark, date, author, method and platform, and names the acceptance ledger as its source.
- An acceptance check with no entry gives exactly "not walked: no verdict is recorded".
- An invalidated check gives the change, the date and the verdict before it. It is never returned as a standing verdict.
- With a reason in place of a ledger, every acceptance check gives "the acceptance record could not be read" and that reason, and none gives "not walked". With no ledger platforms, every acceptance check gives "this workspace keeps no acceptance ledger".
- A test with a command below acceptance level gives exactly "run by a command; its result is not recorded anywhere Deck can read", with no verdict and no date. An acceptance check with a command gives its ledger result and that sentence.
- A manual test below acceptance level gives its status and last-verified date and names the test note as its source. At 91 days it is stale and carries "stale: a manual verification goes stale after 90 days". At 90 days it is not. With no date it gives "no date of verification is recorded on the test note".
- A note with no verifying test gives "no test names this note", whatever its status. The function has no status, feature or task among its inputs.
- A result made from a note's status carries no mark, and a result made from the ledger does not carry the note's status as its verdict.
- The tests named on a criterion line are the test notes that line links, in the order written. A line that links none gives none.
- A row's `stale` field from the sidecar changes nothing.

## Evidence (fill after running)

- None recorded. Nothing this note describes is committed on 2026-10-02, and the suite has not been run for this note.

## Adequacy (who verifies this test?)

- To be recorded by TASK-0111: each rule above broken once in the module, with the test that failed.
