---
type: "[[task]]"
id: TASK-0140
title: "Fix the overview review findings"
status: doing
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

- [ ] The host and command read the acceptance ledgers, including withdrawn passes and every platform.
- [ ] Each displayed count needs its own mark, id text is validated, words exclude only real ids, and addresses name their screens.
- [ ] Tests distinguish feature-only parents, non-ticket parents, member-list ties, local heading links and phase order in all three groups.
- [ ] Both fixtures are rebuilt with source head and note-tree dirty state.
- [ ] The full desktop suite passes with no skips and documentation validation passes.
- [ ] FEAT-0026 stays at review with commit evidence for Claude.

## Steps

- [ ] Add regression tests before changing the affected behavior.
- [ ] Read ledgers with the release-test and cockpit ordering and expiry rules.
- [ ] Fix the checks and model, rebuild fixtures, and record results in FEAT-0026.

## Notes

This is one bounded repair task for defects in FEAT-0026, not a new issue or feature. The request names observable failures and the five existing suites verify the result. No specification decision is missing. The sole agreed contract addition is optional `OverviewModel.dirty`, approved by Claude on 2026-10-14. Existing phase and screen contracts otherwise hold. No new dependency, environment setting, storage layout, long-running process or credential exposure is introduced.

Work stays on `lane/codex-fix`. FEAT-0029's files are excluded. Your Trainer and the cockpit are read only. No Electron run, push or merge is part of this task.

## Evidence

Pending the regression runs and full suite.
