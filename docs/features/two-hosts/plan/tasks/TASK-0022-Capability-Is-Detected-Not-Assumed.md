---
type: "[[task]]"
id: TASK-0022
aliases: ["TASK-0022"]
title: "Capability is detected, not assumed — the renderer asks its host what it can do, and shell-only capability is absent when served"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0008-One-Renderer-Two-Hosts]]"]
parent: "FEAT-0008"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0008-One-Renderer-Two-Hosts]]"]
tests: []
---

# Capability is detected, not assumed

## Objective

The renderer asks the bridge which capabilities the host offers, and renders accordingly. Served over the network, the shell-only actions are not there.

## Definition of Done

- [ ] The bridge reports a capability set, and the renderer reads it rather than testing for Electron.
- [ ] Served over the host, pop-out windows and the other shell-only actions are absent from the interface, not merely disabled.
- [ ] The renderer's own views and cards are identical in both hosts, from the same source files.
- [ ] A capability the renderer does not know about is ignored rather than breaking it.

## Steps

- [ ] Declare the capability set and expose it from the preload bridge.
- [ ] Provide the served fallback, which declares the reading capabilities only.
- [ ] Gate the shell-only affordances on the capability set.
- [ ] Test the renderer's decisions against both capability sets.

## Notes

Detected, because a renderer that tests for `window.require` or a user agent gets this wrong the first time either changes.
