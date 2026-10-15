---
type: "[[task]]"
id: TASK-0144
title: "Every ticket carries the cockpit's fill and its needs-you flag"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15, after running the overview: 'the colours would be good to use the same colours for the different tickets throughout (same as in the cockpit) and use the same way to show the status as is used in the overview page, closed, semi closed, open, flashing, strikethrough and red dots for something needing attention? (maybe this doesn't work but let's try for a start)'", "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
parent: "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"
effort: M
due: ""
depends: []
blocks: ["[[TASK-0145]]", "[[TASK-0147]]", "[[TASK-0148]]", "[[TASK-0149]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]", "[[TASK-0145]]"]
tests: ["[[TST-0080-The-Overview-Classifies-And-Places-Every-Ticket]]", "[[TST-0082-Both-Fixtures-Keep-Every-Ticket-And-Its-Counts]]"]
---

# Every ticket carries the cockpit's fill and its needs-you flag

**Each ticket in the overview model says how the cockpit would fill its square and whether the cockpit would put a "needs you" dot on it.** The screens then draw both, so Deck and the cockpit cannot show one ticket in two different states. Today Deck has only its own six states, and its "needs you" means failed or owed again (`needsPerson` in `desktop/src/shared/overview-wheel.ts`), which is narrower than the cockpit's.

The cockpit's rules are `_square_state` and `_needs_human` in `../project-os-cockpit/src/project_os_cockpit/cockpit.py` (about lines 1633 to 1700). The fill (how the square is drawn) is one of `delivered`, `dropped`, `deferred`, `doing`, `unproven`, or none for not started. "Needs you" is true at `triage` or `review`, at a blocked or failing status, for a test at `ready`, and for an open ticket whose `depends:` names an unfinished note. The sidecar already serves both, per ticket, in `/api/cockpit/stats` (`state` and `attn`), which Deck's `sidecar-client.ts` reads.

## Definition of Done
- [ ] The contract change is proposed in FEAT-0026's "Questions between the lanes" and agreed by Claude before code depends on it (the brief's rule for the model).
- [ ] `Ticket` in `desktop/src/shared/overview-types.ts` gains `fill: 'delivered' | 'dropped' | 'deferred' | 'doing' | 'unproven' | null` and `needsYou: boolean`. `state` stays, so the wheel can still be drawn in state colour.
- [ ] The model fills both for every ticket on both fixtures, and both fixtures are regenerated.
- [ ] A test compares every ticket's `fill` and `needsYou` with what the sidecar's `/api/cockpit/stats` returns for the same note, on Deck and on your-trainer, and fails when one rule is changed on Deck's side (TST-0080).
- [ ] TST-0080's expected results name the two new fields; `cd desktop && npm test` passes.

## Steps
- [ ] Decide, and write in the Notes below, whether the model ports the two rules or reads them from the stats payload. Either way the comparison test above is the guard.
- [ ] Change the type, the model and the fixture builder; regenerate both fixtures.
- [ ] Add the comparison test to the overview-model suite.

## Notes

Codex lane. Claude's TASK-0145 draws these fields and waits on this task.

Assumption recorded at planning: Deck's `dec` kind holds both decisions and designs. The cockpit has a colour for decisions (`--type-adr`) and none for designs, so both take `--type-adr` unless this task splits the kind. Splitting it is not required by the plan.

Preflight, 2026-10-15: no sibling issue (searched docs/issues for "fill", "needs you", "square"). Risk scan: no new dependency, environment variable, path, long-running step or exposure; the stats route is already read by Deck (`api.read.record` is adopted).
