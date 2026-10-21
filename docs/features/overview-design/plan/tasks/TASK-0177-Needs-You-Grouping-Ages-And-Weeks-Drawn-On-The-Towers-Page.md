---
type: "[[task]]"
id: TASK-0177
title: "The other four of Rubric's ideas drawn on the towers page: a needs-you panel, grouping by phase or by feature, age badges with a ring of recent evidence, and the year as weeks"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-21
updated: 2026-10-21
source: ["Edwin 2026-10-21: 'Document this and then go ahead with the 3 suggested options first (although I agree with all your suggestions)'", "Edwin 2026-10-21, after TASK-0176: 'Looks great, can we continue with the next set of features?'"]
parent: "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"
effort: M
due: ""
depends: ["[[TASK-0176]]"]
blocks: []
related: ["[[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0176]]"]
tests: ["[[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]]"]
---

# Needs-you panel, grouping, ages and weeks drawn on the towers page

**This task draws the other four ideas from [[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]] on the towers design page, after the first three ([[TASK-0176]]).** Edwin agreed with all seven on 2026-10-21 and asked for those three first.

## What the page draws

- **A needs-you panel, top right**, in the style of Rubric's email panel: a large count of the tickets that need Edwin, one bar split by the cockpit's reasons (failed, to review, to decide, to run, waiting), and the first three tickets as cockpit rows, the most urgent reason first. Pressing a part of the bar lights those tickets on the ring as a search does; pressing a row selects its ticket.
- **A switch in the header between grouping by phase and grouping by feature.** Grouped by feature, each unfinished feature is a segment of the ring with its tickets standing on it as one tower, whatever phase they are in; finished features stand on the shelf; tickets that belong to no feature lie in the core. The feature in focus faces the person and is brightest. Which feature a ticket belongs to is the same rule the towers already use.
- **Age badges.** A tower whose tickets have not changed for 14 days or more carries the days since the last change, so stalled work shows from across the room. Days are counted to the date the data was read, not to today, because the page draws a fixture. The card says the same for one ticket.
- **A ring of recent evidence**, outside the shelf: the most recent pictures kept beside the notes (a design's attachments, a feature's `evidence/` and `gallery/`, an issue's evidence, the acceptance gallery), at most three per ticket. Each stands as a small picture with its ticket's id and date; pressing one selects its ticket. A picture belongs to the note that links to it, else to the ticket its file name names, else to the feature whose folder holds it. Its date is its last commit.
- **The year as week squares, bottom right**: the data's year in four rows of thirteen weeks, each square filled by the tickets closed that week, the week the data was read outlined. A ticket's closing week is its note's last update. Pressing a week lights the tickets closed in it.
- The panels stand round the towers, mostly numbers and bars. The two on the right give way to the right pane when it opens.

## Definition of Done

- [x] Each of the four is drawn on the page from the fixtures, the notes and the pictures beside them, with nothing entered by hand.
- [x] TST-0094 checks what each draws against the fixture.
- [x] Pictures of each, on both workspaces, are in DES-0005 with the question whether to build them.
- [ ] `cd desktop && npm test` passes. Two independent Claude reviewers review it.

## Verification

`desktop/scripts/overview-towers.mjs` adds to each workspace: why each ticket needs you (a ninth column of its row), the date the data was read, the ring grouped by feature (ids only; the page takes the rows from the phase grouping), and the evidence pictures. `evidenceFrom` in `overview-towers-notes.mjs` picks the pictures from `git ls-tree` and `git log` at the fixture's commit, keeping those still in the working tree. Deck: 15 features on the ring, 14 on the shelf, 147 tickets in the core, 8 pictures, 12 need you (5 to review, 1 to run, 6 waiting), 298 closed in 2026, one age badge (FEAT-0016, 34 days). your-trainer: 51, 84 and 1,520; 18 pictures; 75 need you (5 to decide, 9 to run, 61 waiting); 1,478 closed; 41 age badges. The page grew to 1.75 MB.

TST-0094 checks every ticket's reason against the fixture, the data's date, every ticket exactly once grouped by feature, the ring as the unfinished features, a feature's tower and segment holding the same tickets, and the pictures (tickets of the fixture, newest first, at most three each and eighteen in all, each file where the page looks). `evidenceFrom` is tested on small notes and files of its own: by a relative link, a wiki link, a name and a folder, newest first, one per ticket, the linking note first. Breaking four of the guards made it fail: four pictures for one ticket, the folder rule lost, the reason column emptied, finished features on the ring. `cd desktop && npm test`: 795 tests, 795 passed.

In a hidden window the page logged no errors and was driven with real presses: the grouping switch both ways, "◷ Ages" off and on, "to review" in the needs-you panel (5 lit), week 37 (72 lit), a needs-you row (selected, the right panels giving way to the pane), Escape, and an evidence picture (its ticket selected). Pictures: `towers-<workspace>-byfeature.jpg`, and the opening views again with the panels.
