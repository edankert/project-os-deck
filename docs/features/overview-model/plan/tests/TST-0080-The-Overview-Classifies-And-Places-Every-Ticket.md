---
type: "[[test]]"
id: TST-0080
title: "The overview classifies and places every ticket"
status: active
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
phase: "[[PHASE-0005-Overview]]"
scope: feature
level: unit
entrypoint: "desktop/tests/overview-model.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh overview-model"
covers: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
issues: []
tasks: ["[[TASK-0115-Build-One-Overview-From-The-Notes]]"]
artifacts: []
adequacy: "Each branch has inputs that distinguish it from the next placement rule or a different state. Count invariants catch a ticket omitted from or repeated in a place."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[PHASE-0005-Overview]]"]
---

# The overview classifies and places every ticket

## Purpose

Every ticket receives its type, display state and place by DES-0004’s rules.

The test holds no verdict in its status. Its command builds the modules and runs the node suite.

## Procedure

- Drive the built builder with synthetic records covering every state-table row.
- Exercise all five placement rules, feature-only parents, non-ticket parent links, member-list ties, local heading links, phase order in all three groups, exit checkboxes and prose.
- Exercise linked and dated suggestions, ties and missing dates, and kind/state ordering.

## Expected results

- Each ticket appears once and phase/core counts match their ticket lists.
- Project-wide tickets stay in the core regardless of their phase field.
- An ambiguous suggestion stays unassigned.

## Evidence

2026-10-14: the `overview-model` suite passed 21 tests, with no failures or skips, in `cd desktop && npm test`. The full run passed all 704 tests. TASK-0140 records the first-review repairs; FEAT-0026 remains at review for Claude.

## Adequacy

Each branch has inputs that distinguish it from the next placement rule or a different state. Count invariants catch a ticket omitted from or repeated in a place.
