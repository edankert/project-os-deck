---
type: "[[plan]]"
title: "Plan — Deck's own index"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0011-Decks-Own-Index]]"]
implements: ["[[FEAT-0011-Decks-Own-Index]]"]
related: ["[[PHASE-0001-Deck]]", "[[ADR-0004-A-View-Is-A-Description]]"]
---

# Plan — Deck's own index

## Delivery sequence

1. **[[TASK-0038-Records-From-The-Workspaces-Markdown]]** — Walk the workspace, parse each note's frontmatter into a record, and mirror the sidecar's normalisation so the counts agree. Pure functions in `desktop/src/shared/`, driven from the main process.
2. **[[TASK-0039-The-Index-Watches-And-Carries-A-Revision]]** — Keep the index current while Deck runs, and raise a revision on every change so a stale view is knowable.
3. **[[TASK-0040-The-Records-Reach-The-Renderer-Read-Only]]** — Serve the records through Deck's own host, on both hosts, refusing every method that is not a read.

## Dependencies

- **Hard:** the tasks run in the order listed. Nothing can be watched before it is read, and nothing can be served before it exists.
- **Hard, outward:** [[FEAT-0012-A-View-Is-A-Description]]'s evaluator task needs TASK-0038's record shape. The rest of the description feature does not, because its first seven descriptions are mode-sourced.
- **Soft:** the fixture that pins Deck's counts against the sidecar's is easier to build while a sidecar is running for the acceptance walk, so build it beside [[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]].

## Open questions

- **How much of a note's body the record holds.** Nothing today needs more than the frontmatter and the path, and holding the body doubles the memory for 1537 notes. The record holds frontmatter only until a task states otherwise; TASK-0038 records the decision.
- **Whether a vault's non-Markdown files are indexed.** `.base` and `.canvas` files are read by [[PHASE-0003-Vault]], not here. TASK-0038 leaves room for a second reader rather than assuming Markdown forever.
