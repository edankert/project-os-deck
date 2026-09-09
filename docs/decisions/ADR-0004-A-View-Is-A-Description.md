---
type: "[[adr]]"
id: ADR-0004
aliases: ["ADR-0004"]
title: "A view is a description, evaluated over Deck's own index, in a language Deck owns and seeds from Obsidian Bases"
status: accepted
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source:
  - "Edwin 2026-09-08, answering the architecture review's first question: 'Decks own index, the Decks application are individual applications/views'"
  - "Edwin 2026-09-08, answering the second: 'the issue with using the bases subset is that it is a subset which we know cannot represent everything, it might be possible to use it as an initial definition but we will need to be able to extend it probably significantly'"
  - "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]], Part 2"
decision: "A Deck view is a document, not three fields of code. It has a source (a sidecar nav mode, or a query Deck evaluates over its own index of the workspace's Markdown), a band rule, a card face, a list of surfaces that may draw it, and the registry as its verbs. Deck builds and keeps that index in its own main process and asks the cockpit for no records endpoint. The description language is Deck's own: its first version is seeded with the Bases subset measured in the vault, so every base file Edwin has written already reads as a description, and it carries a version number and an extension namespace of Deck's own from version one."
context: "A view in Deck today is an id, a label and which sidecar mode feeds it. Everything else — which notes it selects, how they group, what a card shows, which band a note lands in, which surface may draw it — is code in the renderer or in a task planned for Glass. The cockpit's own views are code too, in one seven-thousand-line file, and it serves no endpoint that returns every note with its frontmatter."
alternatives:
  - "The source is always a sidecar nav mode, and Deck never evaluates a query"
  - "The cockpit grows a records endpoint and Deck evaluates queries over that"
  - "The sidecar gains a Bases evaluator and serves the result as groups"
  - "Deck adopts Obsidian's Bases language as its own, unversioned and unextended"
consequences:
  - "Deck gains a second indexer of the same notes the sidecar indexes, which can drift; the drift is pinned by a fixture and recorded as [[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]"
  - "Two programs now evaluate the Bases language over the same base files, and they can disagree; recorded as [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]"
  - "[[TASK-0029-The-Band-Function]] becomes the band section of every description rather than a module Glass owns, so the list, Spread and Glass read one rule"
  - "faces.ts stops deciding a card's face by type in code and becomes a reader of the description's face section"
  - "PHASE-0002 starts after the description feature rather than immediately"
  - "The Vault phase inherits a query language instead of inventing one, and its provider reads base files into descriptions"
  - "No records endpoint is asked of the cockpit; the review's proposal to file one is withdrawn"
supersedes: ""
superseded: ""
related: ["[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[PHASE-0003-Vault]]", "[[FEAT-0011-Decks-Own-Index]]", "[[FEAT-0012-A-View-Is-A-Description]]", "[[FEAT-0007-Views-Come-From-A-Provider]]", "[[TASK-0029-The-Band-Function]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]", "[[project-os-cockpit#ISS-0279]]"]
---

# A view is a description, evaluated over Deck's own index

## Context

**A view in Deck is three fields, and every other decision about it is code somewhere else.** `desktop/src/shared/views.ts` holds an id, a label and which sidecar navigation mode feeds the view. Which notes the view selects, how they are grouped, what a card shows, which of Glass's three bands a note stands in, and which surface may draw it at all are decided in the renderer, in `faces.ts`, or in a task planned for Glass that would put yet another table in yet another module.

Three symptoms of that were measured on 2026-09-08 ([[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]], Part 1). Deck's band vocabulary already disagrees with the cockpit's: `faces.ts` calls `draft`, `proposed` and `ready` "doing" and the cockpit's `statuses.py` calls all three "pending". A vault type has no face, because `faceFor` names `test` and `issue` in code. And [[TASK-0029-The-Band-Function]] was about to write a per-view band table into a Glass-only module, so the navigator, Spread and Glass would each read a view's rules from a different place.

**Edwin has already written view descriptions, in Obsidian's Bases language.** Ten live base files in `~/Notes` express filters, sorts, grouping, card images and column order in one YAML shape, and the cockpit repository describes six of its own views the same way in `docs/__bases__/NAVIGATION.base`. The subset actually in use is small and was measured: four top-level keys, nineteen view keys, six view types, `and`/`or`/`not`, six comparison operators, twenty-two functions, and four property namespaces. Three different spellings of "this note is of type X" coexist in it.

**The question that is not cheap is where a query is evaluated, because Deck holds no notes.** The cockpit's GET routes answer per navigation mode and per note. There is no endpoint that returns every note with its frontmatter, so a description with a query source has nothing to evaluate over.

## Options

1. **The source is always a sidecar mode.** The description names a mode, the sidecar's groups are the arrangement, and Deck adds band, face and surfaces on top. It reads nothing new and gets parity with the cockpit by construction. It can express no vault base and no view the cockpit does not already build.
2. **The cockpit grows a records endpoint.** Every note with its frontmatter, filed as an issue in the cockpit repository the day the feature starts. Deck then evaluates queries over it. It makes Deck's view language wait on another repository's queue.
3. **The sidecar gains a Bases evaluator** and serves the result as groups. The largest cockpit change, and it moves the whole question out of Deck — which Edwin already ruled against on 2026-09-06, when he decided the list of views is Deck's concern.
4. **Deck builds its own index** of the workspace's Markdown in its main process and evaluates queries over that. It asks the cockpit for nothing. It costs a second indexer of the same files.

And, separately, whether Deck's description language *is* Obsidian's Bases language or merely starts from it.

## Decision

**Option 4 for evaluation, and a language of Deck's own seeded from Bases.** Both halves are Edwin's, decided on 2026-09-08.

**Deck keeps its own index.** "Decks own index, the Decks application are individual applications/views." Deck's main process reads the workspace's Markdown, parses each file's frontmatter, keeps a record per note and watches for changes. The cockpit is asked for no records endpoint, and the review's proposal to file that issue is withdrawn. The sidecar is still read for everything it is the authority on: the navigation groups, the rendered note, the context of a note, the statistics, and every write.

**A description has five sections and each has one owner.** `source` is one of two kinds — `mode`, where a sidecar navigation mode's groups are the arrangement, or `query`, where filters, sort and grouping run over Deck's index. `band` is the front, mid and deep rule, which is where [[TASK-0029-The-Band-Function]]'s table now lives. `face` says what a card shows, by property name rather than by code. `surfaces` lists which of list, Spread and Glass may draw this view. `verbs` is the single word `registry`, never a restated verb list, because that is the cockpit's [[project-os-cockpit#REQ-0026]].

**The language is Deck's, and its first version is the measured Bases subset.** Edwin: "the issue with using the bases subset is that it is a subset which we know cannot represent everything, it might be possible to use it as an initial definition but we will need to be able to extend it probably significantly." So Deck does not adopt Bases; it seeds from it. Every base file in the vault reads as a Deck description on the first day, and from version one the language carries two things Bases does not give it: a version number on every description, and an extension namespace of Deck's own that a base file will never use. That is the shape a registered Bases view type already has, where a plugin's keys sit beside the core's in the same entry.

**Two rules the language states from the start.** The three spellings of "this note is of type X" — `type.contains(link("Chapter"))`, `type == link("Task")` and `note.type == "[[Task]]"` — are normalised to one meaning rather than three code paths. And a construct the evaluator does not support is reported by name. An unsupported filter never silently returns an empty list, because an empty view and a broken view look identical on screen and only one of them is a bug.

**The project-os provider emits seven mode-sourced descriptions** that reproduce today's views exactly, pinned by the fixture [[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]] already reads off the cockpit's navigator. Nothing a person sees changes on the day this lands.

## Alternatives

- The source is always a sidecar navigation mode, and Deck never evaluates a query.
- The cockpit grows a records endpoint and Deck evaluates over that.
- The sidecar gains a Bases evaluator and serves the result as groups.
- Deck adopts Obsidian's Bases language unchanged, with no version and no extension namespace.

## Consequences

- **Deck indexes the same notes the sidecar indexes, and the two can drift.** That is [[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]. The mitigation is that Deck mirrors the sidecar's normalisation rules and a fixture asserts that Deck's typed counts equal the sidecar's library groups, so a drift fails a test rather than surprising a person. Deck also gets [[project-os-cockpit#ISS-0279]]'s bug to avoid rather than to inherit: a list-valued `type:` must count under each of its values.
- **Two programs now evaluate Bases over the same files.** That is [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]: Obsidian shows one thing and Deck shows another for the same base file. The mitigation is the named subset and the "not supported, named" rule, so a divergence appears as a message rather than as a different list.
- **[[TASK-0029-The-Band-Function]] moves.** Its acceptance is unchanged and its table becomes the `band` section of every description, so the navigator, Spread and Glass fold and band by one rule.
- **`faces.ts` stops holding a vocabulary.** It becomes a reader of the description's `face` section. The status bands it copies from the cockpit stay a copy until the cockpit serves a vocabulary payload, and until then the copy is pinned by a fixture read off `statuses.py`.
- **Glass starts later.** [[PHASE-0002-Glass]] begins after the description feature rather than now. What it buys is that Glass builds on a description instead of on a table of its own.
- **The Vault phase inherits a query language.** [[PHASE-0003-Vault]] no longer has to invent one; its provider reads base files into descriptions. The parser half of that lands here, so a base file can be read; the provider itself stays in that phase.
- **A vocabulary payload is still owed by the cockpit.** The status bands, the severity order and the known types are not served as data anywhere. That issue is filed in the cockpit repository the day the Deck task that needs it starts, following the pattern [[TASK-0001-The-Whole-Edge-List-Is-One-Payload]] set.
