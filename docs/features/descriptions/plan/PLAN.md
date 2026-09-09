---
type: "[[plan]]"
title: "Plan — a view is a description"
status: draft
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
implements: ["[[FEAT-0012-A-View-Is-A-Description]]"]
related: ["[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[ADR-0004-A-View-Is-A-Description]]"]
---

# Plan — a view is a description

## Delivery sequence

1. **[[TASK-0041-The-Description-Shape-And-Its-Parser]]** — The record, its version, its extension namespace, and a parser that refuses what it cannot read and says what it refused.
2. **[[TASK-0042-Seven-Descriptions-Equal-To-Todays-Views]]** — The project-os provider emits seven mode-sourced descriptions, and the existing fixture still passes. Nothing visible changes.
3. **[[TASK-0043-The-Evaluator-Over-The-Index]]** — Filters, comparisons, functions, sort and grouping over [[FEAT-0011-Decks-Own-Index]], with unsupported constructs named.
4. **[[TASK-0044-Band-And-Face-Come-From-The-Description]]** — `faces.ts` becomes a reader; [[TASK-0029-The-Band-Function]]'s table becomes the `band` section; the vocabularies are pinned by fixture.
5. **[[TASK-0045-The-Navigator-Draws-Any-Description]]** — One drawing path for both source kinds.
6. **[[TASK-0046-A-Base-File-Reads-As-A-Description]]** — A `.base` from `~/Notes` becomes a description, and its unsupported constructs are named.

## Dependencies

- **Hard:** TASK-0041 is first; every other task reads the shape it defines. TASK-0043 needs [[TASK-0038-Records-From-The-Workspaces-Markdown]] to have a record to evaluate over. TASK-0045 needs [[TASK-0040-The-Records-Reach-The-Renderer-Read-Only]] for a query-sourced view to have data in the renderer.
- **Hard, outward:** [[PHASE-0002-Glass]] starts after this feature. [[TASK-0029-The-Band-Function]] is rewritten by TASK-0044 and is Glass's first task afterwards.
- **Soft:** TASK-0042 lands early and deliberately changes nothing a person sees; it is the safety net the rest of the feature is built behind.
- **Soft:** TASK-0046 can run any time after TASK-0041 and TASK-0043, and its result is what [[PHASE-0003-Vault]] picks up.

## Open questions

- **Where a description lives for a project-os repository.** The seven are emitted by the provider in code today. Whether they later become files a person can edit is a decision the Parity or Vault phase makes; TASK-0042 must not make it impossible.
- **How much formula support the seed needs.** The vault's TaskNotes files carry a forty-formula block that no Deck view reads. TASK-0043 implements what the ten measured base files need and names the rest as unsupported rather than guessing at completeness.
- **Whether `surfaces` is a list or a rule.** A list is enough for seven views and three surfaces. If a vault base file needs "any surface that can draw cards", that is an extension key, not a change to the list.
