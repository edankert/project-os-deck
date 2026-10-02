---
type: "[[task]]"
id: TASK-0111
title: "Work out a note's evidence without a window"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"]
parent: "[[FEAT-0024-Evidence-Stands-Beside-The-Claim-It-Supports]]"
effort: M
due: ""
depends: []
blocks: ["[[TASK-0113-Show-Evidence-Beside-The-Claim-In-The-Glass-Document]]"]
related: ["[[REQ-0006-Evidence-Beside-A-Claim-Names-Its-Source-And-Says-What-Is-Missing]]", "[[ADR-0008-Evidence-Is-Read-From-Three-Sources-And-What-Is-Not-Recorded-Is-Said]]", "[[RISK-0008-The-Evidence-Panel-Misreports-A-Verdict-When-The-Acceptance-Payload-Changes]]"]
tests: ["[[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]]"]
---

# Work out a note's evidence without a window

One pure module decides what the evidence panel may say, with no window and no request involved. It is handed Deck's records and edges, an acceptance payload or the reason there is none, and today's date. It returns rows and sentences. Everything in this task is checked by `desktop/tests/evidence.test.mjs`. The rules are ADR-0008, parts A to E.

## Definition of Done

- [x] `desktop/src/shared/evidence.ts` exists, imports nothing from the renderer or the main process, and makes no request.
- [x] Given a note's id, the records and the graph's edges, the module returns the test notes that verify it and the key each was found under. The keys are exactly four: `covers` on a test naming the note, `tasks` on a test naming the note, `tests` on the note naming a test, `verifies` on the note naming a test. A link under `related`, `source`, `parent`, `phase` or in a note's text returns nothing. A target that is not a test note returns nothing.
- [x] A bare id under one of the four keys counts the same as a wikilink. `covers` and `tasks` are not in the graph's `LINK_BEARING_FIELDS`, so a bare id under them makes no edge; the module reads the record's frontmatter for those two keys as well as the edges. A test found by both routes is returned once.
- [x] For a test note the module returns its own facts from frontmatter and nothing else: `status`, `level`, `command`, `last_verified`, `artifacts`, `review_verdict`. A note that is not a test returns none.
- [x] The module reads an acceptance payload into a ledger: per check id and platform, the standing verdict (mark, date, reason, method) from the row, and the history newest first with who recorded each event. An invalidation is read from the history and not from the row, whose `invalidated_by` is the test note's own frontmatter (ADR-0008 A2, changed 2026-10-02). It reads `schema_version` and `ledger_platforms` from the body. A payload whose `schema_version` is not 4, or that lacks `view.tiers` or `view.history`, returns no ledger and a reason. A malformed event is dropped and the rest are kept.
- [x] For a test at `level: acceptance` with a ledger entry, the result holds the mark, date, author, method and platform, and names its source as the acceptance ledger. The author comes from the newest history event that matches the standing verdict, because the row carries none.
- [x] For an acceptance check with no entry, the sentence is exactly "not walked: no verdict is recorded".
- [x] For an invalidated check, the result says it is invalidated, by which change and on which date, and holds the verdict before it from the history. It is not a standing verdict, and no function returns it as one.
- [x] When the module is handed a reason in place of a ledger, every acceptance check reads "the acceptance record could not be read" with that reason. No such check reads "not walked". When `ledger_platforms` is empty, every acceptance check reads "this workspace keeps no acceptance ledger".
- [x] For a test with a `command:` below acceptance level, the sentence is exactly "run by a command; its result is not recorded anywhere Deck can read", and the result holds no verdict and no date. An acceptance check that has a command gets its ledger result and this sentence as well.
- [x] For a manual test below acceptance level, the result holds the note's `status` and `last_verified` and names its source as the test note. With `last_verified` more than 90 days before the date handed in, it is stale and carries "stale: a manual verification goes stale after 90 days". At exactly 90 days it is not stale, which is the validator's `>` in `is_stale`. With no `last_verified` it reads "no date of verification is recorded on the test note". The number of days is one named constant.
- [x] A note with no verifying test returns the sentence "no test names this note". The function that produces it takes no status, no feature and no task as input, so it cannot infer from one.
- [x] No result type has a field that holds both a verdict and a status. The test asserts that a result made from a note's status never carries a mark, and a result made from the ledger never carries the note's status as its verdict.
- [x] Given the ids linked on one criterion line and a way to tell a test note, the module returns the tests named on that line, in the order written, and nothing for a line that links none.
- [x] The sidecar's `stale` field on a row is not read. The test hands in a row with `stale: true` and a fresh result and asserts nothing changes.
- [x] `bash tools/scripts/run-desktop-tests.sh evidence` passes and `npm test` in `desktop/` passes.

## Steps

- [x] Read ADR-0008 parts A to E, REQ-0006 and `tools/instructions/STATUSES.md`, `[[test]]` and "Two things that are not statuses".
- [x] Read how an edge carries its key in `desktop/src/shared/graph.ts` (`field`, `LINK_BEARING_FIELDS`) and what a record carries in `desktop/src/shared/records.ts`.
- [x] Write `desktop/src/shared/evidence.ts`.
- [x] Write `desktop/tests/evidence.test.mjs`, one focused test per line of the definition of done. Use the fixture TASK-0112 records for the payload cases, or a hand-written payload of the same shape until it exists.
- [x] Commit the suite and [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]] together. The note's `command:` names the suite, and `python3 tools/scripts/run-tests.py` reports a note whose suite does not exist as failing (ISS-0028).
- [x] Break each rule once and confirm a test fails, and record what was broken in TST-0078's `adequacy:`.

## Notes

Built on 2026-10-02 and committed in `1a71001`. `desktop/src/shared/evidence.ts` imports one type and nothing else, and the suite reads the source to hold it to that. `bash tools/scripts/run-desktop-tests.sh evidence` passes (18 tests), and `npm test` in `desktop/` passes (586 tests).

Two things differ from this note as first written, and both are recorded in ADR-0008 with the reason.

- **An invalidation is read from the history, not from the row.** The row's `invalidated_by` is the test note's own frontmatter, not the ledger's word. The walk on `your-trainer` found it.
- **A retired test has a result of its own**, "retired: it is no longer performed", and consults neither the ledger nor a date.

Each rule was broken once in the module and the suite run. The result is in [[TST-0078-Evidence-Says-What-Is-Recorded-And-Names-What-Is-Not]] under Adequacy.

A workspace's own `verification.staleness_days` is not read. ADR-0008 lists it as an open thread, and the label states the number of days applied.

