---
type: "[[task]]"
id: TASK-0042
aliases: ["TASK-0042"]
title: "The project-os provider emits seven mode-sourced descriptions, and nothing a person sees changes"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
parent: "FEAT-0012"
effort: ""
due: ""
depends: ["TASK-0041"]
blocks: ["TASK-0044", "TASK-0045"]
related: ["[[FEAT-0012-A-View-Is-A-Description]]", "[[FEAT-0007-Views-Come-From-A-Provider]]", "[[TASK-0019-The-Provider-Interface-And-The-Project-Os-Provider]]", "[[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]]"]
tests: ["[[TST-0030-A-Description-Parses-Or-Says-Why-Not]]"]
---

# Seven descriptions equal to today's views

## Objective

The project-os provider stops returning seven three-field view records and starts returning seven descriptions. Overview, Intent, Features, Issues, Tests, Publication and Library keep their ids, their labels, their order and their contents. The fixture that pins Deck's view list against the cockpit's own navigator still passes, unchanged.

## Detail

**This task deliberately changes nothing a person can see, and that is what makes it worth doing early.** Every later task in the feature edits how a view is drawn. Doing this one first means the rest of the work happens behind a check that already exists: [[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]] reads the cockpit's navigator markup into a fixture and asserts Deck's list matches it name by name, and it also greps the built renderer for every view name to prove none is a literal there.

**All seven sources are `mode`.** Each description names the sidecar navigation mode that feeds the view today, and the sidecar's groups remain the arrangement. No query is evaluated, no record is read from Deck's index, and the seven views therefore need nothing from [[FEAT-0011-Decks-Own-Index]].

**The other four sections are filled from what the code does today, not from what it should do.** `band` carries the rule [[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]] already draws: the Needs-you group in front, the view's own groups in the middle, the suppressed group behind. `face` carries what `faces.ts` decides today, per type. `surfaces` is `list` and `spread` for all seven, because Glass does not exist yet; [[PHASE-0002-Glass]] adds `glass` per view as it draws them. `verbs` is `registry` everywhere.

Writing today's behaviour down is the point. Where the seven descriptions cannot express what the code does, that is a finding about the shape and belongs in this note rather than in a workaround.

## Acceptance

- The provider returns seven descriptions, each parsing under [[TASK-0041-The-Description-Shape-And-Its-Parser]]'s parser with no refusals.
- [[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]] passes unchanged: the seven ids and labels match the fixture read off the cockpit's navigator, in order, and no view name is a literal in the built renderer.
- The running application draws the same seven views, with the same groups, counts and folding as before the change, checked in the smoke run.
- Every description's `surfaces` names `list` and `spread` and not `glass`, and the reason is stated in the description rather than assumed.
- Anything today's code does that a description cannot express is written down in this note's Notes section, with what it would take to express it.

## Steps

- [ ] Write the seven descriptions in the provider, replacing the three-field records.
- [ ] Run the parser over all seven in the suite, asserting zero refusals.
- [ ] Confirm [[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]] passes without being edited.
- [ ] Run the smoke run against this repository and against Your Trainer, and compare the groups drawn before and after.
- [ ] Record in Notes anything the shape could not carry.

## Notes

The fixture is what keeps the claim honest. If the cockpit adds a view, this test fails and the adoption table gains a row, which is the tracking obligation `CLAUDE.md` states. That was true when [[TASK-0019-The-Provider-Interface-And-The-Project-Os-Provider]] built it and it stays true through this change.
