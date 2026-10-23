---
type: "[[task]]"
id: TASK-0215
aliases: ["TASK-0215"]
title: "The main process and the store keep nothing that only Spread, Glass and the orbit used"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["Edwin 2026-10-23: 'tag and remove; park Vault too'"]
parent: "[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"
effort: M
due: ""
depends: ["[[TASK-0214]]"]
blocks: []
related: ["[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]"]
tests: ["[[TST-0109]]"]
---

# The main process keeps only what the overview uses

**After this task Deck's main process opens one window on the overview and knows nothing of satellites, throws or the orbit.**

## Definition of Done
- [ ] No satellite windows or pop-out panels, no throwing or handing a note between windows, no orbit worker or layout, no measuring run, no Glass smoke checks.
- [ ] `npm run measure` is gone from `package.json`.
- [ ] The store drops the state only those used, and a state file written before this task opens with no error and keeps its workspaces.
- [ ] The node suites of modules removed here are removed in the same commit, and `npm test` passes.

## Steps
- [ ] Remove the IPC channels the page stopped calling in [[TASK-0214]].
- [ ] Cut `store-state.ts` and its reader; add a test that an old state file still loads.

## Notes
Candidates, to confirm: `orbit-worker.ts`, `measure.ts`, `smoke-glass.ts`, `window-book.ts` and `window-placement.ts` (satellite parts), `drive.ts` (its Glass parts), `graph-service.ts` if only the orbit reads it.
