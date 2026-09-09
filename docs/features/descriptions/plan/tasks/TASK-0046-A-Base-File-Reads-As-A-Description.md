---
type: "[[task]]"
id: TASK-0046
aliases: ["TASK-0046"]
title: "A base file reads as a description — the parser half only, so the Vault phase inherits a language instead of inventing one"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
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

- [x] Copy the files into fixtures under `desktop/fixtures/bases/`, with the date they were read — thirteen, not twelve; `desktop/fixtures/bases/README.md` names where each came from
- [x] Implement the reader from base YAML to a description — `shared/base-file.ts`
- [x] Run it over all thirteen and record what each could not read — below
- [x] Extend [[TST-0030-A-Description-Parses-Or-Says-Why-Not]] with the fixture files

## Notes

The list of unsupported constructs this task produces is the input to [[PHASE-0003-Vault]]'s scope. It says, with names, how far the seed gets on a real vault and what the extension will have to cover — which is Edwin's point on 2026-09-08 that the subset "cannot represent everything".


## Done, 2026-09-09

**Thirteen files, not twelve.** Eleven live in `~/Notes` — four under `__bases__/`, one beside a project, six the TaskNotes plugin wrote — and two in the cockpit's `docs/__bases__/`. All thirteen are copied into `desktop/fixtures/bases/` so the suite does not depend on `~/Notes` being present, and so a change to one of Edwin's live files cannot quietly change what a test asserts.

**Every one of them yields at least one description.** Each view becomes a `query`-sourced description whose filter is the view's own filters combined with the file's, whose sort is the view's `sort`, and whose face names the picture and the columns the file named. Nothing is thrown away over a key the reader does not know.

## What each file could not be read as

**The four Comic views and the Galway one read completely.** Their filters, their orders, their sorts and their images all land. `Novel Base`'s four card views name `note.portrait`, `note.cover`, `note.scene` and `note.image` as their faces, which is exactly what the file says.

**The sidebar base's `or`-of-`and` parses**, as a filter tree with three `and` branches under one `or`. What it cannot EVALUATE is the four `this.`-relative filters inside it, and those are reported by name at evaluation time rather than at parse time — which is the right place, because the filter is readable and it is Deck that has no embedding note.

**The two Tasks bases read completely**, including `!status.containsAny("done", "cancelled")`, `scheduled < today() + "1 week"` and `status != ["done"]`.

**The six TaskNotes files are the honest test of the extension namespace, and they pass it.** Their four view types — `kanban`, `agenda`, `calendar`, `miniCalendar` — come back as named unsupported constructs, one per view, each saying which types Deck draws and that the view is drawn as a list instead. Their per-view keys that Obsidian does not define come back the same way. The rest of each file parses: the filters, the formulas and the orders all land, and a file whose plugin Deck has never heard of still produces working views.

**The two cockpit bases read completely**, filters and formulas included.

**What this says about the seed.** It reaches every construct in the files Edwin actually wrote, with two named exceptions: `this.`-relative filters, which need a surface that gives `this.` a meaning, and the TaskNotes formula block's list pipeline (`map`, `filter`, `reduce`, `format`). Those two are [[PHASE-0003-Vault]]'s input, which is what this task exists to produce.

**Nothing writes to a base file**, and the suite asserts it by reading the fixtures' modification times before and after.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh descriptions`: 17 checks, 2026-09-09, five of them over the fixtures.
