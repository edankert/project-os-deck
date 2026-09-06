---
type: "[[plan]]"
title: "Plan — spread"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
implements: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
related: ["[[PHASE-0001-Deck]]"]
---

# Plan — spread

## Delivery sequence

1. **[[TASK-0015-Notes-Become-Cards]]** — A view's notes are drawn as cards rather than rows. A card shows the note's id, title, type and status band.
2. **[[TASK-0016-A-Desk-Is-Saved-And-Reopened]]** — An arrangement of cards is a desk. A desk is saved by name into Deck's store and reopens as it was left.

## Dependencies

- **Hard:** the tasks above run in the order listed; each one's output is the next one's input.
- **Soft:** [[FEAT-0002-Deck-Opens-A-Workspace]] lands first of all the features, because everything else needs a window and a sidecar to read from.

## Open questions

- None open. What was open is recorded in the feature's Scope section as a decision.
