---
type: "[[feature]]"
id: FEAT-0012
aliases: ["FEAT-0012"]
title: "A view is a description: what a view selects, groups, bands and shows becomes a document Deck reads, in a language Deck owns"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[PHASE-0001-Deck]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
goal: "A Deck view stops being an id, a label and a sidecar mode with every other decision in code. It becomes a document with a source, a band rule, a card face, a list of surfaces and the registry as its verbs. The project-os provider emits seven of them that draw exactly what Deck draws today, and a base file from a vault reads as one."
requirements: []
tasks: ["[[TASK-0041-The-Description-Shape-And-Its-Parser]]", "[[TASK-0042-Seven-Descriptions-Equal-To-Todays-Views]]", "[[TASK-0043-The-Evaluator-Over-The-Index]]", "[[TASK-0044-Band-And-Face-Come-From-The-Description]]", "[[TASK-0045-The-Navigator-Draws-Any-Description]]", "[[TASK-0046-A-Base-File-Reads-As-A-Description]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[PHASE-0003-Vault]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[FEAT-0007-Views-Come-From-A-Provider]]", "[[FEAT-0011-Decks-Own-Index]]", "[[TASK-0029-The-Band-Function]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
---

# A view is a description

## Goal

**A view becomes something you can read, not something you have to find in the renderer.** Today a Deck view is three fields — an id, a label, and which sidecar navigation mode feeds it — and every other decision about it is code: which notes it selects, how they group, what a card shows, which of Glass's three bands a note stands in, and which surface may draw it at all. This feature turns those decisions into sections of one document.

Nothing a person sees changes on the day it lands. The project-os provider emits seven descriptions that reproduce Overview, Intent, Features, Issues, Tests, Publication and Library exactly, pinned by the fixture that already reads the cockpit's own navigator.

Three words mean one thing each. A **description** is a view written as data. The **seed** is the subset of Obsidian's Bases language, measured in Edwin's vault on 2026-09-08, that the first version of Deck's language understands. An **extension key** is a key in Deck's own namespace, which no base file uses, and which is how the language grows without pretending to be Bases.

## Scope

**In scope.**

- **The description's five sections.** `source` is one of two kinds: `mode`, where a sidecar navigation mode's groups are the arrangement, or `query`, where filters, sort and grouping run over [[FEAT-0011-Decks-Own-Index]]. `band` is the front, mid and deep rule. `face` says what a card shows, by property name. `surfaces` lists which of list, Spread and Glass may draw the view. `verbs` is the single word `registry`.
- **A version number on every description, and an extension namespace from version one.** Edwin's answer of 2026-09-08 is that the Bases subset is an initial definition and Deck will need to extend it, probably significantly. The version and the namespace are what make that possible without a migration; they are cheap now and impossible to retrofit later.
- **A parser that refuses what it cannot read**, and reports the construct by name. An unsupported filter never returns an empty list, because an empty view and a broken view look identical.
- **An evaluator for the seeded subset** over Deck's index: filters with `and`, `or`, `not`, the six comparison operators, the functions the vault's ten base files actually use, sort, `groupBy`, and formulas as far as the seed needs them.
- **The three type spellings normalised.** `type.contains(link("Chapter"))`, `type == link("Task")` and `note.type == "[[Task]]"` mean one thing, decided once.
- **`faces.ts` becomes a reader.** The face per type stops being a branch and becomes the description's `face` section. The status bands Deck copies from the cockpit stay a copy, pinned by a fixture read off `statuses.py`, until the cockpit serves a vocabulary payload.
- **The navigator draws any description**, whichever kind its source is.
- **A base file reads as a description**: the parser half, so that a `.base` from `~/Notes` can be turned into one and its unsupported constructs named.

**Out of scope.**

- **The Vault provider itself**, which finds a vault's base files and offers them as the workspace's views. That is [[PHASE-0003-Vault]]; only the parser it will use is built here.
- **Generated editors and pick-lists.** A description says what a card shows, not what a form edits. Editors wait on a guarded property-write endpoint the sidecar does not have.
- **Flows.** They are a concept with a reserved seam ([[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]]) and nothing is built.
- **Writing a description back to disk.** Deck reads descriptions; it does not edit base files, which is the rule [[PHASE-0001-Deck]] already states about files Obsidian owns.

**Not asked of the cockpit.** No records endpoint, by Edwin's decision of 2026-09-08. A vocabulary payload — the status bands, the severity order, the known types — is still owed and is filed as an issue there the day [[TASK-0044-Band-And-Face-Come-From-The-Description]] starts.

## Acceptance

- The seven project-os views are seven descriptions, and Deck draws exactly what it draws today, asserted by the fixture read off the cockpit's navigator.
- Every description carries a version, and every key outside the seeded language sits in Deck's own namespace, asserted by the parser rather than by convention.
- A `.base` file from `~/Notes` parses into a description, and every construct the evaluator does not support is reported by name. No unsupported view ever renders as an empty list.
- A card's band and a card's face are read from the description. `faces.ts` holds no `if` on a note's type, and the status bands it still copies are pinned to the cockpit's `statuses.py` by a fixture that fails when they drift.
- The navigator draws a query-sourced description over Deck's index with the same grouping, folding and counts it draws for a mode-sourced one.
- The three spellings of "this note is of type X" produce the same result, asserted over all three.

## Links

- Phase: [[PHASE-0001-Deck]]
- Decision: [[ADR-0004-A-View-Is-A-Description]]
- Tasks: [[TASK-0041-The-Description-Shape-And-Its-Parser]], [[TASK-0042-Seven-Descriptions-Equal-To-Todays-Views]], [[TASK-0043-The-Evaluator-Over-The-Index]], [[TASK-0044-Band-And-Face-Come-From-The-Description]], [[TASK-0045-The-Navigator-Draws-Any-Description]], [[TASK-0046-A-Base-File-Reads-As-A-Description]]
- Risk: [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]
- Plan: `docs/features/descriptions/plan/PLAN.md`
- Acceptance walk: [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]]


## Where this stands

**2026-09-09: built, and at `review` waiting on the walk a person makes.** All six tasks are `done`. A view is a document with five sections; the project-os provider emits seven of them and nothing a person sees changed. `faces.ts` holds no note type. One band function serves every surface. A query-sourced description runs over Deck's own index and draws through the same group model a mode-sourced one does. Every base file Edwin has written reads as a description, and where the seed stops it says so by name.

**Three things this found rather than assumed.**

Deck's copy of the status vocabulary had drifted from the cockpit's within two days of being written — `draft`, `proposed` and `ready` in a "doing" band where `statuses.py` puts all three in `pending`. It is now the cockpit's own six band names, pinned by a fixture recorded from that file, and [[project-os-cockpit#ISS-0292]] asks for it to be served so no client has to copy it.

A view that gathers its own obligations marks the GROUP rather than each item, so reading the item alone put nothing in Your Trainer's front band while forty issues waited for triage. The real payload fixture is what showed it.

Overview is the one view the shape cannot carry, and the extension namespace is where that fact is written rather than a branch in the renderer. It is not a view of notes; it should be a page, and the address grammar already has the key waiting ([[TASK-0042-Seven-Descriptions-Equal-To-Todays-Views]]).

**What is owed is [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]]**, which a person walks against three base files of different shapes.
