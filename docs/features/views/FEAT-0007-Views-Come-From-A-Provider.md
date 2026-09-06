---
type: "[[feature]]"
id: FEAT-0007
aliases: ["FEAT-0007"]
title: "Views come from a provider: the renderer holds no fixed set of view buttons"
status: doing
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
goal: "Deck asks a view provider which views the current workspace has and draws whatever comes back. For a project-os repository the built-in provider offers the same views the cockpit's navigator does. A vault's `.base` files can become views later by adding a provider, without touching the renderer."
requirements: []
tasks: ["[[TASK-0019-The-Provider-Interface-And-The-Project-Os-Provider]]", "[[TASK-0020-The-Switcher-Draws-What-The-Provider-Returned]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
---

# Views come from a provider

## Goal

Deck asks a view provider which views the current workspace has and draws whatever comes back. For a project-os repository the built-in provider offers the same views the cockpit's navigator does. A vault's `.base` files can become views later by adding a provider, without touching the renderer.

## Scope

**In scope.** The provider interface: given a workspace, return its views, each with an id, a label and how to fetch its contents. The project-os provider, whose list matches the cockpit's navigator modes. The switcher in the renderer, which renders the returned list and nothing else. The choice of provider by workspace kind, with one kind implemented here.

**Out of scope.** The provider that reads a vault's `.base` files, which is [[PHASE-0003-Vault]]. This feature exists so that phase can add it without a retrofit.

**Not asked of the cockpit.** Edwin decided on 2026-09-06 that the list of views is Deck's concern; the sidecar is not changed to answer it.

## Acceptance

- The renderer contains no literal list of view names: the switcher renders exactly what the provider returned.
- For this repository, the provider returns the same views the cockpit's navigator shows, checked name by name.
- Adding a second provider changes which views appear, with no change to the switcher.
- A view the provider did not return cannot be selected, and asking for one by address reports it as unknown.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0019-The-Provider-Interface-And-The-Project-Os-Provider]], [[TASK-0020-The-Switcher-Draws-What-The-Provider-Returned]]
- Plan: `docs/features/views/plan/PLAN.md`
