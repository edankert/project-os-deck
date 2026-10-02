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
- An acceptance payload is read into a ledger: per check and platform, the standing verdict, and the history newest first with who recorded each event. An invalidation is read from the history; a row's own `invalidated_by`, which is the test note's frontmatter, is not read. A payload whose `schema_version` is not 4, or with no `view.tiers` or no `view.history`, gives no ledger and a reason. A malformed event is dropped and the others are kept.
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
- A retired test gives "retired: it is no longer performed" and nothing from the ledger.
- The answer recorded from a real sidecar (`desktop/fixtures/acceptance/app.json`) still reads as it did on the day it was recorded.

## Evidence (fill after running)

- 2026-10-02, at `e86b2e4`: `bash tools/scripts/run-desktop-tests.sh evidence` passes, 18 tests. `npm test` in `desktop/` passes, 589 tests.
- The last test reads `desktop/fixtures/acceptance/app.json`, the sidecar's own answer recorded from this repository on 2026-10-02 (cockpit at `d1df13c`). It holds the reading to what that answer held: 21 checks, 4 `pass`, 1 `question` and 16 with no standing verdict, 14 events, and of the 21 checks 5 with a verdict, 14 never walked and 2 invalidated. A verdict's author is found for every one of the five.
- This note has a `command:`, so it records no verdict of its own and rests at `active`. CI is where a run's result is.

## Adequacy (who verifies this test?)

Each rule was broken once in `desktop/src/shared/evidence.ts` on 2026-10-02, the application rebuilt and this suite run. A line reads: what was broken, then the test that failed. The file was restored from the commit after each one.

- a link under any key counts, not only the four **Caught by:** the tests that name a note are found under four keys and no other
- a target that is not a test note counts **Caught by:** the tests that name a note are found under four keys and no other
- a bare id under covers: or tasks: is not read **Caught by:** a bare id under a key counts the same as a wikilink, and a test found both ways is returned once
- an id is matched by its beginning, so FEAT-00200 names FEAT-0020 **Caught by:** a bare id under a key counts the same as a wikilink, and a test found both ways is returned once
- a payload of another schema is read anyway **Caught by:** a payload Deck was not written against is not read at all, and says why
- a payload with no view.tiers is read anyway **Caught by:** a payload Deck was not written against is not read at all, and says why
- another platform's event is kept **Caught by:** the acceptance payload is read into a ledger: the standing verdict, the invalidation, and the history newest first
- the history is oldest first **Caught by:** an invalidated check has no standing verdict; the one before it is said to stand no longer; the acceptance payload is read into a ledger: the standing verdict, the invalidation, and the history newest first; the payload recorded from a real sidecar still reads as it did when it was recorded
- a row marked todo is taken for a verdict **Caught by:** a check nobody walked says exactly that, whatever its note's status; an invalidated check has no standing verdict; the one before it is said to stand no longer; each platform's verdict is its own; the payload recorded from a real sidecar still reads as it did when it was recorded
- an invalidated check reads as not walked **Caught by:** an invalidated check has no standing verdict; the one before it is said to stand no longer; the payload recorded from a real sidecar still reads as it did when it was recorded
- who recorded the verdict is taken from the oldest event **Caught by:** an acceptance check has the ledger's verdict, with who recorded it taken from the history
- a record that could not be read says "not walked" **Caught by:** a record that could not be read is not an empty one, and a workspace with no ledger says so
- a workspace with no ledger says "not walked" **Caught by:** a record that could not be read is not an empty one, and a workspace with no ledger says so
- a test with a command shows its note's status and date **Caught by:** a test with a command has no result Deck can read: no verdict, no date, no colour
- a manual test is stale at ninety days, not after **Caught by:** a manual test has its own note's status and date, and goes stale after ninety days, not at ninety
- a manual test with no date is not said to have none **Caught by:** a manual test has its own note's status and date, and goes stale after ninety days, not at ninety
- a retired test is treated as a live one **Caught by:** a manual test has its own note's status and date, and goes stale after ninety days, not at ninety
- a verdict that holds a check open looks like one that settles it **Caught by:** an acceptance check has the ledger's verdict, with who recorded it taken from the history
- the words for a check nobody walked are changed **Caught by:** a check nobody walked says exactly that, whatever its note's status
- the words for a test run by a command are changed **Caught by:** a test with a command has no result Deck can read: no verdict, no date, no colour
- an invalidated verdict is labelled as settled **Caught by:** an invalidated check has no standing verdict; the one before it is said to stand no longer
- a test named twice on a line is listed twice **Caught by:** the tests named on a criterion's own line are that line's, in the order written
- a note that is not a test has facts **Caught by:** a test's facts are six things from its own frontmatter, and a note that is not a test has none
- the count for no test reads as a number **Caught by:** a note no test names says so, from a count and nothing else

Not broken, because no single line holds the rule: that the module makes no request and imports nothing from a window (a test reads the source for it), and that the sidecar's own `stale` field is not read (no line reads it; a test hands in a row carrying it and expects the same result).

