---
type: "[[task]]"
id: TASK-0126
title: "Deck opens on the wheel"
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

# Deck opens on the wheel

The wheel becomes a page in Deck. An address with no page opens it, a sector opens its phase, and the pointer and the keyboard both reach every mark.

## Definition of Done
- [x] `page=wheel` is registered and Deck opens on it.
- [x] Hover shows a callout, keyboard focus reaches every sector and disc, the list twin is one key away.
- [x] The served host shows the wheel read-only.

## Notes
2026-10-14: built in `eab145d`, `a472bdf` and `99eeeab`. TST-0093's window run passed on Deck and your-trainer: Deck opens on the wheel, every mark drawn, keyboard and list twin working, the served page read-only.

Drawing lane (Claude), PHASE-0005.
