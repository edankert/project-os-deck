---
type: "[[plan]]"
title: "Plan — views come from a provider"
status: done
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[FEAT-0007-Views-Come-From-A-Provider]]"]
implements: ["[[FEAT-0007-Views-Come-From-A-Provider]]"]
related: ["[[PHASE-0001-Deck]]"]
---

# Plan — views come from a provider

## Delivery sequence

1. **[[TASK-0019-The-Provider-Interface-And-The-Project-Os-Provider]]** — A provider answers which views a workspace has. The project-os provider returns the same views the cockpit's navigator shows.
2. **[[TASK-0020-The-Switcher-Draws-What-The-Provider-Returned]]** — The view switcher renders the provider's list. No view name is written in the renderer.

## Dependencies

- **Hard:** the tasks above run in the order listed; each one's output is the next one's input.
- **Soft:** [[FEAT-0002-Deck-Opens-A-Workspace]] lands first of all the features, because everything else needs a window and a sidecar to read from.

## Open questions

- None open. What was open is recorded in the feature's Scope section as a decision.
