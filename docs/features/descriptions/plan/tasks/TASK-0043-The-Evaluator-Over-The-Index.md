---
type: "[[task]]"
id: TASK-0043
aliases: ["TASK-0043"]
title: "The evaluator for the seeded language over Deck's index: filters, functions, sort and grouping, with anything unsupported named rather than silently empty"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
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

- [x] Write the seed's grammar down in one place — `SEED_FUNCTIONS` in `shared/expression.ts`, which the suite walks
- [x] Implement the filter tree, the comparisons and the property namespaces over the record shape
- [x] Implement the functions the measured base files use; report the rest
- [x] Write the type-spelling normalisation as one named function — `same()` — and test all three spellings against it
- [x] Implement sort and `groupBy`
- [x] Build the fixture indexes and the unsupported-construct cases
- [x] Write [[TST-0031-The-Evaluator-Runs-The-Seeded-Language]] and link it from `tests:` — written at planning time; its evidence is filled in

## Notes

**Two programs now evaluate this language over the same files**, Obsidian and Deck, and they can disagree. That is [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]. The mitigation is exactly the two rules above: the seed is named rather than assumed, and what falls outside it is reported instead of quietly producing a different answer.


## Done, 2026-09-09

**The seed is a list in the code, and the suite walks THAT list.** `SEED_FUNCTIONS` names every function the twelve measured base files call. For each one the suite asserts either that it evaluates or that it reports itself unsupported by name — so a function nobody implemented cannot pass by being absent from the suite as well as from the evaluator. Twenty-six evaluate; eleven are named and not implemented, and each says "is in the measured language and this build does not evaluate it".

**What is not implemented, and why it is worth leaving so.** `map`, `filter`, `reduce`, `format`, `image`, `icon`, `sort`, `unique`, `slice`, `split`, `join` — the list pipeline and the date formatting the TaskNotes plugin's forty-formula block uses. They belong to a plugin's own views, not to the four Comic views or the two Tasks bases, and implementing a `reduce` before anything draws its result would be guessing at what it should produce.

**The three type spellings are ONE function.** `type.contains(link("Chapter"))`, `type == link("Task")` and `note.type == "[[Task]]"` all reach `same()`, which reduces a link to its target on both sides and compares case-insensitively. The suite asserts the three select identical notes over the same fixture, including a note whose `type:` is a list.

**`this.` is a named unsupported case, not an empty answer.** The vault's sidebar base filters relative to the note it is embedded in and Deck has no such note. Selecting nothing quietly would be a view that looks empty for a reason nobody can read; it reports `this.` with the sentence "a `this.`-relative filter names the note a view is embedded in, and no Deck surface has one yet".

**Nothing sorts last, whichever way round the sort was asked for.** A note with no due date is not the most urgent one, and reversing the order must not make it so, so presence is decided outside the direction flip. That was a real defect the suite caught: descending order put every missing value first.

**Obligations stay the sidecar's.** A query decides which notes a view holds; owed and suppressed are read from a navigation payload for a mode the description NAMES, in Deck's own namespace. The mode is in the description and not in the renderer, which holds no view name at all — the check that enforces that caught the first version of this, which read `features` from a literal.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh evaluator`: 20 checks, 2026-09-09.
- A query over this repository's REAL index — 199 records, walked by Deck's own walk — selects its issues and its fixed issues, and the cards carry their records so a face can read a property by name.
