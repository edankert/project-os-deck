---
type: "[[task]]"
id: TASK-0215
aliases: ["TASK-0215"]
title: "The main process and the store keep nothing that only Spread, Glass and the orbit used"
status: done
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
- [x] No satellite windows or pop-out panels, no throwing or handing a note between windows, no orbit worker or layout, no measuring run, no Glass smoke checks.
- [x] `npm run measure` is gone from `package.json`.
- [x] The store drops the state only those used, and a state file written before this task opens with no error and keeps its workspaces.
- [x] The node suites of modules removed here are removed in the same commit, and `npm test` passes.

## Steps
- [x] Remove the IPC channels the page stopped calling in [[TASK-0214]].
- [x] Cut `store-state.ts` and its reader; add a test that an old state file still loads.

## Notes
Candidates, to confirm: `orbit-worker.ts`, `measure.ts`, `smoke-glass.ts`, `window-book.ts` and `window-placement.ts` (satellite parts), `drive.ts` (its Glass parts), `graph-service.ts` if only the orbit reads it.

## Verification

- 2026-10-23: `main.ts` went from 2,725 lines to 1,131. Deck has one kind of window, opened at an address or at the overview, and keeps its geometry under the key the main window always had. Gone: satellite windows, pop-out panels and the book that reopened them, throwing and handing a note between windows with its six IPC channels, the orbit's graph service and worker, the measuring run (`--measure`, `npm run measure`) and the host's extra reads that served the graph.
- Removed modules: `graph-service`, `orbit-worker`, `measure`, `smoke-glass` in the main process; `handoff`, `throw`, `scenes`, `collection`, `panes`, `slots`, `orbit`, `detail`, `views` and `description` in shared. The walk driver's pointer and keyboard helpers moved from `smoke-glass.ts` to `input.ts` unchanged. The import graph from the four entry points now reaches every source file.
- The store holds the workspace, the name Deck writes with, the revision and the index revisions. `normaliseState` reads those and passes over everything else, so a state file an older Deck wrote opens with its workspace and its name; TST-0002 checks that with a file in the old shape. The tablet keeps only its own workspace. The pop-out capability is gone.
- The smoke run was rewritten in this task, because it was built on the removed modules. Its checks are the workspace and Deck's index, the overview drawn in the window with nothing of Spread or Glass in the page, an old Spread address opening the wheel and saying so, the capabilities, the navigation guard, the served page, a script in a note, the routes over the network and the quit. [[TASK-0216]] runs it in the container.
- Eight node suites of removed code are removed and their notes retired: TST-0006, 0043, 0047, 0049, 0057, 0065, 0074 and 0075. The store, served-state, panel-registry, host and sidecar-client suites were updated, and their notes say how.
- `npm run typecheck` is clean, and `npm test` runs 542 checks, all passing.
