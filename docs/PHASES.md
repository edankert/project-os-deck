# Phase Registry

This document is the **registry overview** for the project's development phases. It explains how phase-gated development works and can either list simple phase definitions directly or point to first-class `PHASE-*` notes under `docs/phases/`.

## How Phases Work

- **Property**: `phase` (`[[PHASE-####]]` link preferred; integer 1–N accepted for simple projects or migration)
- **Location**: YAML frontmatter of features, tasks, requirements, and issues
- **Purpose**: Groups related work into cohesive delivery milestones
- **Detailed notes**: `docs/phases/PHASE-####-Short-Name.md` when a phase needs scope, linked work, and exit criteria

## Phase Definitions

Deck has three phases, in this order, and none of them is open. The order is Edwin's, decided on 2026-09-06 and recorded in [Part 8 of the architecture options note](reference/cockpit-surface-architecture-options-2026-09-06.md).

| Order | Phase | Name | What it delivers | Judged by |
|-------|-------|------|------------------|-----------|
| 1 | [PHASE-0001](phases/PHASE-0001-Deck.md) | Deck | The Electron shell, one store in the main process, pop-out windows on any screen, and Spread — notes as cards on a desk. The same renderer is also served read-only from the sidecar for a tablet. | Spread opens the same notes as the cockpit; a status window survives a restart on a second display; Deck opens read-only on a tablet |
| 2 | [PHASE-0002](phases/PHASE-0002-Glass.md) | Glass | The spatial field where how close a note is says how much it needs you. [FEAT-0001](features/orbit-view/FEAT-0001-The-Corpus-Has-An-Inside.md) builds the read-only field first; DES-0002's arrangements follow only if its measurements pass. | The three measurements written down as numbers; the treatment chosen by a person; every card reachable from the list panel by keyboard |
| 3 | [PHASE-0003](phases/PHASE-0003-Vault.md) | Vault | Deck opens an Obsidian vault: types detected from the vault's own templates, `.base` files as views, `.canvas` files as read-only boards, the vault's statuses banded. | `~/Notes` opens; the Comics notes arrive typed; the four Comic base views appear; browsing leaves the vault's `git status` unchanged |

Two rules cross the phase boundaries and are honoured from the first line of code, because both are cheap now and expensive to retrofit: Deck asks the sidecar which views a workspace has and hard-codes none, and every reachable Deck state has an address.

There is no foundations phase before Deck. The Electron shell, the store, the read-only sidecar consumption and the two-host rule all sit inside the Deck phase; [PHASE-0001](phases/PHASE-0001-Deck.md) states the reason and names the split point should the phase prove too large to steer.

`PHASE-0002` depends on `PHASE-0001` for the store, the addresses and the tablet host. `PHASE-0003` also depends on `PHASE-0001`, for the views seam, and not on `PHASE-0002`; its third place is the stated order rather than a technical constraint.

For durable phase tracking, create `[[phase]]` notes from `docs/__templates__/phase.md` and link to them from the `phase` field.
Use `tools/skills/phase-planning/SKILL.md` when creating or migrating first-class phase notes.

## Usage

### In Frontmatter

```yaml
---
type: "[[task]]"
id: TASK-0042
phase: "[[PHASE-0002]]"
status: doing
parent: "[[FEAT-0015]]"
---
```

### Filtering by Phase

Use the `phase` property in Obsidian bases or queries to:
- Group items by delivery milestone
- Track progress within a phase
- Identify scope creep (items without phases)

Use `order` on `[[phase]]` notes to preserve numeric roadmap sorting without overloading the `phase` relationship field.

### Phase Inheritance

- **Features** define the phase for a body of work
- **Tasks** inherit phase from their parent feature (or override explicitly)
- **Requirements** and **Issues** can specify phase when relevant to milestone planning

## Operational Rules for LLMs

The phase-alignment rules are stated once in `tools/instructions/LIFECYCLE.md`, "Phase alignment (optional gating)": verify the phase before starting, consult this registry, do not build a later phase's work early, and a task that needs a future-phase dependency is the user's decision (`tools/instructions/LIFECYCLE.md`, "When to pause for the user").

## Phase Progression

Phases are generally sequential but may overlap:
- **Active phase**: Primary focus of current development
- **Maintenance phases**: Earlier phases may receive bug fixes
- **Blocked phases**: Future phases awaiting dependencies

Track the current active phase in `SNAPSHOT.yaml` under `focus.phase` (`PHASE-*` ID preferred).

---

*This file is part of the Project OS documentation system. See [docs/README.md](README.md) for overview.*
