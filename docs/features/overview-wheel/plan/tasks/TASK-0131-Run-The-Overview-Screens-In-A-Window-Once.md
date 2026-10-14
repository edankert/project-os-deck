---
type: "[[task]]"
id: TASK-0131
title: "Run the overview screens in a window once"
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
tests: ["[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]"]
---

# Run the overview screens in a window once

One batched window run drives every overview screen on Deck and your-trainer, checks each screen's address restores it and records what it found.

## Definition of Done
- [x] Every screen S1 to S7 is opened from its address on both workspaces and its marks are counted in the real window.
- [x] The run is recorded with its date and result.

## Notes
2026-10-14: TST-0093 passed on both workspaces after its first run found two defects, fixed in `99eeeab`.

Drawing lane (Claude), PHASE-0005.
