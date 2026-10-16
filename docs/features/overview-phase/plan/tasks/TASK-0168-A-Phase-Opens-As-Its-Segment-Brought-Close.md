---
type: "[[task]]"
id: TASK-0168
title: "A phase opens as its segment of the ring brought close, its towers named and its tickets listed beside it as cockpit rows, in place of the web"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16, after turning DES-0005-towers.html: 'I like the design page, please implement as suggested. However can you please come up with a different design for the exit criteria? Also, what is the red rectangle on-top of the tower, I assume this highlights issues that \"needs me\", should this be selectable?'", "Edwin 2026-10-16: 'I don't think the phase spider web works really.'"]
parent: "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"
effort: M
due: ""
depends: ["[[TASK-0166]]"]
blocks: ["[[TASK-0169]]"]
related: ["[[TASK-0163]]", "[[TASK-0147]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]"]
---

# A phase opens as its segment brought close

**S2, a phase, is now the ring with that phase brought close.** The camera flies from the wheel to the segment, the other phases fade to their plinths, each tower shows its feature's id, and the exit band can be read cell by cell. The phase's tickets are listed on the right as the cockpit lists them, grouped by tower with the focus feature first, and pressing a row outlines its floor. The web is gone.

## Definition of Done

- [ ] `phaseScene` returns the towers layout opened on the phase, with the rows panel grouped by tower, the exit criteria at its head, and what needs you first.
- [ ] Going from the wheel to a phase and back moves the camera rather than redrawing a different picture; back and forward keep working.
- [ ] TST-0090 checks the phase screen on both fixtures: every ticket of the phase in the panel once, the grouping, and the words at rest.

## Verification
