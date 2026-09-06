---
type: "[[task]]"
id: TASK-0008
aliases: ["TASK-0008"]
title: "Workspaces are found and remembered — a project-os repository is the one that carries a SNAPSHOT.yaml"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
parent: "FEAT-0002"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
tests: []
---

# Workspaces are found and remembered

## Objective

Deck lists the workspaces it knows, recognises a project-os repository by its `SNAPSHOT.yaml`, and remembers what a person added.

## Definition of Done

- [ ] A directory carrying `SNAPSHOT.yaml` is recognised as a project-os workspace, and its name and root are reported.
- [ ] A directory carrying neither marker is refused with the reason.
- [ ] Added workspaces persist across a restart in Deck's own settings file.
- [ ] The workspace kind is part of what discovery returns, because the view provider is chosen by it.

## Steps

- [ ] Write the detector: given a path, return the workspace kind or nothing.
- [ ] Write the settings file read and write, atomic on write.
- [ ] Expose the list and the add action over the bridge.

## Notes

The `.obsidian` marker for a vault belongs to [[PHASE-0003-Vault]]. The kind is returned here so that adding it later is a new branch rather than a new concept.
