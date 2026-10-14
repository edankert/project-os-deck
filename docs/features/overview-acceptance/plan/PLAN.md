---
type: "[[plan]]"
title: "Plan for FEAT-0029: Designs, acceptance tests and tickets are accepted from a picture of their evidence"
status: draft
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
implements: ["[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
related: ["[[PHASE-0005-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# Plan for FEAT-0029

Each step below becomes one task note when the owner starts it. A step that turns out to be two is split then.

## Delivery sequence

1. The reads S5 to S7 need, forwarded and tested without a window.
2. S7, the gate, first: it is the smallest and S3 reuses it.
3. S6, against your-trainer's release test.
4. S5.
5. The writes, one verb at a time, each with a test that an agent is refused.
6. The adoption table, the risk scan and the acceptance test notes.

## Dependencies

- **Hard:** DES-0005 accepted for the drawing; FEAT-0026's screen checks.
- **Soft:** FEAT-0027's view and address pattern.

## Open questions

- None beyond PHASE-0005's notes.
