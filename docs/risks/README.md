---
type: reference
id: RISKS-README
status: active
owner: team:docs
created: 2026-01-26
updated: 2026-01-26
tags: [risks]
---

# `docs/risks/`

Risk notes track known hazards and how to mitigate them.

## What goes here
- `RISK-####-*.md` created from `../__templates__/risk.md`.

## When to add a risk
- External dependencies (toolchains, environment variables, licensing) can break flows.
- There are “sharp edges” (hard-coded paths, large runtime cost, fragile assumptions).
The triggers are stated once, in `../../tools/instructions/LIFECYCLE.md`, "Risk scan triggers". The scan is mandatory and a negative result is recorded too.

## How to use risks effectively
- Keep mitigation actions concrete and link them to `TASK-*` items when work is planned.
