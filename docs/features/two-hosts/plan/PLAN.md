---
type: "[[plan]]"
title: "Plan — one renderer, two hosts"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0008-One-Renderer-Two-Hosts]]"]
implements: ["[[FEAT-0008-One-Renderer-Two-Hosts]]"]
related: ["[[PHASE-0001-Deck]]"]
---

# Plan — one renderer, two hosts

## Delivery sequence

1. **[[TASK-0021-Decks-Own-Read-Only-Host]]** — A small HTTP host inside Deck's main process serves the renderer bundle and proxies reads to the workspace's sidecar. Anything that is not a `GET` or `HEAD` is refused before it reaches the sidecar.
2. **[[TASK-0022-Capability-Is-Detected-Not-Assumed]]** — The renderer asks the bridge which capabilities the host offers, and renders accordingly. Served over the network, the shell-only actions are not there.

## Dependencies

- **Hard:** the tasks above run in the order listed; each one's output is the next one's input.
- **Soft:** [[FEAT-0002-Deck-Opens-A-Workspace]] lands first of all the features, because everything else needs a window and a sidecar to read from.

## Open questions

- None open. What was open is recorded in the feature's Scope section as a decision.
