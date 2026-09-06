---
type: reference
id: ARCH
status: active
owner: group:maintainers
created: 2026-01-26
updated: 2026-09-06
tags: [architecture]
---

# Architecture (Reference)

Deck is a second front end over the project-os sidecar. Nothing is built yet; this page records the shape that was decided, so the first code lands in the right place. The full argument is `reference/cockpit-surface-architecture-options-2026-09-06.md`, Part 4 and Part 8.

## Layers

| layer | what it holds | where it lives |
| --- | --- | --- |
| 0. Record | notes on disk: a project-os repository, or an Obsidian vault | the workspace |
| 1. Sidecar | index, render, link graph, obligations, navigation payloads, live events, guarded writes | `../project-os-cockpit/src/project_os_cockpit/`, shared, not vendored |
| 2. Shell state | workspaces, PTYs, windows, fleet health, and one store every window subscribes to | Deck's Electron main process (to be written) |
| 3. Panels | navigator, reader, context, terminal, agents, overview, checks, history, inbox, desk, field; each multi-instance, each with an address | Deck's renderer (to be written) |
| 4. Layouts | Spread (dock, float, pop out) and Glass (the field) | Deck's renderer |

Deck is one renderer with two hosts: the Electron shell hosts it with the terminal and the windows, and the sidecar can serve the same renderer over the LAN, read-only, for a tablet.

## Canonical entrypoints
- Primary developer workflow: none yet. The Deck phase will add the shell's build and run commands here.
- CI workflow: `.github/workflows/validate-docs.yml` (documentation only, until there is code)
- Release/build workflow: none yet

## Key directories
- `docs/`: the documentation system (project-os); `docs/designs/` carries the two designs with their HTML prototypes
- `docs/reference/`: the architecture options note and the cockpit adoption table
- `tools/`: project-os instructions and playbooks (template-owned; synced from `../project-os`)
- `src/`: reserved for Deck's code

## Relationship to project-os-cockpit
- The sidecar is the cockpit's and stays there. Deck does not fork it.
- The cockpit stays the primary place for new functionality. Deck tracks the register and must be able to support what arrives.
- The cockpit's capability register (`../project-os-cockpit/docs/reference/cockpit-capability-register.md`) is the contract; `reference/cockpit-adoption.md` is Deck's side of it.
