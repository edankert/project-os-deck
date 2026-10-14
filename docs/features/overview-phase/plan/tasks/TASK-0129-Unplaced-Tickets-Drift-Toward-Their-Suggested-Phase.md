---
type: "[[task]]"
id: TASK-0129
title: "Unplaced tickets drift toward their suggested phase"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
parent: "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"
effort: M
due: ""
depends: []
blocks: []
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
tests: []
---

# Unplaced tickets drift toward their suggested phase

S4: tickets with no phase as particles in the core, a line to each suggested sector, and accepting a group moving them on screen only. An issue is filed in the cockpit asking for a sidecar action that sets `phase:`.

## Definition of Done
- [ ] `rephaseScene(model)` passes the screen checks on both fixtures.
- [ ] Accepting a group moves its particles and writes nothing.
- [ ] The cockpit issue exists and is linked here.

## Notes
Drawing lane (Claude), PHASE-0005.
