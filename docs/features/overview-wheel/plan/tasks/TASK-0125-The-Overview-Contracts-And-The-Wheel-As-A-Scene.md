---
type: "[[task]]"
id: TASK-0125
title: "The overview contracts, and the wheel drawn as a scene"
status: done
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
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]"]
---

# The overview contracts, and the wheel drawn as a scene

The two files both lanes code against are written: the model's shape (`overview-types.ts`) and a screen described as data (`overview-scene.ts`). The wheel, S1, is a pure function from the model to a scene, so it can be drawn and checked without a window.

## Definition of Done
- [x] `desktop/src/shared/overview-types.ts` and `desktop/src/shared/overview-scene.ts` exist and type-check.
- [x] `wheelScene(model)` draws one wedge per ticket for every open phase and the core, the shelf discs and the backlog tray.
- [x] A node suite checks on both fixtures that every ticket is drawn exactly once and that the wheel passes the screen checks.

## Notes
2026-10-14: `overview-types.ts` and `overview-scene.ts` written in `a26c070`, the wheel scene in `47e29ed`. TST-0090 passes on both workspaces; the full suite passed 737 tests on 2026-10-14.

Drawing lane (Claude), PHASE-0005.
