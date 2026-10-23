---
type: "[[task]]"
id: TASK-0214
aliases: ["TASK-0214"]
title: "Deck's page boots only the rail, the overview, the agent pane and the shell drawer"
status: backlog
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
- [ ] The renderer starts the workspace rail, the overview, the agent pane and the shell drawer, and nothing else. The overview is always shown.
- [ ] Nothing draws or wires desks, scenes, pop-out panels, following another window, the navigator, cards, Glass or the orbit.
- [ ] `index.html` and `deck.css` hold no element or rule that only removed code used.
- [ ] An address naming a removed view, desk or panel opens the overview with one line saying that view is not in this Deck.
- [ ] The node suites of renderer modules removed here are removed in the same commit, and `npm test` passes.

## Steps
- [ ] Read `desktop/src/renderer/renderer.ts` and list what each part boots; cut it down to the four parts that stay.
- [ ] Remove the renderer modules only Spread, Glass and the orbit use, and the shared modules only they import.
- [ ] Cut `index.html` and `deck.css` to match.

## Notes
Candidates from a first reading, to confirm against the code: `glass.ts`, `cards.ts`, `navigator.ts`, `collection-view.ts`, `link-lines.ts` in the renderer; `description.ts`, `query.ts`, `expression.ts`, `base-file.ts`, `faces.ts`, `field.ts`, `slots.ts`, `desk.ts`, `scenes.ts`, `handoff.ts`, `throw.ts`, `zoom.ts`, `focus-ring.ts`, `arrange.ts`, `collection.ts`, `evidence.ts`, `search.ts`, `views.ts`, `orbit.ts`, `neighbourhood.ts`, `relations.ts`, `detail.ts`, `panels.ts` in shared. `shared/graph.ts` imports `views.ts`, and the overview model imports `graph.ts`, so that link is cut rather than removed.
