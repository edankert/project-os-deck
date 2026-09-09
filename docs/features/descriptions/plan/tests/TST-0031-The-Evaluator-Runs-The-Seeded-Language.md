---
type: "[[test]]"
id: TST-0031
aliases: ["TST-0031"]
title: "The evaluator runs the seeded language over Deck's index, the three type spellings agree, and nothing unsupported returns an empty list without saying so"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/evaluator.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh evaluator"
covers: ["[[FEAT-0012-A-View-Is-A-Description]]"]
issues: []
tasks: ["[[TASK-0043-The-Evaluator-Over-The-Index]]", "[[TASK-0045-The-Navigator-Draws-Any-Description]]"]
artifacts: []
adequacy: "Returning an empty list for an unsupported construct fails the report check, which asserts every selection path carries a report or a reason. Implementing two of the three type spellings and not the third fails the equality check. Adding a function to the evaluator without adding it to the named seed fails the enumeration check, which walks the seed list rather than the implementation."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]", "[[FEAT-0011-Decks-Own-Index]]"]
---

# The evaluator runs the seeded language

## Purpose

A description whose source is a query selects notes by running over Deck's index. Two things can go wrong and only one of them looks wrong: an unsupported construct returning nothing, and a supported construct returning the wrong notes. Obsidian evaluates the same files with its own engine ([[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]), so this suite's job is to make Deck's limits explicit rather than to claim they do not exist.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0031` reproduces it locally without writing anything.

## Procedure

- Build fixture indexes from this repository's notes and from the vault's, and evaluate against those.
- Assert `and`, `or`, `not` and `!` select the right notes, including the `or`-of-`and` shape the vault's sidebar base uses.
- Assert all six comparison operators behave, and that date addition behaves over records whose values are dates.
- Walk the named seed's function list and assert each function either evaluates or is reported unsupported by name. The walk reads the seed list, so a function nobody implemented cannot pass by being absent from the suite.
- Assert the three type spellings — `type.contains(link("Chapter"))`, `type == link("Task")` and `note.type == "[[Task]]"` — return identical results over the same fixture.
- Assert sort by property with a direction produces the stated order, and that `groupBy` produces the stated groups.
- Assert an unsupported construct yields a report naming the construct and its location, plus the notes the evaluator could still select.
- Assert no path returns an empty list without a report beside it.
- Assert a `this.`-relative filter is reported unsupported by name rather than evaluated against nothing.
- Assert the property namespaces `note.`, `file.`, `formula.` and `this.` resolve to what they name.
- Draw a query-sourced description through the navigator's group model and assert the same headings, counts, folding and children a mode-sourced view produces over the same notes.
- Assert what is owed is at the top of a query-sourced view, read from the navigation payload rather than computed.
- Assert a view whose subject the sidecar does not track draws with no owed group and states that, rather than drawing an empty heading.
- Assert switching between a mode-sourced and a query-sourced view leaves no card of the previous view on screen, which is [[ISS-0001-Cards-From-The-Previous-View-Stay-On-Screen]]'s defect.

## Expected results

- The language Deck says it supports is the language it supports, enumerated rather than asserted.
- Where Deck cannot evaluate something, a person is told what and where.
- A query-sourced view is indistinguishable from a mode-sourced one to the code that draws it.

## Evidence (fill after running)

- `bash tools/scripts/run-desktop-tests.sh evaluator`: the check count and the date.
- The seed's function list as it stood on that date, and how many of them evaluate rather than report.

## Adequacy (who verifies this test?)

The enumeration is what stops this suite from being decorative: it walks the named seed rather than the implementation, so an unimplemented function is a failure instead of an untested case. The check that no selection path returns an empty list without a report is the one that guards the actual risk. Neither can tell whether Deck and Obsidian agree about a real file — that comparison is a person's, in [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]].
