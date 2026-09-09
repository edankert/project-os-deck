---
type: "[[task]]"
id: TASK-0046
aliases: ["TASK-0046"]
title: "A base file reads as a description — the parser half only, so the Vault phase inherits a language instead of inventing one"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
parent: "FEAT-0012"
effort: ""
due: ""
depends: ["TASK-0041", "TASK-0043"]
blocks: []
related: ["[[FEAT-0012-A-View-Is-A-Description]]", "[[PHASE-0003-Vault]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]"]
tests: ["[[TST-0030-A-Description-Parses-Or-Says-Why-Not]]"]
---

# A base file reads as a description

## Objective

Given the text of an Obsidian `.base` file, Deck produces a description and a list of what it could not read. That is all this task does. Finding a vault's base files, deciding which of them become views, and offering them in the switcher is the Vault provider, and it stays in [[PHASE-0003-Vault]].

## Detail

**The value here is that it proves the seed was measured rather than guessed.** The ten live base files in `~/Notes` are the material the seed was taken from. Running the parser over all ten, and over the two in the cockpit's own `docs/__bases__/`, says whether the language Deck built can actually read the files Edwin has written. A construct it cannot read is a finding about the seed, recorded here, not a failure of the file.

**What the ten files contain** ([[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]], Part 2). Four card views under `__bases__/Comic/`, each filtered by type, ordered by a property list, sorted by number, with a portrait, cover, scene or image as the card face. A six-view sidebar base whose filters are all relative to the embedding note, including the one `or`-of-`and`. Two Tasks bases with date arithmetic and negated status lists. Five TaskNotes files that add four view types of their own and a forty-formula block.

**The TaskNotes files are the honest test of the extension namespace.** Their view types and view keys are a plugin's, not Obsidian's, exactly as Deck's own extension keys will be. They should come back as named unsupported constructs, cleanly, rather than as a parse failure — which is what says the namespace idea works.

**The `.base` file is read and never written.** [[PHASE-0001-Deck]] already puts writing any file Obsidian owns out of scope, and this task does not change that.

## Acceptance

- All ten live base files in `~/Notes` and both in the cockpit's `docs/__bases__/` parse into a description, each with its list of unsupported constructs.
- Every unsupported construct is named with what it was and where it appeared; none is reported as a generic failure.
- The TaskNotes view types and keys are reported as unsupported by name and do not prevent the rest of the file parsing.
- The four Comic card views produce descriptions whose `face` names the portrait, cover, scene or image the file names.
- The `or`-of-`and` filter in the sidebar base parses.
- A copy of each file, or a reduced version carrying the same constructs, is checked into the repository as a fixture so the suite does not depend on `~/Notes` being present.
- Nothing writes to a `.base` file at any point.

## Steps

- [ ] Copy or reduce the twelve files into fixtures under `desktop/fixtures/`, with the date they were read.
- [ ] Implement the reader from base YAML to a description, over [[TASK-0041-The-Description-Shape-And-Its-Parser]]'s parser and [[TASK-0043-The-Evaluator-Over-The-Index]]'s grammar.
- [ ] Run it over all twelve and record, in this note's Notes, what each one could not read.
- [ ] Extend [[TST-0030-A-Description-Parses-Or-Says-Why-Not]] with the fixture files.

## Notes

The list of unsupported constructs this task produces is the input to [[PHASE-0003-Vault]]'s scope. It says, with names, how far the seed gets on a real vault and what the extension will have to cover — which is Edwin's point on 2026-09-08 that the subset "cannot represent everything".
