---
type: "[[task]]"
id: TASK-0166
title: "The wheel is towers on a ring, laid out by a pure function of the model: every ticket once, the focus lit, the exit band, the caps, and a list twin"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16, after turning DES-0005-towers.html: 'I like the design page, please implement as suggested. However can you please come up with a different design for the exit criteria? Also, what is the red rectangle on-top of the tower, I assume this highlights issues that \"needs me\", should this be selectable?'"]
parent: "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
effort: L
due: ""
depends: ["[[TASK-0164]]", "[[TASK-0165]]"]
blocks: ["[[TASK-0167]]", "[[TASK-0168]]"]
related: ["[[TASK-0163]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]"]
---

# The wheel is towers on a ring, laid out from the model

**The wheel screen (S1) is now the towers of DES-0005's design page, and where everything stands is worked out by one pure function of the model, `desktop/src/shared/overview-towers.ts`.** The renderer draws that layout in 3D (TASK-0167); the node checks, the list twin and the plates read the same layout, so they cannot disagree with what is drawn.

## Definition of Done

- [x] The layout places every ticket of the model exactly once: a tower's foot or floor, a flat tile of its phase, a block on the shelf of finished phases, or a tile of the core. A tower holds its feature's tickets, done at the bottom and what needs you on top, two to a floor.
- [x] Each phase of the ring has its level (planned, active, focus), its counts, its exit band and its address; each tower its red cap when something in it needs you, with the cap's target; the focus feature and the next ticket are marked.
- [x] The scene's list twin holds every phase, tower, cap and ticket with its address, so the keyboard and a screen reader reach all of it. The words at rest stay within sixty on both workspaces.
- [x] The scene also draws as a flat plan in SVG, from above, for the plates and for a window without WebGL.
- [x] TST-0090 checks every ticket once, the levels, the caps and their targets, the focus and next marks, the band against the phase's criteria, and the words on both fixtures. The constellation's code that nothing draws any more is removed.

## Verification

`desktop/src/shared/overview-towers.ts` lays out the towers (`towersLayout`) and draws them flat (`towersPlan`); `wheelScene` in `desktop/src/shared/overview-wheel.ts` is now that layout, its flat plan, the two ways in and a `towers` node for the 3D view. The constellation's code is gone. On both fixtures the wheel passes the look's checks (22 and 52 words at rest), draws all 395 and 2,747 tickets once, and its list twin matches. TST-0090's new towers check works out from the model's own fields: every ticket once, the ring and the shelf, each phase's level, one tower per feature with its own tickets as floors, what needs you on top, each cap's tickets and target and its row in the twin, the focus tower and its pulsing tasks, flat tiles only for unclaimed tickets, the next ticket, the collar against the criteria, and no two cubes in one place; a ring of twelve phases, 180 features and 10,800 tickets places every ticket in its own place. 788 node tests pass.
