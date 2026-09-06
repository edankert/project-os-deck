---
type: reference
id: OWNERSHIP
status: active
owner: team:docs
created: 2026-01-27
updated: 2026-01-27
tags: [ownership, teams, groups, users]
---

# Ownership registry

This file is the canonical registry for `owner:` identities used throughout `docs/`, `tools/`, and `SNAPSHOT.yaml`.

## Rules

This file is a registry of values, not of rules. The allowed owner formats, what membership a `team:*` or `group:*` owes, and how `system:*` automation identities are recorded are stated once, in `../tools/instructions/OWNERSHIP.md`.

## Teams

### `team:docs`
- Purpose: maintain this documentation system structure and authoring conventions.
- Maintainers:
  - `user:edwin`
- Members:
  - `user:edwin`
- Automation:
  - `system:llm`

## Groups

### `group:maintainers`
- Purpose: maintain normative instructions (`tools/instructions/*`) and skills (`tools/skills/*`).
- Maintainers:
  - `user:edwin`
- Members:
  - `user:edwin`
- Automation:
  - `system:llm`

## Users

Add one entry per person when you want explicit membership mapping.

### `user:edwin`
- Name: Edwin Dankert
- Teams: `team:docs`
- Groups: `group:maintainers`

## Systems

### `system:llm`
- Purpose: LLM/agent actions (when you want a non-human owner label).
  - Note: list this under a team/group “Automation” section when it is part of their tooling, but not as a human member.
