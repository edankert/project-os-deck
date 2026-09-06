# Phase Registry

This document is the **registry overview** for the project's development phases. It explains how phase-gated development works and can either list simple phase definitions directly or point to first-class `PHASE-*` notes under `docs/phases/`.

## How Phases Work

- **Property**: `phase` (`[[PHASE-####]]` link preferred; integer 1–N accepted for simple projects or migration)
- **Location**: YAML frontmatter of features, tasks, requirements, and issues
- **Purpose**: Groups related work into cohesive delivery milestones
- **Detailed notes**: `docs/phases/PHASE-####-Short-Name.md` when a phase needs scope, linked work, and exit criteria

## Phase Definitions

> **Instructions**: Replace the example phases below with your project's actual roadmap. Each phase should represent a coherent milestone with clear boundaries.

| Phase | Name | Description | Key Deliverables |
|-------|------|-------------|------------------|
| 1 | Foundation | Core infrastructure and stability | Database schema, authentication, base architecture |
| 2 | Core Engine | Primary business logic | Domain models, core algorithms, API contracts |
| 3 | Product | User-facing features | UI/UX, integrations, licensing |
| 4 | Portability | Data exchange and interoperability | Import/export, external API support |
| 5 | Intelligence | AI and automation features | LLM integration, smart features |
| 6 | Launch | Production readiness | Store assets, deployment config, documentation |

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
