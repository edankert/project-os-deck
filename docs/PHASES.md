# Phase Registry

This document is the **registry overview** for the project's development phases. It explains how phase-gated development works and can either list simple phase definitions directly or point to first-class `PHASE-*` notes under `docs/phases/`.

## How Phases Work

- **Property**: `phase` (`[[PHASE-####]]` link preferred; integer 1–N accepted for simple projects or migration)
- **Location**: YAML frontmatter of features, tasks, requirements, and issues
- **Purpose**: Groups related work into cohesive delivery milestones
- **Detailed notes**: `docs/phases/PHASE-####-Short-Name.md` when a phase needs scope, linked work, and exit criteria

## Phase Definitions

Deck has four phases, in this order. The order is Edwin's, decided on 2026-09-06 and recorded in [Part 8 of the architecture options note](reference/cockpit-surface-architecture-options-2026-09-06.md), and revised on 2026-09-07 when Glass became the main view and a parity phase was added before Vault ([ADR-0002](decisions/ADR-0002-Glass-Is-The-Main-View.md)). On 2026-09-10 PHASE-0001 is active with every feature `done` and its code pushed and green; it owes four walks a person must make and one triage decision, and nothing else. PHASE-0002 is planned in full, reviewed on 2026-09-10 against a Minority Report style surface rather than a skin, and starts when PHASE-0001 closes.

| Order | Phase | Name | What it delivers | Judged by |
|-------|-------|------|------------------|-----------|
| 1 | [PHASE-0001](phases/PHASE-0001-Deck.md) | Deck | The Electron shell, one store in the main process, pop-out windows on any screen, and Spread — notes as cards on a desk. The same renderer is also served read-only by Deck's own host for a tablet. Widened on 2026-09-08 with Deck's own index, views as descriptions and the first write through the shell. | Spread opens the same notes as the cockpit and a status window survives a restart on a second display, both walked 2026-09-07; Deck on a tablet, a base file against Obsidian, a criterion ticked in Deck and seen in the cockpit, and the tablet offering no verb, all four owed on 2026-09-10 ([the walk sheet](reference/four-walks-owed-2026-09-09.md)) |
| 2 | [PHASE-0002](phases/PHASE-0002-Glass.md) | Glass | The main view: a field where how close a note is says how much it needs you, a view switch that re-arranges the same cards, a held note that brings its neighbourhood to the front, and a person's hands arranging the rest: pull and push, panes moved and stacked, a note thrown to a window on another screen or to the tablet, and reach that shows what a card is joined to ([FEAT-0014](features/glass-hands/FEAT-0014-The-Hands.md), added 2026-09-10). [FEAT-0001](features/orbit-view/FEAT-0001-The-Corpus-Has-An-Inside.md) is the orbit arrangement of that field. | Deck opens in Glass and a day's notes are read in it; a lifted note's neighbourhood arrives; the field is arranged by hand and a note thrown to another screen lands there, with the record untouched; the three measurements written down as numbers; every card reachable from the navigator by keyboard; after a week, whether anyone looked behind |
| 3 | [PHASE-0004](phases/PHASE-0004-Parity.md) | Parity | Deck carries a working day: several consoles as furniture (T3 Code's terminal evaluated first), the pages a day needs, the verbs behind the sidecar's guards, agents, live changes announced, the command line. | Edwin does one real task in Deck instead of the cockpit and records which he would rather have used; every register row adopted, replaced or not applicable with a reason |
| 4 | [PHASE-0003](phases/PHASE-0003-Vault.md) | Vault | Deck opens an Obsidian vault: types detected from the vault's own templates, `.base` files as views, `.canvas` files as read-only boards, the vault's statuses banded. | `~/Notes` opens; the Comics notes arrive typed; the four Comic base views appear; browsing leaves the vault's `git status` unchanged |

Two rules cross the phase boundaries and are honoured from the first line of code, because both are cheap now and expensive to retrofit: Deck's renderer holds no fixed set of view buttons but takes its list from a view provider chosen by workspace kind (the project-os provider is built in and matches the cockpit; the Vault phase adds one that reads `.base` files), and every reachable Deck state has an address.

There is no foundations phase before Deck. The Electron shell, the store, the read-only sidecar consumption and the two-host rule all sit inside the Deck phase; [PHASE-0001](phases/PHASE-0001-Deck.md) states the reason and names the split point should the phase prove too large to steer.

`PHASE-0002` depends on `PHASE-0001` for the store, the desk with its positions, the navigator, the addresses, the window book with per-display placement, and the tablet host. `PHASE-0004` depends on `PHASE-0002` for the field's obstacle rule, which is where a console sits. `PHASE-0003` depends on `PHASE-0001` only, for the view-provider seam; its fourth place is the stated order rather than a technical constraint.

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
