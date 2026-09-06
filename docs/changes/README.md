---
type: reference
id: CHANGES-README
status: active
owner: team:docs
created: 2026-01-26
updated: 2026-05-08
tags: [changes]
---

# `docs/changes/`

Traceable records of **what changed** in the repo and **why** (after work lands).

## Template history vs project history
- In this upstream `project-os` template repo, `CHG-*` notes record template evolution: changes to the documentation system, tools, skills, adapters, sync behavior, and bundled optional utilities.
- In downstream project-os-enabled repos, `docs/changes/` belongs to that downstream project’s own history after initialization.
- Do not sync upstream template `docs/changes/CHG-*` notes into downstream repos as project history. The template sync helper intentionally treats `docs/changes/` as project-owned.
- If a downstream repo was created by copying this entire template repo, remove upstream template `CHG-*` notes during project init unless the project intentionally wants to keep upstream template history for audit context.

## What goes here
- `CHG-YYYYMMDD-*.md`: one note per meaningful change, using `../__templates__/change.md`.
- Use `SNAPSHOT.yaml` and linked change notes for roll-ups/views.

## When to add a change note
- After merging work that affects users/flows (scripts, directory layout, supported systems, environment variables).
- When changing behavior or expectations (e.g., build output location, CI behavior, tool output format).
When a change note is due is stated once, in `../../tools/instructions/LIFECYCLE.md` close-out step 3: when behaviour, paths or contracts change. It is an obligation, not a preference.

## What to include
- Links to related `ISS-*`, `FEAT-*`, `TASK-*`, and any ADRs.
- `commit:` and/or `pr:` identifiers (if available).
- “Impact” bullets that name affected flows and artifact paths.
