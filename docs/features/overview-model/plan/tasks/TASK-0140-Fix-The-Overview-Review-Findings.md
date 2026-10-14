---
type: "[[task]]"
id: TASK-0140
title: "Fix the overview review findings"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin's 2026-10-14 review-fix request", "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
parent: "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"
depends: []
blocks: []
related: ["[[DES-0004-The-Phase-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
tests: ["[[TST-0080-The-Overview-Classifies-And-Places-Every-Ticket]]", "[[TST-0081-The-Overview-Route-Is-Read-Only-And-Cached]]", "[[TST-0082-Both-Fixtures-Keep-Every-Ticket-And-Its-Counts]]", "[[TST-0083-Screen-Checks-Refuse-Text-And-Missing-Marks]]"]
---

# Fix the overview review findings

The overview must show recorded acceptance results and enforce the screen rules before Claude's second review.

## Definition of Done

- [x] The host and command read the acceptance ledgers, including withdrawn passes and every platform.
- [x] Each displayed count needs its own mark, id text is validated, words exclude only real ids, and addresses name their screens.
- [x] Tests distinguish feature-only parents, non-ticket parents, member-list ties, local heading links and phase order in all three groups.
- [x] Both fixtures are rebuilt with source head and note-tree dirty state.
- [x] The full desktop suite passes with no skips and documentation validation passes.
- [x] FEAT-0026 stays at review with commit evidence for Claude.

## Steps

- [x] Add regression tests before changing the affected behavior.
- [x] Read ledgers with the release-test and cockpit ordering and expiry rules.
- [x] Fix the checks and model, rebuild fixtures, and record results in FEAT-0026.

## Notes

This is one bounded repair task for defects in FEAT-0026, not a new issue or feature. The request names observable failures and the five existing suites verify the result. No specification decision is missing. The sole agreed contract addition is optional `OverviewModel.dirty`, approved by Claude on 2026-10-14. Existing phase and screen contracts otherwise hold. No new dependency, environment setting, storage layout, long-running process or credential exposure is introduced.

Work stays on `lane/codex-fix`. FEAT-0029's files are excluded. Your Trainer and the cockpit are read only. No Electron run, push or merge is part of this task.

## Evidence

2026-10-14: `cd desktop && npm test` passed all 704 tests with no failures or skips. Its overview suites passed 58 tests: model 21, route 12, fixtures 3, checks 14 and drawing screens 8. `bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` passed.

Five new check regressions failed before repair. Deliberately breaking feature-only parents, member-list tie order and phase ordering each failed the relevant tests. The old lowercase heading-link guard failed its regression. The recorded Deck ledger failed against the original host and CLI; the new reader agrees with every surviving result from `release-test.py` on both repositories.

Commits: `5ca1405` fixes scene checks; `4abe421` fixes links and guards placement; `306e7bf` reads ledger results, records dirty provenance and removes the route skip; `a1d8876` refreshes both fixtures. FEAT-0026 stays at review for Claude's second round. No window, push or merge was run.
