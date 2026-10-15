---
type: "[[test]]"
id: TST-0080
title: "The overview classifies and places every ticket"
status: active
owner: system:codex
created: 2026-10-14
updated: 2026-10-15
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
phase: "[[PHASE-0005-Overview]]"
scope: feature
level: unit
entrypoint: "desktop/tests/overview-model.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh overview-model"
covers: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
issues: []
tasks: ["[[TASK-0144]]", "[[TASK-0115-Build-One-Overview-From-The-Notes]]", "[[TASK-0153]]"]
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

- Compare the live Deck repository and your-trainer, when present, with the sibling cockpit’s Python `Index.build` and `stats_payload`. Prefer its `.venv/bin/python3`, with `PYTHONPATH` pointing at its `src`. Missing checkouts print a skip reason; Python failures fail the test.
- Exercise waivers, the strict staleness boundary and project override, per-type terminal states, dependency resolution and the decision/design type split.

## Expected results

- Every ticket carries `type`, `fill` and `needsYou`. Every stats item agrees on fill and attention. Risks, decisions and designs are absent from stats, but the port still applies to them; the test reports all extra types.
- Each ticket appears once and phase/core counts match their ticket lists.
- Project-wide tickets stay in the core regardless of their phase field.
- An ambiguous suggestion stays unassigned.

## Evidence

2026-10-15: `cd desktop && npm test` passes 764 tests, with zero failures and zero skips. The overview-model suite passes 26 tests. Direct Python stats parity compares 356 Deck and 2,706 Your Trainer items with zero mismatches. Changing doing to open produces 100 and 519 named mismatches. The executable check holds no verdict in its note status.

## Adequacy

Each branch has inputs that distinguish it from the next placement rule or a different state. Count invariants catch a ticket omitted from or repeated in a place.
