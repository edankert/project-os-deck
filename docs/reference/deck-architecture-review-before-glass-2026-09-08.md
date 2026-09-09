---
type: "[[reference]]"
id: REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS
aliases: ["REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS"]
title: "Architecture review before Glass: a view is still a pointer to a sidecar mode, Deck cannot write, and four things should be added to PHASE-0001 before the field is built"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
scope: "project"
source:
  - "Edwin 2026-09-08: 'I am not happy with the current solution fully and don't think it fully represent what is needed. Review the current solution and considering the new approaches (glass/minority report style solution in particular) and please suggest if we should include more into this first architecture design phase to ensure it can support the needed functionality ... create a more generic solution to specify specific views (json descriptions/ui) base this design on the current cockpit views but also consider the world/story-building solution introduced in obsidian ... consider specifying things like generated editors/lists selection views and consider implementing and specifying flow solutions, like a release flow, a needs you flow, an issue flow.'"
  - "Edwin 2026-09-08, scoping the review: the phase to widen is PHASE-0001; the Supernote item is dropped for now; 'The deck needs to have the same functionality as the cockpit, so it needs to be able to write ... set state/property of a note and check check-boxes in the content of a note and generate views/editors which allow you to check items like the acceptance tests'; flows are considered now and fleshed out over time."
  - "desktop/src/shared/views.ts, types.ts, store-state.ts, address.ts, panels.ts, faces.ts, capability.ts, sidecar-client.ts; desktop/src/main/host.ts, main.ts"
  - "project-os-cockpit at c0ed9e3: src/project_os_cockpit/cockpit.py, obligations.py, statuses.py, note_writes.py, server.py, renderer.py, index.py; desktop/src/renderer/renderer.ts; docs/__templates__/*.md; docs/__bases__/*.base"
  - "~/Notes: the ten live .base files, Properties.md, __templates__/Novel/*.md, the four Comics .canvas files"
  - "Online prior art read on 2026-09-08, listed under Sources"
related:
  - "[[PHASE-0001-Deck]]"
  - "[[PHASE-0002-Glass]]"
  - "[[PHASE-0003-Vault]]"
  - "[[PHASE-0004-Parity]]"
  - "[[FEAT-0007-Views-Come-From-A-Provider]]"
  - "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"
  - "[[TASK-0029-The-Band-Function]]"
  - "[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]"
  - "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]"
  - "[[ADR-0002-Glass-Is-The-Main-View]]"
  - "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"
  - "[[REFERENCE-DES-0002-REVIEW]]"
  - "[[REFERENCE-COCKPIT-ADOPTION]]"
  - "[[project-os-cockpit#ADR-0010]]"
  - "[[project-os-cockpit#REQ-0026]]"
  - "[[project-os-cockpit#REQ-0027]]"
  - "[[project-os-cockpit#REQ-0034]]"
  - "[[project-os-cockpit#ISS-0279]]"
tags: [reference, review, architecture, views, writes, flows, deck]
---

# Architecture review before Glass, 2026-09-08

## Purpose

Edwin asked on 2026-09-08 for a review of Deck's architecture before Glass is built, against four additions he wants it to carry: views described as data rather than code, editors and pick-lists generated from a note type's fields, writes to notes including checkboxes inside a note's body, and multi-step flows such as a release flow, a needs-you flow and an issue flow. The phase to widen is [[PHASE-0001-Deck]]. This note records what the architecture is today, what the cockpit and the vault already hold that each addition would build on, what other tools do, and what to add to the phase. Nothing is allocated here; the last part lists the notes a decision would create.

Four words are used throughout and mean one thing each. A **view** is a named list of notes with an arrangement, which is what Deck's switcher offers. A **description** is a view, an editor or a flow written as data that a renderer interprets, instead of as code. The **registry** is the cockpit's table of which verbs a person may apply to a note in a given state. The **record** is the notes on disk, which are the only place state lives.

## The short version

1. **The architecture's seams are sound and its vocabulary is too small.** The store, the addresses, the provider and the two hosts all hold up and none of them needs replacing. But a view today is three fields: an id, a label and which sidecar mode feeds it (`desktop/src/shared/views.ts`). It says nothing about which notes it selects, how they are grouped, what a card shows, which band a note lands in, or which surface may draw it. Every one of those decisions is code somewhere in the renderer or in a task planned for Glass.
2. **The cockpit's views are code too, and there is no endpoint that returns the notes as records.** The nine navigator modes are one branch each in a seven-thousand-line Python file, and only the obligations table, which says what each note type owes and in which view, is data. A description Deck evaluates itself has nothing to evaluate over: the sidecar answers per mode and per note, never with every note and its frontmatter. That is the one gap a description cannot route around, and it is cockpit work.
3. **Edwin already writes view descriptions, in Obsidian's Bases language, and so does the cockpit repository.** Ten live base files in the vault and two in the cockpit's own docs folder express filters, sorts, grouping, card images and column order in one YAML shape. The subset they use is measured below. Taking that language as Deck's query language costs an evaluator and buys every view Edwin has already written.
4. **Deck cannot write, by three separate locks, and the phase note calls that a rule rather than a stage.** The cockpit's write path is about thirty guarded endpoints whose verbs come from one registry, whose only authorisation is the loopback address, and whose out-of-loopback form is a draft requirement nobody has built. So Deck's shell can write today by calling the sidecar from its main process, and its served tablet page cannot until the cockpit lands that requirement. That split is a decision to record, not a limitation to work around.
5. **Checkboxes are addressed by text, evidence is required, and the rendered HTML Deck already shows carries the address.** The sidecar stamps each rendered checkbox with its source line, and the tick endpoint finds the line by that text. Every tool surveyed that writes into a file it does not own re-verifies the target at write time the same way. Deck adopts this; it invents nothing.
6. **Nobody has generated editors, and the templates are ready for it.** The cockpit hand-codes each dialog. Its seventeen note templates declare every field with its shape and a comment saying its rule, which is what a form generator needs. The vault's templates do too, with one defect that reads as a vocabulary. But a generic "set this property" endpoint does not exist in the sidecar, so a generated editor today can only drive the verbs that do: a status transition, a tick, a verdict, a review.
7. **A flow already exists in the cockpit in the only shape that fits the record: steps whose state is read back from the note.** The acceptance runner keeps its progress in one window's memory and loses it on close; the release page is a fixed order of independent verbs with no state of its own. The prior art divides into engines that hold flow state and engines that read it from the subject. The record being the source of state makes the second the only choice, and Deck's shared store can carry the one thing the cockpit loses: where a person is.
8. **Recommendation.** Reopen [[PHASE-0001-Deck]] for four additions before Glass: a view becomes a description, with the band table Glass planned as one section of it; one write goes end to end through the shell, recorded as an ADR; the address grammar and the panel vocabulary open to what pages, editors and flow steps will need; and flows are written down as a concept with a reserved seam and nothing built. Three issues are filed in the cockpit repository for a records endpoint, a property-write endpoint and a vocabulary payload. Glass then builds on a description rather than on a table of its own.

## Part 1: what the architecture is today

Measured in `desktop/src/` on 2026-09-08, at commit `50eac60`.

| seam | what it holds | file |
| --- | --- | --- |
| a view | `id`, `label`, `source` where source is a sidecar nav mode or the stats payload; the seven project-os views are a frozen array | `shared/views.ts`, `shared/types.ts` |
| the provider | one provider per workspace kind returns the views; the renderer draws the list and holds no view name | `shared/views.ts` |
| the store | workspace, view, desk name, focused note, saved desks, the live desk per workspace, a query, two filters, folds, a revision; fourteen actions a window may dispatch | `shared/store-state.ts` |
| the address | `deck://<workspace>/<view>?desk=&note=&panel=`; the parser refuses what it cannot read | `shared/address.ts` |
| the panels | three, closed: `needs-you`, `note`, `desk`; the address refuses a fourth | `shared/panels.ts` |
| a card | note id, title, type, status, path, subtitle, owed and its verb, group key, severity, last walk, staleness, progress, children | `shared/types.ts` |
| the face | decided by type in code: progress for anything with children, verification for a test, severity for an issue, plain otherwise | `shared/faces.ts` |
| the band | two hard-coded sets: fourteen statuses mean done, six mean doing, everything else is owed | `shared/faces.ts` |
| the host | serves the renderer, forwards six sidecar paths, answers 405 to every method that is not GET or HEAD | `main/host.ts` |
| the client | five read methods and, by design, no method that writes | `shared/sidecar-client.ts` |
| capability | four booleans: pop-out windows, clipboard, manage workspaces, shared store | `shared/capability.ts` |

Three things in that table are already wrong or already duplicated, and each is a symptom of the same cause: a decision that belongs to a description is written into code.

**Deck's band vocabulary disagrees with the cockpit's.** `faces.ts` puts `draft`, `proposed` and `ready` in the doing band. The cockpit's `statuses.py` puts all three in `pending`, beside `backlog` and `triage`. Deck also lacks `final`, which the vault uses and [[PHASE-0003-Vault]] already notes. The sidecar owns this vocabulary and exposes no endpoint for it, so Deck copied it and the copy drifted within two days.

**The face per type is code, and a vault type has no face.** `faceFor` names `test` and `issue`. A character with a portrait, a page with a number and a chapter that orders its pages arrive as plain cards. The Vault phase would add branches; a description would add rows.

**The band function planned for Glass is a view description written for one surface.** [[TASK-0029-The-Band-Function]] asks for "one table from the sidecar's groups to front, mid and deep, per view", with columns reserved for held and joined-to-desk. That table is exactly the band section of a view description, and it is planned to live in its own module and answer only Glass. Building it there means the list, Spread and Glass each read the view's rules from a different place.

What holds up and should not change: the store as the one place state lives, with a pure reducer; the address as the written form of every state, refusing rather than defaulting; the provider as the only source of the view list; one renderer under two hosts, with capability asked rather than sniffed; and the read-only host as the boundary the tablet sees.

## Part 2: a view as a description

### What a view is in the cockpit

The navigator's modes are declared as a nine-tuple in `cockpit.py` at line 413 and dispatched by an if-chain at line 3264 to one builder each: `_features_groups` groups by phase, `_issues_groups` by severity with a triage tray first, `_tests_groups` by what is owed, `_library_groups` by folder and by discovered type. Each builder has its own bucketing, sort and item shape, about two thousand lines between them. Two parts are data. The obligations table in `obligations.py` says, per note type, which states are owed, in which view, with which verb; the sidecar prepends its result as the Needs-you group to every view that does not already gather its own. The status bands in `statuses.py` map each status to one of six bands. Neither is served as data: the obligations endpoint returns badge counts, and the bands are not served at all.

There is no endpoint that returns every note with its frontmatter. The GET routes are nav per mode, render per note, context per note, stats, locate, and the agent and release payloads. The library mode returns every typed note, but as rows with id, title, status and type, not with the fields a vault base filters on.

The cockpit repository already describes six of its own views in Obsidian's Bases language, in `docs/__bases__/NAVIGATION.base`: features grouped by phase, phases sorted by order, issues grouped by parent, and open-only variants of each. The same two files sit in this repository's `docs/__bases__/`. They are for people, and the README there says so; but they show that the cockpit's simpler views are expressible as data today.

### What a view is in the vault

Ten live base files, measured on 2026-09-08, with the eight empty inbox stubs and the trash excluded. The Comics project has two under `__bases__/Comic/`: four card views (Characters, Chapters, Locations, Pages) each filtered by type, ordered by a property list, sorted by number, with a portrait, cover, scene or image as the card face; and a six-view sidebar base whose filters are all relative to the note it is embedded in, including the vault's one `or`-of-`and` filter. The Tasks bases add date arithmetic and negated status lists. The TaskNotes plugin's five files add four view types of its own and a forty-formula block.

The subset in use, which is what [[PHASE-0003-Vault]] says must be named: four top-level keys (`filters`, `formulas`, `properties`, `views`); nineteen view keys, of which `type`, `name`, `filters`, `order`, `sort`, `groupBy`, `image`, `imageFit`, `imageAspectRatio`, `cardSize`, `rowHeight` and `columnSize` are Obsidian's and the rest are TaskNotes'; six view types, two of them Obsidian's (`table`, `cards`); `and`, `or`, `not` and `!`; the six comparison operators and date addition; twenty-two functions, led by `date`, `if`, `today`, `number`, `list`, `map`, `filter`, `reduce`, `contains`, `link`; and property namespaces `note.`, `file.`, `formula.`, `this.`. Three spellings of "this note is of type X" coexist: `type.contains(link("Chapter"))`, `type == link("Task")` and `note.type == "[[Task]]"`. An evaluator normalises them or refuses two of them; either is a decision to write down.

The vault's type declarations are in `Properties.md` (field order in five bands, and which field is a note's parent: world, story, chapter, page) and in ten templates under `__templates__/Novel/`. Every template writes `status:` as the four-item list of allowed values rather than one value, which is a defect in the template and, read the other way, the vocabulary a pick-list needs.

### What other tools do

Three systems keep the query apart from the presentation and let one query feed several view types, which is the shape Deck needs for a list, Spread and Glass over one description. Obsidian Bases evaluates filters and formulas in the core, and a registered view type stores its own keys in the same view entry; the core owns selection and the view owns drawing. Notion's views API carries `filter` and `sorts` in the query's own shapes beside a `configuration` block whose shape depends on the view `type`. Directus keys `layout_query` and `layout_options` by layout name, so one saved preset holds settings for a table, cards and a kanban at once. Adaptive Cards contributes the other half: a `type` on every node, a version number, and per-host renderers that each state which version they support. For depth as priority, the standard formalism is Furnas's degree of interest, the a-priori importance of a note minus its distance from the focus, shown above a threshold; DOITrees added several foci and a slider. No surveyed tool lets a person state the importance or distance terms in a file, so a band section in a description would be new, and it is small.

The other end of the range is a warning. Logseq's advanced queries and Datacore put the renderer as code inside the data. That is expressive and it is not a description; a second surface cannot draw it.

### The gap, and where evaluation happens

Deck's view record has a source and no query, arrangement, face, band or surface list. Adding those fields is cheap. The question that is not cheap is where a query is evaluated, because Deck holds no notes.

| option | what it is | cost | what it cannot do |
| --- | --- | --- | --- |
| A. source is a sidecar mode | the description names a mode; the sidecar's groups are the arrangement; Deck adds band, face and surfaces on top | nothing new to read; parity with the cockpit by construction | express a vault base, or any view the cockpit does not already build |
| B. source is a query Deck evaluates | Deck evaluates the Bases subset over note records in its main process | a records endpoint in the sidecar (cockpit work), or Deck's own index of the workspace's files (a second indexer, with ISS-0279's bugs to re-make) | the obligations: "owed" is a sidecar judgement, so a query view still reads owed and suppressed from the nav payload as inputs |
| C. the sidecar evaluates a base | the sidecar gains a base evaluator and serves the result as groups | the largest cockpit change; Edwin ruled the sidecar out of the view list on 2026-09-06 | nothing, and it moves the whole question out of Deck |

**Recommendation: A now, B when the records endpoint exists, the description shaped for both from the start.** A description's `source` is either a sidecar mode or a query. The project-os provider ships seven descriptions with mode sources that reproduce today's views exactly, so nothing visible changes and the fixture test still pins parity. The Vault provider ships query sources read from base files. The records endpoint is an issue filed in the cockpit repository the day the feature starts, the way [[TASK-0001-The-Whole-Edge-List-Is-One-Payload]] already does for the edge list; the cockpit is the primary place for new functionality and this is functionality the cockpit's own bases would use. Deck's own index is the fallback only if that issue is declined, and the fallback is recorded as a risk because it duplicates the indexer.

### The shape

A sketch, not a schema. What matters is the sections and that each section has one owner.

```yaml
id: issues
label: Issues
source:                      # one of two kinds
  kind: mode                 # the sidecar's groups are the arrangement
  mode: issues
# source:
#   kind: query              # Deck evaluates the Bases subset over records
#   filters:
#     and: ['type == link("issue")', 'status != "fixed"']
#   sort: [{ property: severity, direction: DESC }]
#   groupBy: { property: parent }
band:                        # TASK-0029's table, one row per view, here instead of in a module
  front: owed
  mid: subject
  deep: suppressed
face:                        # what a card shows; fields are property names, not code
  title: title
  subtitle: status
  image: null
  fields: [severity, status]
surfaces: [list, spread, glass]
verbs: registry              # never a list of verbs (the cockpit's REQ-0026)
```

Two rules follow from the prior art and from the cockpit's requirements. Every vocabulary a description refers to comes from the sidecar or the workspace, never from Deck: the status bands, the severities, the verbs. And a description a renderer cannot draw says so by name, the rule the Vault phase already states for an unsupported base expression.

### What this changes for Glass

[[TASK-0029-The-Band-Function]] becomes "the band section of every description, and the function that applies it". Its acceptance criteria stand: pure, tested over the real payloads, overflow counted rather than silent, held and joined-to-desk reserved. What changes is where the table lives and who else reads it: the list panel and Spread fold by the same rule Glass bands by. [[TASK-0033-Glass-Is-Addressed-And-Opened-First]]'s `surfaces` list is the description's, so a view that no design has drawn in Glass is not offered there.

## Part 3: writes, checkboxes and generated editors

### What the cockpit's write path is

About thirty POST endpoints under `/api/notes/`, `/api/design/`, `/api/inbox/` and `/api/cockpit/`, every one that touches a file guarded by one check: the caller's address is loopback. The cockpit's own decision note says so in as many words: the loopback check is not a safety feature on top of an authorisation model, it is the authorisation model ([[project-os-cockpit#ADR-0010]]). No header, token, session or signature exists anywhere in the sidecar. The `actor` in a request body is free text, and the cockpit's renderer hard-codes `user:edwin` in four places.

The verbs come from one table, `HUMAN_TRANSITIONS` in `note_writes.py`: five note types, one or two from-states each, two or three verbs each. `GET /api/notes/actions` serves the legal verbs for a note, with `confirm`, `disabled`, `reason` and `endpoint` per row. [[project-os-cockpit#REQ-0026]] requires that no renderer restate that table, and Deck must read it too. Writes are not frontmatter-only, whatever the capability register's blurb says: a transition appends a decision callout to the body, a test run appends a runs log, an acceptance run appends a section, and three endpoints rewrite one body line.

The out-of-loopback form is [[project-os-cockpit#REQ-0034]], a draft requirement with no feature: proof per request, never a session, never a LAN fallback, mechanism undecided. Until it lands, a write from a served page is refused by the sidecar regardless of what Deck does. [[project-os-cockpit#ADR-0010]]'s third consequence says every actuator stays shell-only until then.

### What this means for Deck's two hosts

Deck's shell runs on the same machine as the sidecar. Its main process can call a write endpoint and the sidecar sees loopback. Its served page cannot, and must not be helped to: Deck's host already forwards reads, and forwarding a write would launder a tablet's address into loopback, which is exactly the hole [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] closed for the inbox reads. So the write path is the preload bridge, an IPC call into the main process, and a loopback request to the sidecar; it is absent when served, the same way pop-out windows are absent. The capability set gains `write`, the served set says false, and the renderer offers a verb only when the capability says it can.

That is a decision, and it reverses a sentence in [[PHASE-0001-Deck]]'s scope ("Deck adds no write path of its own") and the last bullet of `docs/ARCHITECTURE.md`. It does not reverse ADR-0001, whose subject is the HTTP host; the host still answers 405 to every write. The ADR to write says: the shell writes through its main process to the loopback sidecar, using the sidecar's verbs and guards unchanged; the served host reads only until the cockpit's REQ-0034 lands, at which point Deck adopts whatever proof it defines. The actor is a setting in the store, not a literal.

One more consequence for the store: a write changes the record, the sidecar re-indexes, and every window's view is stale. The cockpit reloads over server-sent events; [[PHASE-0002-Glass]] and [[PHASE-0004-Parity]] already say a change is announced and applied on the person's action. The first write is the first time Deck needs that rule, so it belongs in the phase the write joins.

### Checkboxes inside a note

Two mechanisms exist and Deck should adopt both as they are. A criterion under an Acceptance or Exit Criteria heading is ticked through `/api/notes/tick`, which finds the line by its exact prose, refuses when it matches nothing or more than one line, requires evidence or a reason, and writes `- [x] text — evidence: ... (actor, date)`. Any other checkbox is flipped through `/api/notes/check-toggle` by its ordinal among the file's task lines. The rendered HTML Deck already shows carries `data-raw` on each checkbox, stamped by the sidecar's renderer, so the address arrives with the page. When the rendered count and the source count differ the sidecar emits no attributes at all, and Deck must then offer no tick rather than a wrong one.

The prior art says this is the right shape and names its edges. Obsidian Tasks tries the remembered line number, then a unique identical line, then the Nth task after the section start, and asks the user to make duplicate lines different when all three fail. Dataview checks the list-item regex and the task text and silently does nothing on a mismatch. SilverBullet checks the state characters at the offset. Gitea checks the three bytes around the offset and sends a content version. The only stable addresses anyone has are ids written into the file (Logseq's `id::` line, SilverBullet's anchors, Obsidian's `^block-id`), and no tool toggles a checkbox by one. So Deck should not invent an id scheme; it should send the note's mtime with every write that accepts one, and report the one case the sidecar cannot resolve, a duplicated line, in words. The ordinal toggle bypasses the mtime check today ([[project-os-cockpit#REQ-0027]] marks that criterion reconciled), which is a cockpit issue if Deck ever offers it on a note two windows show.

### Generated editors and pick-lists

The cockpit generates nothing. The mark dialog, the tick prompt, the release identity form and the acceptance runner are each hand-built in a twenty-thousand-line renderer. What it has instead is the raw material: seventeen templates under `docs/__templates__/`, each field with a shape a generator can read (a scalar, a list, a wikilink, a list of wikilinks, a date) and a YAML comment stating its rule. The vault's ten Novel templates are the same, with parents and references named in `Properties.md`.

The prior art agrees on three things. A field list with a type per field and a small set of editor hints beside it, either as a second document keyed by path (JSON Forms, react-jsonschema-form) or inline (Front Matter CMS, Decap, Tina, Payload). A reference field that names its target set in the schema (a collection, a content type, a query) and stores a slug, path or id; Obsidian and its Metadata Menu plugin store a quoted wikilink, which survives a rename because Obsidian maintains it. And pick-lists that are a fixed list almost everywhere, sourced from a query only in Metadata Menu, Payload and Sanity.

For Deck an editor description is derived, not authored: the fields from the note type's template, the pick-list values from the sidecar's vocabularies, the legal verbs from `GET /api/notes/actions`, and the reference targets from the type's `parent` and link fields. What it can write is bounded by the sidecar. A status changes through the transition endpoint; a verdict, a review, a tick, a test run and a release field each have one. **A generic "set this property to this value" endpoint does not exist**, and `ALLOWED_FIELDS` in `note_writes.py` is an allow-list of the frontmatter keys any endpoint may touch. Creating a note exists for two types, issue and release. So a generated editor for a character's age, or an issue's severity outside triage, is cockpit work, and the issue to file there is a guarded property write whose allow-list is the template's own fields.

The acceptance-checks page is the right first generated view-and-editor, because its data is already tabular on the sidecar side: the acceptance payload returns tiers, areas, items with their marks, the history per check, and the gate. The mark dialog is a check's rendered body, its comment history, a choice from a fixed vocabulary, a required reason, and one POST. That is a description with no new endpoint.

## Part 4: flows

### What a flow is in the cockpit today

The acceptance runner is the one flow with state, and its state is a variable in one renderer window: which feature, which step, how many passed. Each verdict writes immediately through the guarded endpoints, so the record keeps the work and only the position is lost when the window closes; the code says so, "the record is the ledger, not this object". The release page is step-shaped and stateless: name the version, settle the owed checks, seal the ledger, mark released, each an independent POST, with the "state" being the release note's frontmatter and the ledger files. The test runner keeps its steps in a closure and writes once at the end, so abandoning it loses everything. Nothing on the sidecar knows that a flow is in progress.

### What other tools do

The engines divide into three shapes. State machines (XState, SCXML, Amazon States Language, Serverless Workflow, Temporal) hold the flow's state themselves and carry no form vocabulary; a human step is a state waiting for an event or a token, and any UI can send it, but no UI can read from the file what to show. Camunda keeps the process in one document and each human step's form in another, referenced by id, and both its own task list and an embeddable library render the same form. The developer tools (Argo's suspend step, Backstage templates, GitHub's workflow inputs, Rundeck options) declare typed parameters inline and generate the form. Two things every engine that pauses for a person does: it pairs the pause with a timeout or a heartbeat, and it addresses the data between steps by a path expression.

None of them fits a record that is the source of state, because all of them keep a second copy of "where we are". The shape that does fit is the one the cockpit already uses by accident: a flow is an ordered list of steps, each step a predicate over the record that says whether it is done and a verb from the registry that does it, and the only state outside the record is a cursor.

### The shape, as a concept

```yaml
id: release
subject: release               # the note type the flow walks
steps:
  - id: name
    label: Name the version
    done_when: 'version != "" && platform != ""'
    verb: release-update       # a registry endpoint, never a restated verb
  - id: settle
    label: Settle what the gate still owes
    done_when: 'gate.blocking == 0'
    verb: release-settle
  - id: seal
    done_when: 'ledgers != ""'
    verb: seal-ledger
  - id: released
    done_when: 'status == "released"'
    verb: release-mark-released
```

The needs-you flow is the obligations list walked in order, with each step's verb the one the sidecar already names on the row. The issue flow is triage, then the transition the registry offers, then the tests the issue names. The acceptance flow is the runner, with its position in Deck's store instead of one window's memory, so a second window or a restart resumes it. `done_when` is the same expression language as a view's filter, over the note's frontmatter and the payloads the sidecar already serves.

Edwin said on 2026-09-08 that he does not yet know what flows should look like, and that they are to be considered now and fleshed out over time. So nothing is built. What the phase reserves is small: a flow step must be addressable, so the grammar can name one; the store must be able to hold a cursor, so a slot is reserved; and the expression language a view uses must be the one a step uses, so there is one evaluator.

## Part 5: what the additions have in common

Three seams are touched by all four additions, and each is a small change now and a retrofit later.

**The address grammar names more kinds of thing.** Today it names a workspace, a view, a desk, a note and one of three panels. Glass adds a surface ([[TASK-0033-Glass-Is-Addressed-And-Opened-First]]). A checks page, a release page, an editor over a note, and a flow at a step all need a written form, because the rule that every reachable state has an address is what makes a pop-out window and a tablet possible. The grammar should gain `surface`, `page` and `flow`/`step` keys, each refusing an unknown value exactly as `panel` does.

**The panel vocabulary opens, by registry.** `panels.ts` closes the set at three so an address cannot name what Deck cannot draw. The right form of that rule is the one views already use: a registry of panel kinds, populated by the phase that builds each kind, with the address parser asking the registry rather than a literal set. A description-drawn list, a page, an editor and a flow step are each a panel kind.

**The store learns three fields.** The actor, because the cockpit's literal cannot be copied; a flow cursor, reserved; and a "changed under you" mark that the first write needs and the live-changes rule in later phases extends. Editor drafts do not go in the store: a write is one request and its form is local.

**Capability gains `write`**, false when served, and the reason it is false is written in the ADR.

**Every vocabulary comes from the sidecar or the workspace.** The bands, the severities, the verbs, the types. Deck holds a copy of the bands today and it is already wrong. The cockpit serves none of them as data, so the issue to file there is a vocabulary payload: the status bands, the severity order and the type list. Until it exists, Deck's copy is pinned by a fixture read off `statuses.py`, the way the view list is pinned off the navigator, so drift fails a test instead of a person.

## Part 6: what to add to PHASE-0001, and what not to

### Add to the phase

| what | kind | settles | order |
| --- | --- | --- | --- |
| Deck writes through the shell; the served host reads only until the cockpit authenticates a non-loopback write | ADR | the write path, the capability, the actor, the announce-on-change rule; amends the phase's "reads only" scope line and `ARCHITECTURE.md` | first, it is a decision |
| A view is a description | FEAT | the description's sections (source, band, face, surfaces, verbs); the project-os provider emits seven mode-sourced descriptions equal to today's views; the band and face vocabularies leave `faces.ts`; the Bases subset is named as Deck's query language with the three type spellings normalised; the list panel draws any description | second, Glass builds on it |
| The first write | FEAT | one verb end to end in the shell: tick a criterion with evidence in the reader, and one transition from an actuator row read from `/api/notes/actions`; mtime sent; the changed-under-you mark; the tablet shows no verb | third, proves the ADR |
| The grammar and the panels open | TASK under FEAT-0006 | `surface`, `page`, `flow` and `step` keys, refusing unknown values; panel kinds from a registry | beside the description feature |
| Flows as a concept | section in `ARCHITECTURE.md` and a reserved store slot | the step-and-cursor shape, the shared expression language, nothing built | with the ADR |
| The Bases subset has two evaluators | RISK | Obsidian's and Deck's diverge; mitigation is the named subset and "not supported, named" | with the description feature |
| Deck depends on three cockpit endpoints that do not exist | RISK | records, property write, vocabularies; mitigation is the fixture pins and the mode-sourced descriptions that need none of them | with the description feature |

### File in the cockpit repository

Three issues, each filed the day the Deck feature that needs it starts, following the pattern [[TASK-0001-The-Whole-Edge-List-Is-One-Payload]] set. A records endpoint: every note with its frontmatter, or the evaluation of a base file, so that a client can arrange notes the sidecar does not already arrange. A guarded property write: set one allow-listed frontmatter field, with the template's fields as the allow-list, behind the same loopback and mtime guards. A vocabulary payload: the status bands, the severity order and the known types, so no client holds a copy. [[project-os-cockpit#ISS-0279]] stays with the Vault phase.

### Leave where it is

Glass keeps its features and tasks; TASK-0029 changes from a module to a description section and the rest of the phase is unchanged. Parity keeps every page, the console and the remaining verbs; the description and the first write are what make those adoptable one row at a time. Vault keeps the profile, the base-file provider and the canvases; it gains nothing here except a query language it no longer has to invent. Generated editors beyond the actuator row and the mark dialog wait for the property-write endpoint. Flows are a concept until Edwin has seen a description-drawn view and a write and can say what a flow should look like.

### The cost to Glass

Glass starts after the description feature rather than now. The description feature with mode sources only is small: the record grows five sections, the provider's seven entries grow with them, the fixture test grows, `faces.ts` becomes a reader of the description, and TASK-0029's function moves. The ADR and the first write can run beside it. What is bought is that Glass, Spread and the list read one rule, that the vault's views arrive as data, and that the first write path is decided before three phases build on the assumption that there is none.

## Part 7: questions for Edwin, and his answers

Answered on 2026-09-08, the same day. Each answer is under its question.

1. **Evaluation in Deck or in the sidecar.** The recommendation was mode sources now and a records endpoint from the cockpit for query sources, with Deck's own index as the fallback. **Answer: Deck's own index.** "Decks own index, the Decks application are individual applications/views": Deck is an application in its own right and does not wait on the cockpit for the notes it arranges. The records-endpoint issue in Part 6 is withdrawn; the risk that a second indexer drifts from the sidecar's stands and is mitigated by pinning the two to the same normalisation rules.
2. **The Bases language as Deck's query language.** **Answer: as the initial definition only, and it must be extensible, probably significantly.** "The issue with using the bases subset is that it is a subset which we know cannot represent everything." So the description language is Deck's own, seeded with the measured subset so that every existing base file reads as a Deck description, with a stated extension mechanism from the first version: a version number on every description, and extension keys in a namespace of Deck's own that a base file never uses, the way a registered Bases view type stores its own keys beside the core's.
3. **Whether the tablet ever writes.** **Answer: it does not.** The served host reads only, as a rule rather than as a wait on the cockpit's REQ-0034. The ADR in Part 6 says so and names no condition.
4. **Whether PHASE-0001 reopens or a design step is inserted before PHASE-0002.** **Answer: PHASE-0001 reopens** to carry the additions in Part 6.

## Sources

Deck and the cockpit, read on 2026-09-08: `desktop/src/shared/*.ts` and `desktop/src/main/host.ts` in this repository at `50eac60`; `cockpit.py`, `obligations.py`, `statuses.py`, `note_writes.py`, `server.py`, `renderer.py` and `index.py` in `../project-os-cockpit/src/project_os_cockpit/` at `c0ed9e3`; `docs/decisions/ADR-0010`, `docs/requirements/REQ-0026`, `REQ-0027`, `REQ-0034` and `docs/reference/cockpit-capability-register.md` there. The vault: the ten live `.base` files, `Properties.md` and `__templates__/Novel/*.md` in `~/Notes`.

Declarative views: Obsidian Bases syntax and views, https://obsidian.md/help/bases/syntax; Notion views API, https://developers.notion.com/reference/view; Directus presets, https://directus.com/docs/api/presets; Adaptive Cards templating, https://learn.microsoft.com/en-us/adaptive-cards/templating/language; Airbnb's server-driven UI as reported by InfoQ, https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/; Anytype views, https://doc.anytype.io/anytype/organize/views.md; Logseq advanced queries, https://github.com/logseq/docs; Dataview, https://blacksmithgu.github.io/obsidian-dataview/; Furnas, "Generalized Fisheye Views", CHI 1986; Heer and Card, "DOITrees Revisited", AVI 2004.

Generated editors: JSON Forms, https://jsonforms.io/docs/uischema/controls; react-jsonschema-form, https://rjsf-team.github.io/react-jsonschema-form/docs/; Obsidian Properties, https://obsidian.md/help/properties; Metadata Menu, https://mdelobelle.github.io/metadatamenu/; Notion property objects, https://developers.notion.com/reference/property-object; Front Matter CMS fields, https://frontmatter.codes/docs/content-creation/fields; Decap CMS widgets, https://decapcms.org/docs/widgets/; Sanity reference type, https://www.sanity.io/docs/reference-type; Payload relationship field, https://payloadcms.com/docs/fields/relationship; Keystatic relationship field, https://keystatic.com/docs/fields/relationship.

Flows: XState, https://stately.ai/docs/machines; SCXML, https://www.w3.org/TR/scxml/; Camunda user tasks and forms, https://docs.camunda.io/docs/components/modeler/bpmn/user-tasks/; Amazon States Language, https://states-language.net/spec.html; GitHub Actions workflow syntax, https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax; Argo suspend and intermediate inputs, https://argo-workflows.readthedocs.io/en/latest/walk-through/suspending/; n8n Wait node, https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/; Backstage templates, https://backstage.io/docs/features/software-templates/writing-templates; Serverless Workflow DSL, https://github.com/serverlessworkflow/specification; Temporal message passing, https://docs.temporal.io/develop/python/message-passing.

Writing into Markdown: Obsidian Tasks source, https://github.com/obsidian-tasks-group/obsidian-tasks (`src/Obsidian/File.ts`); Obsidian API, https://github.com/obsidianmd/obsidian-api; Obsidian block links, https://obsidian.md/help/links; Dataview `rewriteTask`, https://github.com/blacksmithgu/obsidian-dataview; SilverBullet, https://silverbullet.md and its `plugs/index/task.ts`; Logseq plugin API, https://logseq.github.io/plugins/; GitHub task-lists-element, https://github.com/github/task-lists-element; Gitea PR 25184; GitLab and comrak source positions; NotePlan plugin API, https://help.noteplan.co/article/70-javascript-plugin-api; mdast, https://github.com/syntax-tree/mdast; ruamel.yaml round-trip mode.

Not verified against a primary source, and not relied on above: Salesforce Flow and FlexiPage metadata, Contentful's content-type reference, Fibery's view metadata shape, the app JSON schemas of Retool, Appsmith, Budibase and ToolJet, Android Remote Compose, Adaptive Cards' dynamic choice sets, and any GitHub API that addresses one checkbox.

## Maintenance

This note describes Deck, the cockpit and the vault on 2026-09-08. A decision on Part 6, or a note it lists being created, makes the corresponding part historical. Do not edit the findings; add a dated line here saying what changed.

- 2026-09-08, later — **the notes Part 6 lists are created, so Parts 2 to 6 are now historical.** Two decisions: [[ADR-0003-Deck-Writes-Through-The-Shell]] and [[ADR-0004-A-View-Is-A-Description]]. Three features: [[FEAT-0011-Decks-Own-Index]] (three tasks), [[FEAT-0012-A-View-Is-A-Description]] (six) and [[FEAT-0013-The-First-Write]] (five), plus [[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]] under [[FEAT-0006-Every-State-Has-An-Address]], which returns from `done` to `doing`. Two hazards: [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]] and [[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]. Nine checks, TST-0026 to TST-0034. [[PHASE-0001-Deck]] carries five new exit criteria and stays `active`; [[TASK-0029-The-Band-Function]] is amended and [[PHASE-0002-Glass]] now starts after the description feature. `docs/ARCHITECTURE.md` gains Deck's index in the layers table, the shell-writes rule in place of "reads and never writes", and the flows concept from Part 4. Part 6's records-endpoint issue is not filed, by the first answer in Part 7; the two remaining cockpit issues — a vocabulary payload and a guarded property write — are still owed and are filed the day the task that needs each one starts.
- 2026-09-08 — Edwin answered the four questions the same day (Part 7): Deck keeps its own index, the Bases subset is the initial definition of a language Deck owns and extends, the tablet never writes, and [[PHASE-0001-Deck]] reopens for Part 6. The records-endpoint issue in Part 6 is withdrawn by the first answer. The notes Part 6 lists are created from this note; the phase note records which.
