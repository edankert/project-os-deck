---
type: "[[task]]"
id: TASK-0042
aliases: ["TASK-0042"]
title: "The project-os provider emits seven mode-sourced descriptions, and nothing a person sees changes"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
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

- [x] Write the seven descriptions in the provider, replacing the three-field records
- [x] Run the parser over all seven in the suite, asserting zero refusals
- [x] Confirm [[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]] still pins the list — its fixture check is untouched; two of its other checks were reworded for the new shape, and what they claim is unchanged
- [x] Run the smoke run and compare the groups drawn before and after — identical, 2026-09-09
- [x] Record anything the shape could not carry — Overview, below

## Notes

The fixture is what keeps the claim honest. If the cockpit adds a view, this test fails and the adoption table gains a row, which is the tracking obligation `CLAUDE.md` states. That was true when [[TASK-0019-The-Provider-Interface-And-The-Project-Os-Provider]] built it and it stays true through this change.


## Done, 2026-09-09

**The provider returns seven descriptions and a person sees no difference.** Same seven ids, same labels, same order, same groups, same counts, same folding. The smoke run against this repository drew the same two headings and the same thirteen rows before and after.

**All seven `surfaces` are `list` and `spread`, and none names `glass`** — because Glass does not exist yet, not because these views are unsuited to it. The surface vocabulary refuses the name until PHASE-0002 registers it, so this is enforced rather than remembered.

## What the shape could not carry: Overview

**Overview is not a view of NOTES.** It is a page of statistics built from `/api/cockpit/stats`, and `source` has two kinds, both of which select notes. Writing `source: { kind: 'mode', mode: 'overview' }` would be a lie — the sidecar has no `overview` navigation mode, and asking for one gets `features` back, which is the silent fallback this whole feature exists to refuse.

**So it is written in Deck's own namespace**, `deck:stats: true`, which is what the extension namespace is for, and `sourceOf()` reads it there. The fact is in the description rather than in a branch somewhere in the renderer, and it is visible to anyone reading the view.

**What it would take to say it properly:** Overview should be a PAGE. The address grammar already carries a `page` key with an empty registry waiting for one ([[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]]), and [[PHASE-0004-Parity]] is where pages arrive. On the day a page exists, Overview's description becomes a page's and the extension key goes.

**One smaller thing the shape carries but a reader should know.** A face is per note type, not per view, because a project-os view holds several — the Features view draws phases, features and tasks in one list. So `face` is a default plus a `byType` map. Without that, `faces.ts` could not stop branching on the type, which is [[TASK-0044-Band-And-Face-Come-From-The-Description]]'s whole point.

## Evidence

- The fixture check in [[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]] passes: the seven ids and labels still match the list read off the cockpit's own navigator, in order.
- Its search for view names in the built renderer still passes, which caught one real regression while this task was being written: the query path had read its obligations from a hard-coded `features`, and the mode now comes from the description instead.
- `bash tools/scripts/run-desktop-tests.sh descriptions`: all seven parse with zero refusals.
