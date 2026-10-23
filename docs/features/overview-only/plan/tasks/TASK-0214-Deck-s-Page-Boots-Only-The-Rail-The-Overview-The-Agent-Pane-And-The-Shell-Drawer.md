---
type: "[[task]]"
id: TASK-0214
aliases: ["TASK-0214"]
title: "Deck's page boots only the rail, the overview, the agent pane and the shell drawer"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["Edwin 2026-10-23: 'tag and remove; park Vault too'"]
parent: "[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"
effort: M
due: ""
depends: ["[[TASK-0213]]"]
blocks: []
related: ["[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]"]
tests: ["[[TST-0109]]"]
---

# The page boots only the overview

**After this task the window shows the overview and nothing under it.** There is no view switcher, no surface toggle, and no Spread or Glass beneath the overview.

## Definition of Done
- [x] The renderer starts the workspace rail, the overview, the agent pane and the shell drawer, and nothing else. The overview is always shown.
- [x] Nothing draws or wires desks, scenes, pop-out panels, following another window, the navigator, cards, Glass or the orbit.
- [x] `index.html` and `deck.css` hold no element or rule that only removed code used.
- [x] An address naming a removed view, desk or panel opens the overview with one line saying that view is not in this Deck.
- [x] The node suites of renderer modules removed here are removed in the same commit, and `npm test` passes.

## Steps
- [x] Read `desktop/src/renderer/renderer.ts` and list what each part boots; cut it down to the four parts that stay.
- [x] Remove the renderer modules only Spread, Glass and the orbit use, and the shared modules only they import.
- [x] Cut `index.html` and `deck.css` to match.

## Notes
Candidates from a first reading, to confirm against the code: `glass.ts`, `cards.ts`, `navigator.ts`, `collection-view.ts`, `link-lines.ts` in the renderer; `description.ts`, `query.ts`, `expression.ts`, `base-file.ts`, `faces.ts`, `field.ts`, `slots.ts`, `desk.ts`, `scenes.ts`, `handoff.ts`, `throw.ts`, `zoom.ts`, `focus-ring.ts`, `arrange.ts`, `collection.ts`, `evidence.ts`, `search.ts`, `views.ts`, `orbit.ts`, `neighbourhood.ts`, `relations.ts`, `detail.ts`, `panels.ts` in shared. `shared/graph.ts` imports `views.ts`, and the overview model imports `graph.ts`, so that link is cut rather than removed.

## Verification

- 2026-10-23: `renderer.ts` went from 3,269 lines to about 280. It boots the rail, the overview, the agent pane and the shell drawer. The overview is always shown, and the name in the header opens the current workspace's wheel. An address that is not an overview screen opens that workspace's wheel and says, in the status line, which part of it (a desk, a note in a view, a popped-out panel, a surface or a view) is not in this Deck.
- Removed from the page: `glass.ts`, `cards.ts`, `navigator.ts`, `collection-view.ts` and `link-lines.ts`, and the fourteen shared modules only they imported (`arrange`, `base-file`, `desk`, `evidence`, `expression`, `faces`, `field`, `focus-ring`, `neighbourhood`, `query`, `relations`, `rows`, `search`, `zoom`). Which modules nothing reaches was worked out from the import graph of `renderer.ts`, `terminal-frame.ts`, `main.ts` and `preload.ts`. Modules the main process still reaches stay for [[TASK-0215]].
- `index.html` holds the header, the rail, the overview's area, the status line and the name Deck writes with. `deck.css` went from 1,744 lines to 340. A rule was kept only if every class and id it names is set by code that stays, read with comments stripped.
- Nineteen node suites that tested removed modules are removed, and their test notes are retired: TST-0004, 0016, 0017, 0018, 0019, 0030, 0031, 0032, 0040, 0041, 0042, 0044, 0050, 0051, 0053, 0054, 0055, 0066, 0067, 0070 and 0078. `views.test.mjs` lost its check that the page names no view, since the page has no views. TST-0014's last check now reads the session pane's rule rather than the card's.
- `npm test`: 653 checks, all passing.
- Not yet seen in a window. The container smoke still drives Spread and Glass, so it is rewritten in [[TASK-0216]], and the window run happens there, before anything is pushed ([[RISK-0018]]).
