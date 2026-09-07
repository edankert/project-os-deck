---
type: "[[plan]]"
title: "Plan — one store in the main process"
status: done
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[FEAT-0003-One-Store-In-The-Main-Process]]"]
implements: ["[[FEAT-0003-One-Store-In-The-Main-Process]]"]
related: ["[[PHASE-0001-Deck]]"]
---

# Plan — one store in the main process

## Delivery sequence

1. **[[TASK-0010-The-Store-Holds-The-State-And-Broadcasts-It]]** — One state record lives in the main process. A window subscribes at start, receives the current state immediately, and is sent the new state whenever it changes.
2. **[[TASK-0011-The-State-Survives-A-Restart]]** — Deck reopens where it was left. The state file is written atomically after changes settle and read once at launch.

## Dependencies

- **Hard:** the tasks above run in the order listed; each one's output is the next one's input.
- **Soft:** [[FEAT-0002-Deck-Opens-A-Workspace]] lands first of all the features, because everything else needs a window and a sidecar to read from.

## Open questions

- None open. What was open is recorded in the feature's Scope section as a decision.
