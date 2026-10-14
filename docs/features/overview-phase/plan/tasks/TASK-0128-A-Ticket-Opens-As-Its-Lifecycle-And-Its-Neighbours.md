---
type: "[[task]]"
id: TASK-0128
title: "A ticket opens as its lifecycle and its neighbours"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-14
source: ["[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
parent: "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"
effort: M
due: ""
depends: []
blocks: []
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]"]
---

# A ticket opens as its lifecycle and its neighbours

S3: a track of the statuses the ticket's type passes through, with the ticket on it, and its links as a radial graph coloured by state.

## Definition of Done
- [x] `ticketScene(model, id)` passes the screen checks for a ticket of every kind on both fixtures.
- [x] A neighbour re-centres the screen on itself.

## Notes
2026-10-14: built in `be87baf`, `fb2b353` (the links into the flows) and the gate commit after it; TST-0090 and TST-0093 pass.

Drawing lane (Claude), PHASE-0005.
