---
type: "[[plan]]"
title: "Plan for FEAT-0036: Deck opens only on the overview"
status: active
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"]
implements: ["[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"]
related: ["[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]", "[[PHASE-0005-Overview]]"]
---

# Plan for FEAT-0036

Five tasks, at least one commit each. Each code commit removes the node suites of the code it removes, so `npm test` passes at every commit. The code tasks will be refined as the code is read.

## Delivery sequence

1. [[TASK-0213]] The tag, the branch, and the parked notes. The tag and the branch exist locally already; this pushes them and finishes the notes.
2. [[TASK-0214]] The page: the renderer boots only the rail, the overview, the agent pane and the shell drawer.
3. [[TASK-0215]] The main process and the store: what only Spread, Glass and the orbit used is removed.
4. [[TASK-0216]] The tests: the smoke run checks the overview, and the test notes of removed code are retired.
5. [[TASK-0217]] The written description: the README files, CLAUDE.md and the adoption table describe Deck as the overview.

## Dependencies

- **Hard:** TASK-0213 first, because the tag must be on origin before anything is removed. TASK-0214 before TASK-0215, so the page stops calling a channel before the main process drops it.
- **Soft:** TASK-0216 runs the container smoke after TASK-0215 ([[RISK-0018]]). TASK-0217 last, so it describes what was built.

## Open questions

- Does Deck still open a second main window? Today [[TST-0012]] checks that two windows show the same state. The default taken: one window, plus the served page for a tablet, and the store keeps broadcasting so the served page follows.
