---
type: reference
id: ARCH
status: active
owner: group:maintainers
created: 2026-01-26
updated: 2026-09-08
tags: [architecture]
---

# Architecture (Reference)

Deck is a second front end over the project-os sidecar. The shell exists as of 2026-09-06 and runs from `desktop/`; the full argument for its shape is `reference/cockpit-surface-architecture-options-2026-09-06.md`, Part 4 and Part 8.

## Layers

| layer | what it holds | where it lives |
| --- | --- | --- |
| 0. Record | notes on disk: a project-os repository, or an Obsidian vault | the workspace |
| 1. Sidecar | index, render, link graph, obligations, navigation payloads, live events, guarded writes | `../project-os-cockpit/src/project_os_cockpit/`, shared, not vendored |
| 2. Deck's index | Deck's own record per note: the workspace's Markdown walked, frontmatter parsed, changes watched, one revision per workspace | `desktop/src/main/`, with the pure parts in `desktop/src/shared/` |
| 3. Shell state | workspaces, windows, and one store every window subscribes to | `desktop/src/main/` |
| 4. Panels | today: the view switcher, the desk and the reader, each addressable. Panel kinds come from a registry each phase adds to, so an address still cannot name what Deck cannot draw | `desktop/src/renderer/` |
| 5. Layouts | Spread (cards on a desk, pop-out windows) today; Glass in [[PHASE-0002-Glass]] | `desktop/src/renderer/` |

Deck is one renderer with two hosts. Deck's own HTTP host serves the renderer and proxies reads to the sidecar; the Electron window loads from that host too, so the shell and a tablet run identical bytes over one origin. The sidecar is not asked to serve Deck, and the reason is `decisions/ADR-0001-Deck-Serves-Its-Own-Read-Only-Host.md`.

**Deck's shell writes; the host Deck serves a tablet never does.** A write travels from the renderer through the preload bridge, into the Electron main process, and out as a loopback HTTP request to one of the sidecar's existing guarded endpoints. Deck adds no endpoint of its own and changes no guard: the sidecar's verb registry decides which verbs a note allows, and the sidecar's loopback check is the authorisation, which is what the cockpit's own ADR-0010 says it is. Deck's HTTP host carries no write at all — it answers 405 to every method that is not `GET` or `HEAD` — because forwarding a write through it would put a loopback address on a request that came from the network. The capability set therefore carries `write`, false when served, and a tablet is offered no verb: absent, not disabled. That is a rule and not a wait; Edwin decided on 2026-09-08 that the tablet does not write. The reasoning is `decisions/ADR-0003-Deck-Writes-Through-The-Shell.md`, and it does not reverse ADR-0001, whose subject is the host.

**A view is a description.** What a view selects, how it groups, which band a note stands in, what a card shows and which surface may draw it are five sections of one document, not decisions spread through the renderer. A description's source is either a sidecar navigation mode, whose groups are the arrangement, or a query Deck evaluates over its own index. The language is Deck's own, seeded with the Obsidian Bases subset measured in the vault so that an existing base file reads as a description, and carrying a version number and an extension namespace of Deck's own from version one. A construct the evaluator does not support is reported by name; it never returns an empty list. The reasoning is `decisions/ADR-0004-A-View-Is-A-Description.md`.

## Flows, as a concept

**Nothing here is built.** Edwin asked on 2026-09-08 for flows — a release flow, a needs-you flow, an issue flow — to be considered now and fleshed out over time. This section is the shape they will take, so that the seams they need exist before anyone builds one.

**A flow is an ordered list of steps, and the record is where its state lives.** Each step has a done-state read from the note itself, and a verb from the sidecar's registry that moves it. Nothing keeps a second copy of "where we are", because the notes on disk are the only place state lives; a step is done when the record says so, whether Deck did it, the cockpit did it, or somebody edited the file.

The cockpit already works this way by accident. Its acceptance runner writes each verdict immediately through the guarded endpoints and keeps only the position in one window's memory, which is lost when the window closes — its own code says the record is the ledger, not the object. Its release page is a fixed order of independent verbs whose state is the release note's frontmatter and the ledger files.

**One thing is outside the record, and it is the cursor: where a person is.** That is what the cockpit loses on a window close, and it is the one piece Deck's shared store can hold. `desktop/src/shared/store-state.ts` reserves the slot; nothing writes it yet.

**Two seams exist so a flow can be built without a retrofit.** A flow step is addressable — the grammar carries `flow` and `step`, each refusing an unknown value — so a person can pop a flow into its own window or paste one to a tablet. And the expression a step's done-state is written in is the same language a view's filter is written in, so there is one evaluator rather than two.

The engines surveyed on 2026-09-08 — state machines, BPMN, workflow DSLs — all hold flow state themselves, which is why none of them fits here. The one that comes closest is Camunda, which keeps the process in one document and each human step's form in another. `reference/deck-architecture-review-before-glass-2026-09-08.md`, Part 4, carries the survey and a worked example of the release flow.

## Canonical entrypoints
- Primary developer workflow: `cd desktop && npm install`, then `npm start` to run Deck, `npm test` to build and run every suite, `npm run typecheck` for both compiles.
- One suite at a time, which is what each `TST-*` note's `command:` runs: `bash tools/scripts/run-desktop-tests.sh <suite>` (`address`, `desk`, `desk-model`, `faces`, `groups`, `host`, `panels`, `ports`, `render`, `search`, `sidecar-client`, `sidecar-retry`, `store`, `views`, `window-placement`, or `all`). Eight more landed on 2026-09-09: `index`, `descriptions`, `evaluator`, `band-and-face`, `write-channel`, `panel-registry`, `workspace-paths` and `smoke-support`. The suite named `writes` in the plan is `write-channel`.
- A real boot with no person watching: `cd desktop && npm run smoke`, or `electron . --smoke --workspace <path>` for a workspace other than this repository. It opens the application, opens that workspace, and prints a JSON verdict.
- The same boot with the host bound beyond loopback: `npm run smoke:lan`. It adds the checks a person otherwise makes from a tablet — the refusal of a write, both spellings of a path traversal, and the capability set a served page is given — made from this machine's own network address rather than from loopback, because a request from loopback is not the request a tablet makes. What stays a walk is Safari rendering the page and a person seeing that a shell-only control is ABSENT rather than greyed out.
- **The verdict distinguishes three things.** A FAILURE and a SKIP both make the run not ok; a skip is a check that should have run and could not, and counting it is what stops a half-run reporting success (ISS-0022). A NOT-APPLICABLE check is one belonging to a configuration this run is not — the tablet-shaped checks in a loopback run — and it is printed but does not count. A reason may only be not-applicable when running the check would take a different invocation, never when it would take fixing something.
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
