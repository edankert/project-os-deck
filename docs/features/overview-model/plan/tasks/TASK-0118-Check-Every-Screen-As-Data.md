---
type: "[[task]]"
id: TASK-0118
title: "Check every screen as data"
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
tests: ["[[TST-0083-Screen-Checks-Refuse-Text-And-Missing-Marks]]"]
---

# Check every screen as data

## Definition of Done

- [x] `checkScene(scene, options)` returns one `{ rule, ok, detail }` result for words, numbers, address and twin.
- [x] Words at rest total at most 60 after excluding role `id` and ticket-id tokens.
- [x] The module documents a strict count-text rule and requires each count to reference a mark with a count.
- [x] Every scene address parses and formats to the same string with the requested page and flow kinds registered.
- [x] Dotted flow steps such as `android.3` round-trip without relaxing unrelated grammar checks.
- [x] Mark ticket IDs equal list-row ticket IDs, and every mark action has a row with that action.
- [x] `bash tools/scripts/run-desktop-tests.sh overview-checks` passes for good scenes and rejects deliberate defects.

## Steps

- [x] Register wheel, phase, ticket and rephase pages, and design, test-run and accept flows.
- [x] Extend the step grammar only as needed for the brief’s platform-section addresses.
- [x] Implement checks over the fixed scene contract and test nested nodes, ids, counts and actions.
- [x] Use a deliberately text-heavy scene plus independent defects for number, address and twin checks.

## Notes

Phase numbers and ticket IDs are identifiers, not counts. Keep the exact count rule in the module and prove its exceptions with tests. This task does not draw any screen.

The 2026-10-14 run stays on `lane/codex`. Claude merges and reviews; Codex does not push, merge, or open windows. Implementation is complete with the node evidence below. Git staging and commits are blocked by the sandbox refusing the shared worktree index lock.

## Evidence

2026-10-14: `bash tools/scripts/run-desktop-tests.sh overview-checks` passed 8 tests with zero failures and 0 skipped. No window opened. Git could not create `/Users/Edwin/Dev/repos/project-os-deck/.git/worktrees/project-os-deck-codex/index.lock`, so no local commit is claimed.
