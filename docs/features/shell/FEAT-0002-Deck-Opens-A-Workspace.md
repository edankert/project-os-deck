---
type: "[[feature]]"
id: FEAT-0002
aliases: ["FEAT-0002"]
title: "Deck opens a workspace: an Electron shell that finds a repository, starts the sidecar and shows its notes"
status: doing
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
goal: "A person launches Deck, picks a workspace and sees that workspace's notes. This feature is the application itself: the Electron shell, the discovery that finds a project-os repository on disk, the sidecar process started for it, and a typed client that reads the sidecar over HTTP."
requirements: []
tasks: ["[[TASK-0006-The-Application-Builds-And-Boots]]", "[[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]]", "[[TASK-0008-Workspaces-Are-Found-And-Remembered]]", "[[TASK-0009-A-Typed-Read-Only-Client-Over-The-Sidecar]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
---

# Deck opens a workspace

## Goal

A person launches Deck, picks a workspace and sees that workspace's notes. This feature is the application itself: the Electron shell, the discovery that finds a project-os repository on disk, the sidecar process started for it, and a typed client that reads the sidecar over HTTP.

## Scope

**In scope.** The Electron application and its build: one TypeScript compile, a main process, a preload bridge and a renderer that runs as plain modules in the page. Workspace discovery by the `SNAPSHOT.yaml` marker, with the list of known workspaces kept in Deck's own settings file. The sidecar started once per workspace on a free loopback port, waited for until it answers, and stopped when Deck quits. A typed read-only client with one method per sidecar endpoint Deck reads.

**Out of scope.** The embedded terminal, the agent instrumentation and the fleet roll-up. Those are main-process concerns the cockpit already carries and Deck does not need to open a workspace; no exit criterion of [[PHASE-0001-Deck]] measures them. They are named here so that their absence is a decision rather than an oversight.

**Out of scope.** Any write. The client sends `GET` and nothing else, which [[FEAT-0008-One-Renderer-Two-Hosts]] then enforces a second time at the network boundary.

## Acceptance

- Deck starts from a single command in the repository and opens a window.
- Deck finds this repository by its `SNAPSHOT.yaml` and lists it as a workspace.
- Opening a workspace starts one sidecar for it, on a loopback port chosen at runtime, and the renderer receives that base URL.
- The renderer lists the workspace's notes, read through the sidecar, with each note's id, title and status.
- Quitting Deck leaves no sidecar process that Deck started. **Amended 2026-09-06:** a sidecar Deck borrowed is not Deck's to stop, and killing one would take down the cockpit's own ([[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]).

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0006-The-Application-Builds-And-Boots]], [[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]], [[TASK-0008-Workspaces-Are-Found-And-Remembered]], [[TASK-0009-A-Typed-Read-Only-Client-Over-The-Sidecar]]
- Plan: `docs/features/shell/plan/PLAN.md`
