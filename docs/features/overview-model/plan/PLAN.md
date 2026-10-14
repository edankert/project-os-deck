---
type: "[[plan]]"
title: "Plan for FEAT-0026: One list of tickets, each with a type, a state and a place"
status: draft
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
implements: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
related: ["[[PHASE-0005-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# Plan for FEAT-0026

Each step below becomes one task note when the owner starts it. A step that turns out to be two is split then.

## Delivery sequence

1. Write and push the two fixtures.
2. Build the classification (type and state) with a test per row of DES-0004's table.
3. Build the placement rules and the three kinds of phase, with tests on both workspaces.
4. Read exit criteria and compute the suggestions.
5. Add the command-line print and the screen checks module, with its own tests.

## Dependencies

- **Hard:** none.
- **Soft:** FEAT-0027 needs the fixtures on day one.

## Open questions

- None beyond PHASE-0005's notes.
