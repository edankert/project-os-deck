---
type: "[[feature]]"
id: FEAT-0002
aliases: ["FEAT-0002"]
title: "Deck opens a workspace: an Electron shell that finds a repository, starts the sidecar and shows its notes"
status: review
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
reviewed_by: model:claude-opus-5
review_date: 2026-09-06
review_verdict: approved
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
- Deck recognises this repository by its `SNAPSHOT.yaml` and lists it as a workspace. **Amended 2026-09-06:** "finds" overstated it. A person adds a folder and Deck says what kind it is, or refuses it with the reason. Nothing scans the disk looking for repositories, and the cockpit stopped doing that too.
- Opening a workspace resolves one sidecar for it on a loopback port, reusing a running one where there is one. **Amended 2026-09-06:** the renderer never receives that base URL, because [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] replaced the direct call with a same-origin proxy. Both hosts read through `/deck/sidecar/<workspace>`, which is the point of the decision: one data path, not two.
- The renderer lists the workspace's notes, read through the sidecar, with each note's id, title and status.
- Quitting Deck leaves no sidecar process that Deck started. **Amended 2026-09-06:** a sidecar Deck borrowed is not Deck's to stop, and killing one would take down the cockpit's own ([[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]).

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0006-The-Application-Builds-And-Boots]], [[TASK-0007-The-Sidecar-Starts-And-Stops-With-Deck]], [[TASK-0008-Workspaces-Are-Found-And-Remembered]], [[TASK-0009-A-Typed-Read-Only-Client-Over-The-Sidecar]]
- Plan: `docs/features/shell/plan/PLAN.md`

## Where this stands

**2026-09-06: built and tested; the acceptance walk is owed.** Every criterion above is checked by the suites and by the smoke run that boots the real application. The status is `review` rather than `done` because the walk that settles it for a person — adding a folder by hand, and looking for a leftover process after quitting — is [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]], and nobody has walked it yet.

## Independent review — 2026-09-06 (second pass)

**Verdict: approved.** Clean context, separate session; same model family, recorded in `reviewed_by`. The first pass held this feature at changes-requested over two findings. Both are fixed, verified at commit `9b99c36` and re-confirmed at `2539206`.

- **A sidecar Deck started could outlive Deck.** `forget` used to drop the child's handle, and `stopAll` at quit iterates only what the map still holds. It now stops a sidecar Deck owns and leaves a borrowed one alone. Reproduced fixed: `forget` on an owned record emits `SIGTERM`; on a borrowed one it emits nothing. Removing the `ownedByDeck` branch fails the suite (1 failure), so the guard guards.
- **Two criteria the code no longer matched** are amended with rationale. "Finds" became "recognises", and the criterion no longer claims the renderer receives a sidecar base URL — it reads through `/deck/sidecar/<workspace>`, which is what ADR-0001 decided.

Verified live: `electron . --smoke --workspace .` boots, borrows the sidecar the cockpit already had running, draws 30 cards with id, title and status, and exits `ok: true`.

One note, not a defect. `defaultPython()` locates the cockpit's virtual environment by walking four directories up from `__dirname`. Running the built app from anywhere else silently falls back to a bare `python3`, and the failure then surfaces as "the sidecar exited before it answered" — the misdirection the function's own comment warns about. `DECK_PYTHON` is the escape hatch and it works.
