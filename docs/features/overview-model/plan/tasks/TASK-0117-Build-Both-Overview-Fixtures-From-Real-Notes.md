---
type: "[[task]]"
id: TASK-0117
title: "Build both overview fixtures from real notes"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
parent: "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"
effort: ""
due: ""
depends: ["[[TASK-0115-Build-One-Overview-From-The-Notes]]", "[[TASK-0116-Serve-And-Print-The-Overview]]"]
blocks: []
related: ["[[DES-0004-The-Phase-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
tests: ["[[TST-0082-Both-Fixtures-Keep-Every-Ticket-And-Its-Counts]]"]
---

# Build both overview fixtures from real notes

## Definition of Done

- [x] `desktop/fixtures/overview/deck.json` and `your-trainer.json` contain the builder’s output from the two repositories.
- [x] Each fixture records its source commit in `head`, and your-trainer is only read.
- [x] The feature explains differences from DES-0004’s 333 Deck tickets and 2,646 your-trainer tickets, including its 968 unplaced tickets.
- [x] Kind differences name each ticket; changes since 2026-10-08 are counted in aggregate.
- [x] `bash tools/scripts/run-desktop-tests.sh overview-fixtures` passes with both totals in Evidence.

## Steps

- [x] Regenerate the existing fixture paths from this worktree and `../your-trainer`.
- [x] Compare each fixture with DES-0004’s embedded data and record the source commits and count differences.
- [x] Assert totals, count sums and exactly-one-place membership in `desktop/tests/overview-fixtures.test.mjs`.

## Notes

Claude already supplied placeholder fixtures. Replace their contents at the same paths. Include real exit texts and links where available. A core total includes project-wide decisions, designs and risks; distinguish those from tickets left unplaced.

The 2026-10-14 run stays on `lane/codex`. Claude merges and reviews; Codex does not push, merge, or open windows. Implementation is complete with the node evidence below. Git staging and commits are blocked by the sandbox refusing the shared worktree index lock.

## Evidence

2026-10-14: `bash tools/scripts/run-desktop-tests.sh overview-fixtures` passed 3 tests with zero failures and 0 skipped. The fixtures contain 357 Deck tickets and 2,747 Your Trainer tickets. There are 1 and 987 unplaced tickets respectively. No window opened. Git could not create `/Users/Edwin/Dev/repos/project-os-deck/.git/worktrees/project-os-deck-codex/index.lock`, so no local commit is claimed.
