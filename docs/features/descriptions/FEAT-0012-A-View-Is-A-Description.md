---
type: "[[feature]]"
id: FEAT-0012
aliases: ["FEAT-0012"]
title: "A view is a description: what a view selects, groups, bands and shows becomes a document Deck reads, in a language Deck owns"
status: done
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
reviewed_by: model:claude-opus-5
review_date: 2026-09-09
review_verdict: approved
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


## Independent review — 2026-09-09

**Verdict: changes-requested.** Clean context and a separate session; the same model family as the author, recorded in `reviewed_by`. The description shape, the parser, the band function and the status fixture are sound and well guarded. The findings are all in the evaluator, and they are all the one shape this feature says it exists to prevent: a wrong answer produced quietly, where the note promises either the right answer or a named report.

**The claim under test.** This note's acceptance says "every construct the evaluator does not support is reported by name. No unsupported view ever renders as an empty list", and [[ADR-0004-A-View-Is-A-Description]] says "a construct the evaluator does not support is reported by name. An unsupported filter never silently returns an empty list". Both are true of constructs the evaluator knows it cannot run. Neither covers a construct it thinks it can run and runs differently from Obsidian, and there are four of those.

**Finding 1 (blocking): `contains` on a string tests equality, where Obsidian tests substring.** `desktop/src/shared/expression.ts:510-511` wraps a scalar in a one-element list and compares with `same()`, so `title.contains("Draft")` over `title: "Draft One"` is `false`. Reproduced. `containsAny` and `containsAll` do the same. Nothing is reported. A view written in Obsidian that finds notes finds none in Deck, and the screen says the view is empty.

**Finding 2 (blocking): `hasLink` ignores the property it was called on.** `expression.ts:525-528` answers from `linksIn(context.record)`, which walks the whole frontmatter, so `owner.hasLink(link("Zed"))` is `true` for a note whose `owner` is `[[Ann]]` and whose `related` contains `[[Zed]]`. Reproduced. This selects too many notes rather than too few, silently. Separately, Deck's records hold no body links at all ([[TASK-0038-Records-From-The-Workspaces-Markdown]] decided the body is not kept), so `file.hasLink` can never see a link Obsidian would — also unreported.

**Finding 3 (blocking): `==` on strings is case-insensitive, where Obsidian's is not.** `same()` lower-cases both sides (`expression.ts:625`). `title == "draft one"` matches `title: "Draft One"`. Reproduced. [[TASK-0043-The-Evaluator-Over-The-Index]] states this as a property of `same()` and it is the right rule for the three type spellings; it is applied to every string comparison, and no note says so. This is the coercion decision [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]] names as having "more than one defensible answer" — the answer is defensible, it is just not written down where a person comparing two screens would find it.

**Finding 4 (blocking): `file.path` is docs-root-relative, so `inFolder` in a real base file is inert.** `fileOf` (`expression.ts:382-394`) builds `path` from `record.relPath`, which the walk makes relative to the docs root. A `.base` file written for the same repository in Obsidian uses vault-relative paths. Reproduced against the cockpit's own `docs/__bases__/NAVIGATION.base`, checked in at `desktop/fixtures/bases/cockpit-navigation.base`: its `not: file.inFolder("docs/__templates__")` matches nothing, so running its "Features (All)" view over this repository's 200 records selects 14 notes — the 13 features plus `__templates__/feature.md`. Nothing is reported. The exclusion that base file relies on is not doing anything, and neither is `.trash` or `.obsidian` (harmless only because the walk already skips those).

**Finding 5 (non-blocking): an unsupported report with no construct name.** Running `desktop/fixtures/bases/tasks-daily.base` yields an entry whose `construct` is the empty string, from an empty formula body — `{construct: "", where: "source.formulas.Untitled", reason: "\"\" cannot start an expression (at character 0)"}`. [[TASK-0046-A-Base-File-Reads-As-A-Description]]'s criterion says "Every unsupported construct is named with what it was", and `desktop/tests/descriptions.test.mjs:188` asserts `construct.length > 0` — but only over the parser's refusals, never over the evaluator's runtime `unsupported` list, which is where this one appears.

**Finding 6 (non-blocking, documentation): an acceptance criterion that asks for something that does not exist anywhere.** [[TASK-0044-Band-And-Face-Come-From-The-Description]]'s criterion and [[TST-0032-Band-And-Face-Follow-The-Description-And-The-Vocabularies-Match-The-Cockpit]]'s procedure both require that Deck's status bands "assert `final` is present". `final` is in neither `desktop/src/shared/statuses.ts`, nor `desktop/fixtures/cockpit-statuses.json`, nor the cockpit's `statuses.py`. TASK-0044's Done section explains that adding it would have been wrong; the criterion and the test procedure were left saying the opposite, and the task is `done`.

**What was checked and found sound.** The seven provider descriptions parse with zero refusals and name `list` and `spread` and never `glass`; removing the version check fails 2 checks, and making the surface vocabulary accept anything fails 7. The band function is real: forcing `bandOf` to return `mid` fails 6 checks, and the overflow counts are measured over recorded `nav_payload` fixtures. The status copy is pinned — `STATUS_BANDS`, `COMPLETED_STATUSES` and `LEGACY_STATUS_BANDS` all equal the fixture recorded from `statuses.py`, and I re-verified the equality outside the suite. Removing `report()` so unsupported constructs pass silently fails 6 checks, and breaking `same()`'s link normalisation fails 10, so the reporting guarantee that IS claimed is guarded. All thirteen base fixtures parse and run; the `this.`-relative filters and the TaskNotes formula pipeline come back named, as the note says.

## Where this stands

**2026-09-09: built, and at `review` waiting on the walk a person makes.** All six tasks are `done`. A view is a document with five sections; the project-os provider emits seven of them and nothing a person sees changed. `faces.ts` holds no note type. One band function serves every surface. A query-sourced description runs over Deck's own index and draws through the same group model a mode-sourced one does. Every base file Edwin has written reads as a description, and where the seed stops it says so by name.

**Three things this found rather than assumed.**

Deck's copy of the status vocabulary had drifted from the cockpit's within two days of being written — `draft`, `proposed` and `ready` in a "doing" band where `statuses.py` puts all three in `pending`. It is now the cockpit's own six band names, pinned by a fixture recorded from that file, and [[project-os-cockpit#ISS-0292]] asks for it to be served so no client has to copy it.

A view that gathers its own obligations marks the GROUP rather than each item, so reading the item alone put nothing in Your Trainer's front band while forty issues waited for triage. The real payload fixture is what showed it.

Overview is the one view the shape cannot carry, and the extension namespace is where that fact is written rather than a branch in the renderer. It is not a view of notes; it should be a page, and the address grammar already has the key waiting ([[TASK-0042-Seven-Descriptions-Equal-To-Todays-Views]]).

**What is owed is [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]]**, which a person walks against three base files of different shapes.



## The sixth pass's findings, discharged 2026-09-09

The verdict above was recorded before the fixes. All six findings are `fixed` and each was reproduced before being acted on; the verdict itself is stale and a seventh pass has not been run.

| finding | note | how it was settled |
| --- | --- | --- |
| Deck can stop offering a tick control and nothing notices | [[ISS-0053-Deck-Can-Stop-Offering-A-Tick-And-Nothing-Notices]] | the smoke run presses a real tick and a real refusal; deleting `attachTicks` fails 1 check, accepting a tick with no evidence fails 3 |
| the smoke runner cannot start where it must | [[ISS-0054-The-Smoke-Runner-Cannot-Start-Where-It-Must]] | it resolves its own path before changing directory, installs nothing, and TST-0037 declares how it is invoked instead of promising a gate that cannot host it |
| two re-measured numbers still disagree with themselves | [[ISS-0055-Two-Re-Measured-Numbers-Still-Disagree-With-Themselves]] | corrected in the criterion as well as the prose, and an unreadable date is now reported as unconfirmable rather than expired |

**Measured at commit `d0a148e`:** 322 node checks passing, 23 of 23 commanded tests, both smoke configurations `ok` with nothing skipped, `check-write-round-trip.mjs` 18 of 18 with a clean tree, `check-counts-live.py` no disagreements across three corpora, `check-bases-live.mjs` no failures across 46 views, `validate-docs --as-committed` passing the full CI step set.

**What is not settled.** Six review rounds have each found real defects, and each round's fix produced the next round's finding. That is a fact about the process, not a defect in this feature, and whether to run a seventh pass is Edwin's call.

## Independent review, 2026-09-09: changes requested, and made

**Four evaluator paths selected the wrong notes and reported nothing** — which is the exact failure this feature and [[ADR-0004-A-View-Is-A-Description]] say it exists to prevent, so the finding lands squarely ([[ISS-0027-Four-Evaluator-Paths-Select-The-Wrong-Notes]]).

`contains` on a string tested equality rather than substring, so `title.contains("Draft")` was false over `title: "Draft One"`. `hasLink` ignored its receiver and searched the whole record. `==` on strings was case-insensitive where Obsidian's is not. And `file.path` was docs-root-relative while a base file's `inFolder` is written against the vault root, so the cockpit's own `NAVIGATION.base` selected fourteen notes here where the cockpit shows thirteen — its `docs/__templates__` exclusion had never matched anything.

**All four are fixed, and the check that proves it runs the cockpit's own base file over this repository's real index** and asserts the counts view by view. Two smaller things went with them: a `groupBy` written as a map was silently ignored, dropping the grouping from four of those views, and a formula with an empty body was reported with an empty name.

**The lesson, and it is about the suite rather than the code.** Every one of these passed a check that asked whether an unsupported construct was REPORTED. None asked whether a supported construct returned the right notes. The new checks assert the answer.


## Independent re-review — 2026-09-09 (second pass, after the seven fixes)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. The frontmatter values are unchanged from the first pass because the re-review returns the same three.

**Finding 1 (blocking): the `file.path` fix works, and reverting the wiring that delivers it breaks nothing.** `pathPrefix` has to travel from `pathPrefixFor` through `NoteIndex`, through `DeckHost`'s snapshot, through the records endpoint, into the renderer, and into `runQuery`. Three separate mutations each leave **all 306 checks passing**: making `pathPrefixFor` return `''` (`desktop/src/main/note-index.ts:66-74`); replacing `pathPrefix: index.pathPrefix` with `pathPrefix: ''` in the snapshot (`desktop/src/main/host.ts`); and replacing `payload.pathPrefix ?? ''` with `''` in `readRecords` (`desktop/src/renderer/renderer.ts:399-405`). Each one restores exactly the defect [[ISS-0027-Four-Evaluator-Paths-Select-The-Wrong-Notes]] describes — `NAVIGATION.base` selecting fourteen features where the cockpit shows thirteen — silently. The reason is that the only test touching `pathPrefix` hands it to `runQuery` as a literal (`desktop/tests/evaluator.test.mjs`), so it proves the evaluator uses the value and never that the value arrives. The other three evaluator fixes are individually guarded: reverting `containsOne`, `hasLink` and case-sensitive `same()` each fails a check.

**Finding 2 (medium): `file.hasLink` still cannot see a body link, and still reports nothing.** The first pass's Finding 2 had two halves and only the receiver half was fixed. Repro, through `fromBaseFile` and `runQuery`: over a note whose body says `[[Target]]` and whose frontmatter does not, and a note the other way round, `file.hasLink(link("Target"))` selects only the frontmatter one and `unsupported` is empty. ISS-0027's Fixed section says `file.hasLink(x)` "walks the whole record — which is what the cockpit's own `CONTEXT.base` wants". `docs/__bases__/CONTEXT.base` asks `file.hasLink(this.file)`, which is a backlink query, and the cockpit's own `index.py` builds backlinks "by scanning each note's frontmatter values *and* body". Deck's record keeps no body ([[TASK-0038-Records-From-The-Workspaces-Markdown]] decided that), so the two answer different questions and nothing says so. That is the shape [[ADR-0004-A-View-Is-A-Description]] exists to prevent, and no issue tracks it.

**Finding 3 (medium): the case-sensitivity change silently empties every TaskNotes view over a project-os repository, and no note records it.** Running all thirteen fixtures in `desktop/fixtures/bases/` — 150 views — over three real corpora with the pre-fix and post-fix builds, the only changes are the intended `__templates__` exclusions and this: `note.type == "[[Task]]"` selected 873 notes in Your Trainer and 53 here before the fix, and **0** after, because project-os writes `type: "[[task]]"` in lower case. `tasks.base`, `tasknotes-*.base` and `tasks-daily.base` all go to zero. This may well be right — it is what Obsidian would show — but three things are missing. Nothing checks it, so a later revert of `same()` would restore 873 notes with nothing red. Nothing in the notes records the consequence. And the load-bearing premise, "Obsidian's `==` is case-sensitive", is asserted in the code comment, in ISS-0027 and in RISK-0003 without a citation anywhere; [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]] names coercion as the place with "more than one defensible answer", which is exactly where a source belongs.

**Finding 4 (low): ISS-0027's evidence line does not reproduce.** "Reverting the three evaluator fixes fails one, two and four checks respectively" — I measure **one, one and one** against `evaluator.test.mjs`, and one each against the full suite. Only the first number is right.

**Finding 5 (low): TST-0032's correction is honest, with one number wrong.** I checked all three of its claims. `final` appears in neither the cockpit's `statuses.py`, nor `desktop/fixtures/cockpit-statuses.json`, nor anywhere in `desktop/src/` — correct. The eight spellings it lists (`draft`, `active`, `done`, `todo`, `none`, `research`, `planning`, `in-progress`) are exactly the eight the indexed vault carries — correct. And `desktop/tests/band-and-face.test.mjs:271-275` does assert that `research`, `planning`, `none`, `''`, `null` and `undefined` all come back as `none` — correct. The count is off: it says 143 notes carry a status; I count **126** with the sidecar's exclusion rules, 147 if you count the key merely being present, 140 if you include excluded directories. No reading gives 143. Worth noting that the unexcluded count also turns up `open`, `cancelled` and a capital-D `Draft`, which the corrected sentence does not list.

**What I could not break.** `containsOne` on a list of links is right for both a `link("X")` and a `"X"` receiver, and consistently case-sensitive. `pathPrefixFor` is correct for a vault: `~/Notes` has no `docs/`, `path.relative` gives `''`, and the evaluator's `file.path` is then the vault-relative path a base file expects. The `groupBy`-as-a-map fix and the empty-formula report are both real. The 150-view sweep over three corpora found no other behavioural change between the two builds. `npm test` 306/0, `run-tests.py` `passing=23 failing=0`, `electron . --smoke` `ok: true`.

**Which build this was measured on.** The review ran against `c57f723`..`b2292df`. Two further commits landed while it was in progress (`883e880`, `8fff003`), both touching `desktop/src/main/main.ts`. Every blocking finding was re-driven against `8fff003`, where the suite is 307 checks: the three navigation-guard mutations and the `pathPrefixFor` mutation each still leave 307 passing and 0 failing.

## Independent review — 2026-09-09 (third pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. The four evaluator fixes hold under mutation. The findings are all about `tools/scripts/check-bases-live.mjs` and the section it added to [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]], which together claim more than they measure.

**Finding 1 (medium): the script excuses an empty view on the strength of a report that says nothing about why it is empty.** Its rule is `selected === 0 && said.length === 0`, and `said` is every refusal from anywhere in the view. In `TaskNotes/Views/tasks-default.base`, the views "Today" and "This Week" select nothing and are passed because two unrelated things were reported: that `tasknotesTaskList` is a plugin's own view type, and that a `%` appears in a formula. Neither is about the filter. The identical emptiness in `__bases__/Tasks/Tasks Base.base / Today's Tasks` — same vault, same cause, no date on or after today — needed a hand-written `KNOWN_EMPTY` exemption. Two views, one cause, opposite treatment, which is the sign that the rule is not measuring what it says.

**Finding 2 (medium): the script cannot see a view selecting the wrong notes, which is the failure [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]] is about.** It counts what each view selects and never asks whether those are the right notes. Reproduced by making every filter select everything — `if (filter(context) || true)` at `desktop/src/shared/query.ts:99`:

```
node tools/scripts/check-bases-live.mjs
  46 view(s) read across the vault's base files
  0 view(s) drew nothing and said nothing
  0 failure(s)                                    (exit 0)
```

All 46 views then draw all 407 notes and the script is green. The suite catches this blunt mutation (six checks red), so the script is a supplement rather than the guard — worth saying in TST-0027, which currently reads as though it settles steps 4 to 7.

**Finding 3 (low): three numbers in TST-0027's new section do not reproduce, which is [[ISS-0036-Notes-Quote-Measurements-That-Do-Not-Reproduce]] recurring in prose written the same day it was closed.**

- "46 views across 21 base files": the script prints 19 file names, and `find ~/Notes -name '*.base' -not -path '*/.*' | wc -l` is 19. Counting the vault's dot directories gives 27. No reading gives 21.
- "`Novel Base - Side Bar.base` has four views ... Four empty lists, four explanations": it has six — Characters, Chapters, Locations, Pages, Panels, and Details (Panels/Pages/Chapters).
- "there are nine of them", of views where a difference would be silent: 17 views draw a list with nothing said. The nine silently drops the eight `01 Inbox/Untitled*.base` views, each of which draws all 407 notes and says nothing.

**Finding 4 (low): `KNOWN_EMPTY` never expires and its own comment says it should.** The three rows say to re-check them when the vault's data moves, and nothing enforces that. A row stays a permanent exemption for a named view, so a real defect emptying "Today's Tasks" is excused for ever. Its stated reason does reproduce today: the latest `scheduled:` or `due:` date anywhere in `~/Notes` is 2026-03-17.

**What I attacked and could not break.**

- `pathPrefixFor` returning `''`, which is [[ISS-0031-The-Path-Prefix-Reaches-The-Evaluator-Unguarded]]'s own mutation: two checks red, exactly the number the issue claims.
- The vault's own numbers reproduce: 46 views, 19 base files, 0 failures, Characters 10, Chapters 2, Locations 8, Pages 0 with `this.` named as the reason.
- [[ISS-0033-Haslink-Answers-From-Frontmatter-And-Does-Not-Say-So]]'s report is present and worded as the note says (`desktop/src/shared/expression.ts:570-571`).

## Independent review — 2026-09-09 (fourth pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`. Every number TST-0027 now quotes reproduces, which is [[ISS-0043-Three-Numbers-Written-The-Day-ISS-0036-Closed-Do-Not-Reproduce]] properly closed. The findings are that the third pass's Finding 1 is narrowed rather than closed, and that its Finding 4 was dropped without a note while the thing it was about grew.

**Finding 1 (medium): an empty view is still excused by a report about something else — the word "filter" only has to appear in a name a vault author chose.**

The rule is `/filter/i.test(one.where ?? '')`, and `where` for a description-level formula is `source.formulas.<the author's name for it>`. Two base files identical but for that name, in a throwaway vault holding one note:

```yaml
formulas:
  filterHelper: "%%%"          # nothing to do with the view's filter
views:
  - type: table
    name: Nothing Here
    filters: {and: ['title == "no such title anywhere"']}
```

```
node tools/scripts/check-bases-live.mjs <vault>
  view "Nothing Here": 0 note(s)
      says: %%% — "%" has no meaning here (at character 0)
  1 view(s) selected nothing: 1 explained by their own filter, 0 unexplained
  0 failure(s)                                                    (exit 0)

# rename filterHelper -> plainHelper. Same file, same complaint, same emptiness:
  1 view(s) selected nothing: 0 explained by their own filter, 1 unexplained
  FAIL probe.base / Nothing Here: selects NOTHING and names nothing about its own filter
  1 failure(s)                                                    (exit 1)
```

That is [[ISS-0042-Each-Of-The-Three-New-Scripts-Passes-While-What-It-Measures-Is-Wrong]]'s own defect — "excused by a `%` in an unrelated formula" — surviving its own fix, because a substring test over an author-controlled string is not a test of what the refusal is about. It is latent rather than live: I instrumented the script over `~/Notes` and all 16 excuses today come from genuine `source.filter...` locations. The fix is small — the refusal already carries a structured `where`, so match the *prefix* `source.filter` rather than the substring `filter`.

**Finding 2 (medium): the third pass's Finding 4 — "`KNOWN_EMPTY` never expires and its own comment says it should" — is in no `ISS-*`, and the list grew from three rows to five while nobody owned it.** ISS-0042 was filed for findings 4, 5 and 6 of that pass and ISS-0043 for finding 8; none of them carries this. Its own comment still says "Re-check a row when the vault's data moves" and nothing enforces it, so a real defect that empties `Today's Tasks` is excused permanently by name. [[ISS-0041-A-Change-That-Leaves-The-Modification-Time-Alone-Raises-No-Revision]] exists precisely because a reproduced finding with no note is a finding nobody owns, and this is the next one. The stated reason for all five rows does reproduce today — the latest `due:` or `scheduled:` anywhere in `~/Notes` is 2026-03-17, six months behind.

**What I attacked and could not break.**

- Every number in TST-0027's new section reproduces from the script's own output: 19 base files, 46 views, 21 empty (16 explained by their filter, 5 by hand, 0 unexplained), 14 views that draw a list and say nothing, `Novel Base.base` Characters 10 / Chapters 2 / Locations 8 with Pages naming `this.`, and `Novel Base - Side Bar.base` with **six** views and six explanations. ISS-0043 is properly closed.
- The step-8 limit is stated honestly rather than papered over, and it is the right thing to have written down.
- `npm test` 320/0, `run-tests.py` `passing=23 failing=0`, `validate-docs.sh --as-committed` OK, `check-bases-live.mjs` 0 failures over 46 views.

## Independent review — 2026-09-09 (fifth pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`.

ISS-0046's first half is genuinely fixed and I could not defeat it. Its second half — the exemption that expires by itself — misses three of the shapes a date is written in, and its own evidence line does not reproduce.

**Finding 1 (medium): `DATED_AHEAD.stillTrue` reports "still true" for a vault that holds a future date, when that date is a list or is not written as ISO.**

The condition keeps only values where `typeof v === 'string'`, then compares `v.slice(0, 10)` as text. Driven against a temporary vault holding the real `__bases__/Tasks/Tasks Base.base` and one extra note:

| the note's `due:` | exemptions that expire |
| --- | --- |
| `2026-12-01` | 3 — correct |
| `2026-12-01T09:00:00` | 3 — correct |
| `[2026-12-01]` | **0** |
| a block list of one date | **0** |
| `01/12/2026` | **0** |

```
node tools/scripts/check-bases-live.mjs <temp vault>
  # with due: [2026-12-01]
  6 view(s) selected nothing: 0 explained by their own filter, 3 exempt under a
  condition that still holds, 0 whose exemption has expired, 3 unexplained
```

A list-valued frontmatter field is not a hypothetical in this repository: [[project-os-cockpit#ISS-0279]] is that exact defect in the cockpit's indexer, and [[FEAT-0011-Decks-Own-Index]] exists partly so Deck does not repeat it. The condition drops the same shape silently. I checked `~/Notes` and no `due:` or `scheduled:` there is a list today, so this is latent rather than live — which is the wording ISS-0046 itself uses about the defect it was filed for. Reuse the record's own list handling (`stringList`) and refuse a value that is not a date rather than skipping it.

**Finding 2 (low): ISS-0046's evidence says two exemptions expire; three do.**

```
# a temporary vault holding the same base file, plus one note with scheduled: 2027-01-01
node tools/scripts/check-bases-live.mjs <temp vault>
  0 exempt under a condition that still holds, 3 whose exemption has expired
  FAIL ... / Today's Tasks: exempted because "...", and that is no longer true
  FAIL ... / This Week's Tasks: ...
  FAIL ... / Future Tasks: ...
```

The note's own preceding sentence says three exemptions hold with nothing dated ahead, so "two of them expire" contradicts it as well as the run.

**Finding 3 (high, repository-wide, recorded in full on [[FEAT-0013-The-First-Write]]):** the commit puts a test needing Electron into `run-tests.py`, which the template-owned `validate-docs.yml` job runs on a machine with no Electron and no display, so that job fails on every push. It is not this feature's code, but it gates this feature's close-out.

**What I attacked and could not break.**

- The `source.filter` prefix rule holds in both directions. Two synthetic base files identical but for a formula named `filterHelper` and `plainHelper` now get the same verdict, both failing with the same sentence; under the substring rule the first was silently excused.
- The live run reproduces exactly what [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]] claims: 19 base files, 46 views, 21 selecting nothing, 16 explained by their own filter, 5 exempt, 0 expired, 0 unexplained, 0 failures, and the latest date of either kind is 2026-03-17.
- The five exempted views really do filter on `due`/`scheduled` at or after today, so the condition names the right two properties. `This Week's Tasks` would stay empty for a date beyond the week and the condition expires it anyway, which errs towards asking a person to look — the safe direction.

## Independent review — 2026-09-09 (sixth pass)

**Verdict: changes-requested.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`.

The fifth round's finding 1 is genuinely fixed: all five date shapes now expire the exemption, and I drove each one. The evidence line written for that fix contains a number that does not reproduce, which is the fifth round running.

**Finding 1 (low): [[ISS-0051-Three-Checks-That-Can-No-Longer-Fail]] says `scheduled: 2026-12-01T09:00:00` expires two exemptions; it expires three.**

Against a temporary vault holding the real `__bases__/Tasks/Tasks Base.base` and one note:

```
node tools/scripts/check-bases-live.mjs <temp vault>
  6 view(s) selected nothing: 0 explained by their own filter, 0 exempt under a
  condition that still holds, 3 whose exemption has expired, 3 unexplained
  FAIL ... / Today's Tasks: ... no longer true (latest due or scheduled anywhere: 2026-12-01)
  FAIL ... / This Week's Tasks: ...
  FAIL ... / Future Tasks: ...
```

Two cannot happen. All three rows share one `DATED_AHEAD` object and `exemption()` memoises by that object, so the condition is computed once for the whole vault and every row gets the same answer. The other four shapes in that evidence line — `2026-12-01`, `[2026-12-01]`, the block list, `"01/12/2026"` — each expire three, exactly as written. This is the same "two where it is three" the fifth round corrected in [[ISS-0046-An-Empty-View-Is-Excused-By-A-Name-Somebody-Chose]], reappearing in the note that corrected it.

**Finding 2 (low, latent): one unreadable date anywhere in a vault expires all five exemptions permanently, and the summary line does not distinguish that from a real future date.**

`take()` sends any value that does not start with `YYYY-MM-DD` to `unreadable`, and `unreadable.length > 0` returns `holds: false` regardless of what the dates say. A note carrying `due: TBD` — or a Templater placeholder, or a number — turns five views into failures that no editing of the base files can clear:

```
# a temp vault with one note carrying `due: TBD`
node tools/scripts/check-bases-live.mjs <temp vault>
  3 whose exemption has expired
  FAIL ... / Today's Tasks: ... no longer true (1 date(s) this cannot read, so the
       exemption cannot be confirmed: TBD) — look at this view again
```

I checked whether this is live and it is not: over all 407 notes in `~/Notes` there are 67 `due:`/`scheduled:` values in 29 distinct shapes, and **none** fails the pattern. The failure names the value it could not read, so a person can act on it, and erring towards asking someone to look is the safe direction. Recorded as a lead rather than a defect. The one thing worth changing is the counter: an exemption withdrawn because a date could not be parsed is counted under "whose exemption has expired", which reads as "somebody scheduled something".

**Finding 3 (high, repository-wide, recorded in full on [[FEAT-0013-The-First-Write]]):** `run-smoke.sh` re-execs itself under `xvfb-run` using a relative path resolved from the wrong directory, so it exits 127 on every Linux runner; and the smoke needs the sidecar, which `validate-docs.yml` does not install, so it fails rather than skipping there. Both CI jobs go red on the first push. Not this feature's code; it gates this feature's close-out.

**What I attacked and could not break.**

- The live run reproduces [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]] exactly: 19 base files, 46 views, 21 selecting nothing, 16 explained by their own filter, 5 exempt, 0 expired, 0 unexplained, 0 failures, latest date 2026-03-17.
- The list handling is real. `due: [2026-12-01]` and the same value written as a block sequence both reach the comparison, which is the shape [[project-os-cockpit#ISS-0279]] is about.

## Independent review — 2026-09-09 (seventh pass)

**Verdict: approved.** Fresh context and a separate session, with no memory of authoring any of this; the same model family as the author, recorded in `reviewed_by`.

**Both of the sixth pass's findings against this feature are discharged in the code, and I read the fixes rather than taking them on the note's word.** `tools/scripts/check-bases-live.mjs:92-97` now marks a withdrawn exemption `unconfirmable` when a date will not read, names the value, and tells a person to fix the note rather than the view; line 231 counts the two states separately. [[ISS-0051-Three-Checks-That-Can-No-Longer-Fail]] now says all five date shapes expire three exemptions and says why two was impossible — the five rows share one memoised condition.

**Finding 1 (medium, latent): the fifth acceptance criterion names the navigator and only the model underneath it is asserted.** Replacing the whole body of `loadQueryView` (`desktop/src/renderer/renderer.ts:365-397`) with `return { groups: [], refusals: [] };` — a query-sourced view drawing an empty list and saying nothing, which is the single thing ADR-0004 and this feature's Scope exist to prevent — leaves `npm test` at 322 of 322 and `run-smoke.sh loopback` at exit 0. Two reasons compound: `node --test` cannot load the renderer ([[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]), and no shipped view is query-sourced — six of the seven are mode-sourced and Overview is stats — so the smoke never enters the branch at `renderer.ts:337`. What `evaluator.test.mjs:257` asserts is that `runQuery` and `rowsFor` produce the right groups, which is one layer below what the criterion claims. **Nobody can reach this today**, because the branch is dead in production until [[PHASE-0003-Vault]] supplies a provider that returns a query-sourced description. It goes live in that phase, and it should be gated before it does.

**Finding 2 (low): `check-bases-live.mjs` is blind to the parser half of the guarantee it is cited for.** Deleting the push in `query.ts`'s `compileOne` catch removes every parse refusal from the live vault run — 4 "an empty expression" and 10 "has no meaning here" lines vanish — and the script still prints `0 failure(s)` with a byte-identical summary. [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]] leans on this script for steps 4 to 7. Mitigating: two node checks in `npm test` do kill that mutation, so the gate holds; it is the live script's verdict that is weaker than its use.

**Finding 3 (low): `desktop/fixtures/cockpit-statuses.json` cannot fail in the direction the fourth criterion claims.** The criterion says the bands are "pinned to the cockpit's `statuses.py` by a fixture that fails when they drift". The fixture is a hand-recorded snapshot (`tools/scripts/record-sidecar-fixture.py:306-324`); nothing in `npm test`, `run-tests.py` or CI re-reads `statuses.py`. It fires when Deck drifts from the snapshot, never when the cockpit moves. Compared directly today the bands, completed set and legacy map are all equal, and the cockpit is at `9851598` against the `44845e8` the fixture records — so no live drift, and no watcher.

**Finding 4 (low, the same class this feature keeps producing): two mutation counts in the note's own "what was checked and found sound" paragraph are stale in the present tense.** "Removing `report()` … fails 6 checks" fails **7**; "breaking `same()`'s link normalisation fails 10" fails **12**. Both drifted because checks were added after the sentences were written.

**Finding 5 (low): the discharge table above is the seventh pass's, not this feature's.** All three features carry the same three rows, and the first — a tick control Deck can stop offering — is [[FEAT-0013-The-First-Write]]'s and has nothing to do with descriptions. What actually held this feature at the sixth pass was [[ISS-0055-Two-Re-Measured-Numbers-Still-Disagree-With-Themselves]] and the repository-wide [[ISS-0054-The-Smoke-Runner-Cannot-Start-Where-It-Must]].

**The live run reproduces, and the corrected counter is visibly live in it.**

```
node tools/scripts/check-bases-live.mjs
  19 base file(s) read, 46 view(s) across them
  21 view(s) selected nothing: 16 explained by their own filter, 5 exempt under a
  condition that still holds, 0 whose exemption has expired, 0 whose exemption
  cannot be confirmed because a date will not read, 0 unexplained
  0 failure(s)
```

That is the number [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]] states, and the two states ISS-0055 asked to be told apart are now two separate counters in the summary line rather than one.

**What I attacked and could not break.**

- `check-counts-live.py` reports 0 disagreements over three corpora, so the index this evaluator runs over agrees with the sidecar note by note.
- `npm test` 322 of 322; `validate-docs.sh` OK.
- The repository-wide CI finding this feature carried is fixed at the script — the `xvfb-run` re-exec passes an absolute path, driven from the repository root with stub `uname` and `xvfb-run`. The remaining half, that the job which would run the smoke has never executed, is recorded in full on [[FEAT-0013-The-First-Write]], seventh pass, finding 1. It is not this feature's code and it is not about descriptions.
