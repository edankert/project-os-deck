---
type: "[[task]]"
id: TASK-0177
title: "The other four of Rubric's ideas drawn on the towers page: a needs-you panel, grouping by phase or by feature, age badges with a ring of recent evidence, and the year as weeks"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-21
updated: 2026-10-21
source: ["Edwin 2026-10-21: 'Document this and then go ahead with the 3 suggested options first (although I agree with all your suggestions)'"]
parent: "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"
effort: M
due: ""
depends: ["[[TASK-0176]]"]
blocks: []
related: ["[[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0176]]"]
tests: []
---

# Needs-you panel, grouping, ages and weeks drawn on the towers page

**This task draws the other four ideas from [[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]] on the towers design page, after the first three ([[TASK-0176]]).** Edwin agreed with all seven on 2026-10-21 and asked for those three first.

## What the page draws

- **A needs-you panel**, in the style of Rubric's email panel: a large count of the tickets that need Edwin, one bar split by reason (triage, review, a test never run or failing, waiting), and the first three tickets as cockpit rows.
- **A switch between grouping by phase and grouping by feature.** Grouped by feature, each feature is a segment of the ring and its tickets stand on it, whatever phase they are in.
- **Age badges, and a ring of recent evidence.** A ticket that has not changed for a while carries the days since its last update, so stalled work shows. The most recent design pictures and acceptance-test evidence stand on a ring of their own outside the shelf; pressing one opens its ticket.
- **The year as a grid of week squares**, each filled by the tickets closed that week.
- The panels stand round the towers, mostly numbers and bars, so the right pane is no longer the only place with words.

## Definition of Done

- [ ] Each of the four is drawn on the page from the fixtures and the notes, with nothing entered by hand.
- [ ] TST-0094 checks what each draws against the fixture.
- [ ] Pictures of each, on both workspaces, are in DES-0005 with the question whether to build them.
- [ ] `cd desktop && npm test` passes. Two independent Claude reviewers review it.
