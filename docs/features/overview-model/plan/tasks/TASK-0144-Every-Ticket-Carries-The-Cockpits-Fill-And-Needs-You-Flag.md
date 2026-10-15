---
type: "[[task]]"
id: TASK-0144
title: "Every ticket carries the cockpit's fill and its needs-you flag"
status: done
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
tests: ["[[TST-0081]]", "[[TST-0083]]", "[[TST-0080-The-Overview-Classifies-And-Places-Every-Ticket]]", "[[TST-0082-Both-Fixtures-Keep-Every-Ticket-And-Its-Counts]]"]
---

# Every ticket carries the cockpit's fill and its needs-you flag

**Each ticket in the overview model says how the cockpit would fill its square and whether the cockpit would put a "needs you" dot on it.** The screens then draw both, so Deck and the cockpit cannot show one ticket in two different states. The DES-0004 state remains separate for the optional state colouring. Claude’s TASK-0145 consumes the new fields throughout the drawings.

The cockpit's rules are `_square_state` and `_needs_human` in `../project-os-cockpit/src/project_os_cockpit/cockpit.py` (about lines 1633 to 1700). The fill (how the square is drawn) is one of `delivered`, `dropped`, `deferred`, `doing`, `unproven`, or none for not started. "Needs you" is true at `triage` or `review`, at a blocked or failing status, for a test at `ready`, and for an open ticket whose `depends:` names an unfinished note. The sidecar already serves both, per ticket, in `/api/cockpit/stats` (`state` and `attn`), which Deck's `sidecar-client.ts` reads.

## Definition of Done
- [x] The contract change is proposed in FEAT-0026's "Questions between the lanes" and agreed by Claude before code depends on it (the brief's rule for the model).
- [x] `Ticket` in `desktop/src/shared/overview-types.ts` gains `fill: 'delivered' | 'dropped' | 'deferred' | 'doing' | 'unproven' | 'open'`, `type: NoteType` and `needsYou: boolean`. `state` stays, so the wheel can still be drawn in state colour.
- [x] The model fills the fields for every ticket on both fixtures, and both fixtures are regenerated.
- [x] A test compares every ticket's `fill` and `needsYou` with what the sidecar's `/api/cockpit/stats` returns for the same note, on Deck and on your-trainer, and fails when one rule is changed on Deck's side (TST-0080).
- [x] TST-0080's expected results name the new fields; `cd desktop && npm test` passes.

## Steps
- [x] Decide, and write in the Notes below, whether the model ports the two rules or reads them from the stats payload. Either way the comparison test above is the guard.
- [x] Change the type, the model and the fixture builder; regenerate both fixtures.
- [x] Add the comparison test to the overview-model suite.

## Notes

Codex lane. Claude's TASK-0145 can now draw these fields; the model and fixture commits are `96955cc` and `619361c`.

2026-10-15: the agreed contract retains `kind: dec` and distinguishes `type: adr` (including decision notes) from `type: design`. The model ports the cockpit rules rather than reading a running sidecar. Verification uses the same source index and stats builder as the sidecar. The snapshot's staleness threshold and the capture date are inputs, so fixtures remain reproducible.

Preflight, 2026-10-15: no sibling issue (searched docs/issues for "fill", "needs you", "square"). Risk scan: no new dependency, environment variable, path, long-running step or exposure; the stats route is already read by Deck (`api.read.record` is adopted).

## Verification

2026-10-15: `cd desktop && npm test` passes 764 tests, with no failures or skips. The requested suites pass: overview-model 26, overview-checks 17, overview-fixtures 3, overview-screens 14 and overview-flows 20. The model service’s 13 route tests also cover refreshes at the staleness boundary and after a threshold edit.

The direct stats comparison passes for 356 Deck items and 2,706 Your Trainer items, with zero mismatches. Deck has 28 additional model tickets and Your Trainer 41 outside the stats lists. Risks, decisions and designs are among those omitted; the port still applies to all of them. Changing doing to open produces 100 and 519 named mismatches respectively. Removing the panel row twin guard fails its regression. The original code was restored after each mutation.

Both fixtures carry type, fill and needsYou. Deck has 384 tickets captured from clean commit `96955cc8afecc56b8ac36d19e55e6b354d71cfd0`; rebuilding its archived docs with the recorded timestamp reproduces the serialized fixture exactly. Your Trainer retains 2,747 tickets and `dirty: true`, because another session owns uncommitted notes and ledger changes there.

`bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` pass. This run closes the task with local commits and tests, as Edwin requested. Claude owns the merge, push, CI check and independent review. No Electron window or sibling source write ran.
