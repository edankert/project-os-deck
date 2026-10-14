---
type: "[[task]]"
id: TASK-0115
title: "Build one overview from the notes"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
parent: "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[DES-0004-The-Phase-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
tests: ["[[TST-0080-The-Overview-Classifies-And-Places-Every-Ticket]]"]
---

# Build one overview from the notes

## Definition of Done

- [x] `buildOverview(records, options)` returns the fixed `OverviewModel` contract without changing either contract file.
- [x] Every row of DES-0004’s state table and every placement rule has a focused test.
- [x] Phases separate into open, finished and backlog groups; phase tickets sort by kind and `STATE_ORDER`.
- [x] Injected `readBody(relPath)` supplies exit checkboxes or prose without filesystem work inside the builder.
- [x] Wikilinks and dates produce suggestions only when the documented rules identify a phase.
- [x] `bash tools/scripts/run-desktop-tests.sh overview-model` passes with a dated count in Evidence.

## Steps

- [x] Build classification, ordered placement and one-place membership from indexed records.
- [x] Parse phase exit criteria and derive links and suggestions without changing the inputs.
- [x] Cover each rule, its precedence and ambiguous inputs in `desktop/tests/overview-model.test.mjs`.

## Notes

Acceptance tests use note status because the index does not carry the release ledger. Reading that ledger would require a separate history and platform reduction. Document this fallback beside the classification. Automated active or passing tests use the status approximation unless the caller supplies contrary CI evidence.

The 2026-10-14 run stays on `lane/codex`. Claude merges and reviews; Codex does not push, merge, or open windows. Implementation is complete with the node evidence below. Git staging and commits are blocked by the sandbox refusing the shared worktree index lock.

## Evidence

2026-10-14: `bash tools/scripts/run-desktop-tests.sh overview-model` passed 16 tests with zero failures and 0 skipped. No window opened. Git could not create `/Users/Edwin/Dev/repos/project-os-deck/.git/worktrees/project-os-deck-codex/index.lock`, so no local commit is claimed.
