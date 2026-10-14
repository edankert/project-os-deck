---
type: "[[task]]"
id: TASK-0125
title: "The overview contracts, and the wheel drawn as a scene"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"]
parent: "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
effort: M
due: ""
depends: []
blocks: []
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
tests: []
---

# The overview contracts, and the wheel drawn as a scene

The two files both lanes code against are written: the model's shape (`overview-types.ts`) and a screen described as data (`overview-scene.ts`). The wheel, S1, is a pure function from the model to a scene, so it can be drawn and checked without a window.

## Definition of Done
- [ ] `desktop/src/shared/overview-types.ts` and `desktop/src/shared/overview-scene.ts` exist and type-check.
- [ ] `wheelScene(model)` draws one wedge per ticket for every open phase and the core, the shelf discs and the backlog tray.
- [ ] A node suite checks on both fixtures that every ticket is drawn exactly once and that the wheel passes the screen checks.

## Notes
Drawing lane (Claude), PHASE-0005.
