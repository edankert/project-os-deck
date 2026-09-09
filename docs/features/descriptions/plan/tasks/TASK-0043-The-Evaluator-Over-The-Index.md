---
type: "[[task]]"
id: TASK-0043
aliases: ["TASK-0043"]
title: "The evaluator for the seeded language over Deck's index: filters, functions, sort and grouping, with anything unsupported named rather than silently empty"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
parent: "FEAT-0012"
effort: ""
due: ""
depends: ["TASK-0041", "TASK-0038"]
blocks: ["TASK-0045", "TASK-0046"]
related: ["[[FEAT-0012-A-View-Is-A-Description]]", "[[FEAT-0011-Decks-Own-Index]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]", "[[ADR-0004-A-View-Is-A-Description]]"]
tests: ["[[TST-0031-The-Evaluator-Runs-The-Seeded-Language]]"]
---

# The evaluator over the index

## Objective

A description whose source is a query returns a list of notes, grouped and sorted, by running over [[FEAT-0011-Decks-Own-Index]]'s records. The language it evaluates is the seed: the subset of Obsidian's Bases language measured across the ten live base files in `~/Notes` on 2026-09-08. Anything outside that subset is reported by name.

## Detail

**What the seed contains** ([[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]], Part 2, "What a view is in the vault"). Filters combined with `and`, `or`, `not` and `!`, including the one `or`-of-`and` the vault actually uses. The six comparison operators, and date addition. The twenty-two functions those files call, led by `date`, `if`, `today`, `number`, `list`, `map`, `filter`, `reduce`, `contains` and `link`. Sorting by a property with a direction. Grouping by a property. Property namespaces `note.`, `file.`, `formula.` and `this.`. Formulas as far as the ten measured files need them, and no further.

**The three type spellings are normalised, and the decision is written down.** `type.contains(link("Chapter"))`, `type == link("Task")` and `note.type == "[[Task]]"` all appear in the vault, and they mean the same thing to a person. They mean one thing here too. Which one is canonical is this task's decision; what matters is that all three reach it and that the rule is a single named function rather than three branches.

**Unsupported is a named result.** A construct the evaluator does not implement returns the notes it could select plus a report naming the construct and where it appeared. It never returns an empty list, because an empty view and a broken view look identical on screen and only one of them is a bug. `this.` is the case to watch: the vault's sidebar base filters relative to the note it is embedded in, and Deck may have no such note. That is a named unsupported case until a Deck surface gives `this.` a meaning.

**Obligations stay the sidecar's judgement.** Whether a note is owed, and whether it is suppressed, is decided by the cockpit's registry and arrives on the navigation payload. A query-sourced view still reads those two facts from the sidecar rather than computing them; the query decides which notes the view holds, not what they owe.

## Acceptance

- A query with `and`, `or`, `not` and `!` selects the right notes from a fixture index, including the vault's `or`-of-`and` shape.
- All six comparison operators work, and date addition works, over records whose values are dates.
- Every function in the measured list either evaluates or is reported as unsupported by name; the suite enumerates the list so a missing one cannot pass silently.
- The three type spellings return identical results over the same fixture.
- Sort by property with a direction, and `groupBy` a property, produce the order and the groups the description asked for.
- An unsupported construct yields a report naming the construct and its location, and the notes the evaluator could still select. No path returns an empty list without a report.
- `this.`-relative filters are reported as unsupported by name rather than evaluated against nothing.
- The evaluator is pure, runs without Electron, and is tested over fixture indexes built from this repository and from the vault.

## Steps

- [ ] Write the seed's grammar down in one place, as the list the suite enumerates.
- [ ] Implement the filter tree, the comparisons and the property namespaces over the record shape.
- [ ] Implement the functions the ten measured base files use; report the rest.
- [ ] Write the type-spelling normalisation as one named function and test all three spellings against it.
- [ ] Implement sort and `groupBy`.
- [ ] Build the fixture indexes and the unsupported-construct cases.
- [ ] Write [[TST-0031-The-Evaluator-Runs-The-Seeded-Language]] and link it from `tests:`.

## Notes

**Two programs now evaluate this language over the same files**, Obsidian and Deck, and they can disagree. That is [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]. The mitigation is exactly the two rules above: the seed is named rather than assumed, and what falls outside it is reported instead of quietly producing a different answer.
