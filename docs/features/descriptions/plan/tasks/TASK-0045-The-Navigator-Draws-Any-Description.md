---
type: "[[task]]"
id: TASK-0045
aliases: ["TASK-0045"]
title: "The navigator draws any description, whether its notes came from a sidecar mode or from a query over Deck's index"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
parent: "FEAT-0012"
effort: ""
due: ""
depends: ["TASK-0042", "TASK-0043", "TASK-0044", "TASK-0040"]
blocks: []
related: ["[[FEAT-0012-A-View-Is-A-Description]]", "[[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]", "[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
tests: ["[[TST-0031-The-Evaluator-Runs-The-Seeded-Language]]"]
---

# The navigator draws any description

## Objective

The navigator draws a view from its description and does not care where the notes came from. A query-sourced view over Deck's index gets the same headings, counts, folding and children a mode-sourced view gets today.

## Detail

**There is one drawing path and it takes groups.** [[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]] built the model the navigator draws from: groups with labels and counts, what is owed at the top, severity bands and test tiers as headings, finished work folded away, a note's children under it. That model stays. What changes is that a group can now be produced by the evaluator's `groupBy` as well as by the sidecar's navigation payload.

**Owed and suppressed still come from the sidecar even for a query.** A query decides which notes a view holds; whether a note needs a person is the cockpit's judgement from its own obligations registry. So a query-sourced view reads the navigation payload's owed and suppressed marks for the notes it selected, and puts what is owed at the top exactly as a mode-sourced view does. Where the sidecar has no opinion about a note — a vault note it does not track — the view has no owed group and says so rather than showing an empty heading.

**A view that failed to evaluate is drawn as a message, not as nothing.** The evaluator's unsupported report reaches the screen: the constructs it could not read, by name, above the notes it could still select. This is the visible half of the rule that a broken view must not look like an empty one.

## Acceptance

- A query-sourced description draws with the same headings, counts, folding and children as a mode-sourced one, asserted over the same notes reached both ways.
- What is owed is at the top of a query-sourced view, read from the sidecar rather than computed.
- A view whose subject the sidecar does not track draws with no owed group and states that, rather than drawing an empty heading.
- An unsupported construct is named on screen above the notes the view could still select.
- Search and the filters narrow a query-sourced view over the whole model, the way [[TASK-0027-Search-And-Filter-In-The-Renderer]] made them do for the drawn elements.
- Switching between a mode-sourced and a query-sourced view leaves no card of the previous view on screen, the defect [[ISS-0001-Cards-From-The-Previous-View-Stay-On-Screen]] records.

## Steps

- [ ] Route both source kinds into the one group model the navigator already draws.
- [ ] Read owed and suppressed from the navigation payload for a query-sourced view's notes.
- [ ] Draw the unsupported report above the list.
- [ ] Extend the groups and views suites with a query-sourced fixture.
- [ ] Walk the running application on this repository with one query-sourced view added by hand, and record what it drew.

## Notes

This task is where the feature becomes visible, and it is therefore where the acceptance walk [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]] can be made.
