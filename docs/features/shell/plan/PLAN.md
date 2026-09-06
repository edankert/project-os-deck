---
type: "[[plan]]"
title: "Plan — deck opens a workspace"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
implements: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
related: ["[[PHASE-0001-Deck]]"]
---

# Plan — deck opens a workspace

## Delivery sequence

1. **[[TASK-0006-The-Application-Builds-And-Boots]]** — `npm start` in `desktop/` compiles the TypeScript once and opens a Deck window that draws its own markup. Nothing talks to a sidecar yet.
2. **[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]** — Opening a workspace starts one sidecar process for it and hands the renderer the base URL to read from. Quitting Deck stops every sidecar it started.
3. **[[TASK-0008-Workspaces-Are-Found-And-Remembered]]** — Deck lists the workspaces it knows, recognises a project-os repository by its `SNAPSHOT.yaml`, and remembers what a person added.
4. **[[TASK-0009-A-Typed-Read-Only-Client-Over-The-Sidecar]]** — One module holds every request Deck makes to the sidecar, typed, with the payload shapes Deck depends on written down.

## Dependencies

- **Hard:** the tasks above run in the order listed; each one's output is the next one's input.
- **Soft:** [[FEAT-0002-Deck-Opens-A-Workspace]] lands first of all the features, because everything else needs a window and a sidecar to read from.

## Open questions

- None open. What was open is recorded in the feature's Scope section as a decision.
