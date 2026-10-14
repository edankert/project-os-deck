---
type: "[[plan]]"
title: "Plan for FEAT-0026: One list of tickets, each with a type, a state and a place"
status: active
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
implements: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
related: ["[[PHASE-0005-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# Plan for FEAT-0026

Five tasks deliver FEAT-0026 on `lane/codex`. TASK-0120 to TASK-0124 and TST-0085 to TST-0089 remain available for FEAT-0029.

## Delivery sequence

1. [[TASK-0115-Build-One-Overview-From-The-Notes]] builds the pure model and its state, placement, exit and suggestion tests ([[TST-0080-The-Overview-Classifies-And-Places-Every-Ticket]]).
2. [[TASK-0116-Serve-And-Print-The-Overview]] serves the cached read-only route and adds the print command ([[TST-0081-The-Overview-Route-Is-Read-Only-And-Cached]]).
3. [[TASK-0117-Build-Both-Overview-Fixtures-From-Real-Notes]] replaces both fixtures and explains the measured differences from DES-0004 ([[TST-0082-Both-Fixtures-Keep-Every-Ticket-And-Its-Counts]]).
4. [[TASK-0118-Check-Every-Screen-As-Data]] checks words, count marks, addresses and list twins, and registers the pages and flows ([[TST-0083-Screen-Checks-Refuse-Text-And-Missing-Marks]]).

5. [[TASK-0119-Report-When-Localhost-Tests-Cannot-Run]] makes unavailable socket tests report a skip without swallowing assertions ([[TST-0084-Localhost-Checks-Skip-Only-When-Listeners-Are-Forbidden]]).

The scene checks can proceed independently of the model. The fixture paths stay `desktop/fixtures/overview/deck.json` and `desktop/fixtures/overview/your-trainer.json`.

## Run boundaries

The contracts already exist and require agreement before they change. Codex uses only node suites and records local commits with the requested co-author line. It does not push, merge or touch `main`; Claude reviews and merges. Task completion for this run uses local test evidence rather than a push or CI run. FEAT-0026 stops at `review` for Claude and Edwin.

## Dependencies

- **Hard:** the fixed model and scene contracts are present. The two source repositories are readable.
- **Soft:** FEAT-0027 uses Claude’s placeholder fixtures until TASK-0117 replaces them with the real output.

## Open questions

- None beyond PHASE-0005's notes.
