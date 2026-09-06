---
type: "[[plan]]"
title: "Plan — every state has an address"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
implements: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
related: ["[[PHASE-0001-Deck]]"]
---

# Plan — every state has an address

## Delivery sequence

1. **[[TASK-0017-The-Address-Grammar]]** — One module formats Deck's state as an address and parses an address back into state, refusing what it cannot read.
2. **[[TASK-0018-Copy-The-Address-And-Open-One]]** — A person copies Deck's current address to the clipboard and pastes one in to go there.

## Dependencies

- **Hard:** the tasks above run in the order listed; each one's output is the next one's input.
- **Soft:** [[FEAT-0002-Deck-Opens-A-Workspace]] lands first of all the features, because everything else needs a window and a sidecar to read from.

## Open questions

- None open. What was open is recorded in the feature's Scope section as a decision.
