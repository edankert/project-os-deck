---
type: "[[test]]"
id: TST-0016
aliases: ["TST-0016"]
title: "The groups the sidecar sends are drawn, and no note is lost or repeated on the way"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/groups.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh groups"
covers: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
issues: []
tasks: ["[[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]"]
artifacts: []
adequacy: "Flattening the payload into one list fails the first check. Dropping a repeated id fails the two-groups check. Reading the band from the whole group key makes `high:done` report nothing and fails the severity check."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]"]
---

# The groups the sidecar sends are drawn

## Purpose

The sidecar already says how a view is grouped, and Deck used to throw that away. Every group, child and mark was flattened into one list, so a view of four hundred notes arrived as four hundred identical cards in one grid. This suite checks the model the navigator draws from, not the elements it produces, because the model is what decides the picture.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0016` reproduces it locally without writing anything.

## Procedure

- Build a payload shaped like the cockpit's issues view: notes needing triage, then severity bands, then the same bands again for finished work, which the sidecar marks suppressed.
- Assert every group in the payload becomes a group Deck draws, carrying its own label and the count of what it holds.
- Add up the cards across all groups and assert no group lost an item, then assert no group lists the same note twice.
- Feed a payload where one id appears in two groups, and assert it stays in both.
- Assert the owed flag and the verb for it reach the card.
- Give a note children under the name `children` and again under the name `items`, and assert Deck reads both as the same thing.
- Assert an issue's severity is the band it arrived in, so a group key of `high:done` still reports `high`.
- Build the rows for a payload and assert the suppressed group arrives folded while everything else arrives open.
- Set a fold the other way in each direction and assert the rows follow it.
- Assert a note holding other notes arrives closed, opens on demand, and draws what it holds one level in.
- Assert each heading carries the count of what its group holds.

## Expected results

- What the sidecar grouped is what a person sees, with the same labels and the same counts.
- A note the sidecar deliberately repeated stays repeated, so the sidecar can put an owed note in "Needs you" and again under its phase without emptying the phase. Flattening used to drop the second copy.
- Finished work is out of the way but reachable, and a group a person opened stays open.
- A feature's tasks are reachable from the feature, drawn under it rather than beside it.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh groups`: 10 checks, all passing on 2026-09-07.
- The desktop suites run 143 checks in total on that date, this one included.
- The fixture is Your Trainer's issues view as it stood on 2026-09-07, cut down to four groups, so the shapes under test are shapes a real sidecar sent.

## Adequacy (who verifies this test?)

Flattening the groups into one list, which is what Deck did before this task, fails the first check and the repeated-id check at once. Deduplicating by note id, the obvious way to "fix" a note appearing twice, fails the check that keeps a phase holding a note "Needs you" also holds. Reading the band from the whole group key rather than from the part before the colon makes `high:done` report nothing, and the severity check catches it.

## Notes

The suite loads the BUILT modules under `desktop/dist`, not the TypeScript sources. That is the house rule stated in `desktop/tests/helpers.mjs`: a check that reads source text survives the rename that breaks the behaviour it claims to protect.
