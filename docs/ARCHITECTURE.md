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

Deck is a second front end over the project-os sidecar. The shell exists as of 2026-09-06 and runs from `desktop/`; the full argument for its shape is `reference/cockpit-surface-architecture-options-2026-09-06.md`, Part 4 and Part 8.

## Layers

| layer | what it holds | where it lives |
| --- | --- | --- |
| 0. Record | notes on disk: a project-os repository, or an Obsidian vault | the workspace |
| 1. Sidecar | index, render, link graph, obligations, navigation payloads, live events, guarded writes | `../project-os-cockpit/src/project_os_cockpit/`, shared, not vendored |
| 2. Shell state | workspaces, windows, and one store every window subscribes to | `desktop/src/main/` |
| 3. Panels | today: the view switcher, the desk and the reader, each addressable. The rest of the list is later phases | `desktop/src/renderer/` |
| 4. Layouts | Spread (cards on a desk, pop-out windows) today; Glass in [[PHASE-0002-Glass]] | `desktop/src/renderer/` |

Deck is one renderer with two hosts. Deck's own HTTP host serves the renderer and proxies reads to the sidecar; the Electron window loads from that host too, so the shell and a tablet run identical bytes over one origin. The sidecar is not asked to serve Deck, and the reason is `decisions/ADR-0001-Deck-Serves-Its-Own-Read-Only-Host.md`.

Deck reads and never writes, and says so three times: the client has no method that writes, Deck's host answers 405 to every method that is not `GET` or `HEAD`, and the sidecar's own guard refuses a mutation from anywhere but loopback.

## Canonical entrypoints
- Primary developer workflow: `cd desktop && npm install`, then `npm start` to run Deck, `npm test` to build and run every suite, `npm run typecheck` for both compiles.
- One suite at a time, which is what each `TST-*` note's `command:` runs: `bash tools/scripts/run-desktop-tests.sh <suite>` (`address`, `desk`, `host`, `sidecar-client`, `store`, `views`, `window-placement`, or `all`).
- A real boot with no person watching: `cd desktop && ./node_modules/.bin/electron . --smoke --workspace <path>`. It opens the application, opens that workspace, and prints a JSON verdict.
- `--lan` binds Deck's host beyond loopback, which is how a tablet reaches it.
- CI workflow: `.github/workflows/validate-docs.yml`, which validates the documentation and runs every `TST-*` command, so the suites above gate the build
- Release/build workflow: none yet

## Key directories
- `docs/`: the documentation system (project-os); `docs/designs/` carries the two designs with their HTML prototypes
- `docs/reference/`: the architecture options note and the cockpit adoption table
- `tools/`: project-os instructions and playbooks (template-owned; synced from `../project-os`)
- `desktop/`: Deck itself. `src/main/` is the Electron main process, `src/renderer/` the page, `src/shared/` what both compile against, `tests/` the suites, `fixtures/` what the cockpit's own list looked like when it was recorded
- The renderer is compiled twice, because the main process needs CommonJS and the page needs modules a browser can import. There is no bundler.

## Relationship to project-os-cockpit
- The sidecar is the cockpit's and stays there. Deck does not fork it.
- The cockpit stays the primary place for new functionality. Deck tracks the register and must be able to support what arrives.
- The cockpit's capability register (`../project-os-cockpit/docs/reference/cockpit-capability-register.md`) is the contract; `reference/cockpit-adoption.md` is Deck's side of it.
