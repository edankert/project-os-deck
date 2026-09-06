---
type: "[[design]]"
id: DES-0001
aliases: ["DES-0001"]
title: "Nine ways to read the record, and a tenth that was cut and then asked for — whole applications over one corpus"
role: proposal
decided: ""
status: "proposed"
phase: ""
owner: user:edwin
created: 2026-09-05
updated: "2026-09-05"
source: ["Edwin 2026-09-05: 'I would like you to design 9 totally different applications ... not different themes, actually different applications'", "Edwin 2026-09-05, rev 2: 'I asked for a full replacement of the current cockpit-os ... suggest how the application looks with the same level of functionality currently enabled in the cockpit (also consider terminal integration)'", "Edwin 2026-09-05, rev 2: 'I like the idea of the 3d world fly-through, this feels a little minority report like or did you have something more like (wooden) play blocks in mind'", "Edwin 2026-09-05, rev 2: 'the minority report, the building / play blocks and the option you had in mind originally ... explore all three' — about the room-scale VR option"]
asset: "DES-0001-nine-ways-to-read-the-record.html"
implements: []
supersedes: ""
superseded_by: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-028-Borrowed-Capability]]", "[[project-os-cockpit#FEAT-0080]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[DES-0002-Cockpit-Design-System]]", "[[project-os-cockpit#ADR-0020]]", "[[DESIGN]]"]
tags: [design, survey, exploration]
---

# Nine ways to read the record, and a tenth

> **Rev 2 changed what this document is.** Rev 1 drew nine *views*. Edwin's response was that he had asked for **full replacements of the cockpit** — applications carrying everything it does today, terminal included. So every plate now answers for the whole application, a capability inventory read off the code says what "everything" means, and a coverage table records which designs cannot carry it. **Four of the ten cannot, and say so.** One thing is now real: ORBIT was asked for and is filed as [[FEAT-0001]], with its visual treatment left open and drawn three ways.

## Problem

**The cockpit has one shape, and it is a reader.** Three panes, a document in the middle, a rail of workspaces: the shape you use to *read* a record and *discharge* what it owes. It is the right shape for that, and [[DESIGN]] is the argument for why.

It is not the only shape the data supports, and nothing in the repo says what the others would be. The corpus, measured today:

| what | count |
| --- | --- |
| notes under `docs/` | 1537 |
| `[[wikilinks]]` between them | 16148 |
| distinct link targets | 2206 |
| notes created per month, 2026-05 → 09 | 180 / 1 / 313 / 634 / 6 |
| notes carrying `review_verdict: changes-requested` | 70 |
| …of those, already at a terminal status | 61 |

Two of those rows are the argument for this note. **16148 links over 1537 notes is a graph nobody has ever seen** — the cockpit resolves a wikilink when you click it and shows backlinks on the note, which is the local view of a structure that has never been drawn whole. And **the month histogram has a hole in it**: one note in June, against 180 in May and 313 in July. No current surface makes that visible, because every surface is scoped to a note, a phase or a queue, and a silence belongs to none of them.

*(The 70/61 row also updates a measurement `CLAUDE.md` records as 49/43 on 2026-08-20. The stale-verdict backlog has grown by 21 in sixteen days. That is a finding this exercise produced by accident, and it belongs in an issue rather than in a design — noted here only because the number appears in the artifact.)*

## Approach

**Ten applications, separated on six axes, one corpus underneath.** The brief was that they be different *applications* rather than different *themes*, so the artifact opens with the matrix that makes that claim checkable: dimension, who decides the layout, which slice of time, primary input, venue, and the verb the user is performing. Two designs that land on the same row of that matrix are one design wearing two skins, and the matrix is where that is caught.

**A replacement has to carry everything, so rev 2 lists everything.** Twelve capabilities read off the routes, the write endpoints and the obligation registry — render a note, move around 1537 of them, show what is owed, discharge it, review, accept, release, publish, report the validator, agent sessions, the terminal, the fleet. Each plate then answers for the lot in a `<plate>-application` region: what is on screen at rest, where the document goes, where the verbs live, and where the terminal lives. **The terminal is the question that separates them**, because a real shell is a keyboard surface and several of these designs are not.

**Five keep the cockpit's reader and route to it.** A graph, a map, a table and a factory floor are all bad places to read 1500 words of Markdown, and building a second renderer to prove otherwise is the mistake [[project-os-cockpit#ISS-0151]] already names. What those five replace is everything *around* the document, which is most of the application.

| # | name | what it is | the verb |
| --- | --- | --- | --- |
| 1 | **ORBIT** | the 16148 links as a solid you fly through, coloured by status band | explore |
| 2 | **ATLAS** | the corpus as land with fixed coordinates you learn by heart | locate |
| 3 | **REEL** | the project as a scrubable timeline that reconstructs any past instant | reconstruct |
| 4 | **PULSE** | live agent sessions as an instrument wall for a second screen | supervise |
| 5 | **ASK** | the record as a branching conversation with citations | interrogate |
| 6 | **DECK** | one obligation at a time, dealt as cards, to zero | discharge |
| 7 | **LEDGER** | every note as a row, faceted, sortable, bulk-editable | query |
| 8 | **BROADSHEET** | the week auto-typeset as a newspaper, for paper or e-ink | read |
| 9 | **FOUNDRY** | work as a factory floor where the bottleneck is physically visible | unblock |
| 10 | **ROOM** | the record at body scale, in three treatments — a hall you walk, a gestural instrument, a model on a table | judge |

Each plate in the artifact carries a mock, the navigation model, the data it would need — separated into endpoints that exist today and what would have to be built — and the strongest objection to building it. The objection is part of the design, not an appendix: a proposal that cannot state its own weakest point has not been argued.

**The mocks use measured numbers.** Every count, every date span and every ID in the artifact is this repo's. The month histogram under REEL's ruler is the 180/1/313/634 above, so the June silence is visible in the mock rather than described in prose.

## The treatments, and why they are a decision rather than a palette

Two plates carry a live toggle between visual treatments, because in both cases the look changes what the view *claims*, not just how it reads.

**ORBIT — CONSTELLATION, GLASS, BLOCKS.** A near-black sky of luminous points; a cyan instrument with brackets, billboarded panes and a scan sweep; or opaque painted-wood solids on a lit table. Two consequences are recorded on the plate because they are costs, not moods. GLASS washes the bands toward one instrument colour, which puts **four of the six statuses inside 25 degrees of hue** — `blocked` survives as the single alarm red and `archived` is desaturated, and the other four stop being distinguishable. BLOCKS is opaque, so **16148 edges cannot be drawn**, and the link callout — ORBIT's best idea — goes with them. In exchange, BLOCKS makes `done` the *bare wood*: 70% of the corpus is terminal, so painting it would give a city of one colour.

**ROOM — THE STACKS, GESTURE ROOM, BUILD TABLE.** A hall of lit document bays walked at 1.65 m; panes in an arc at arm's length that you pull, push and throw; or the ORBIT block model at 1:1 on a table you walk around. These disagree about **where you are** — inside the record, operating it, or standing over it. The Build Table is the only surface in this document with **a second person in it**, which matters in a project where every judgment currently has exactly one human available.

## Regions

Sixty-nine regions. Each of the ten plates carries six — the plate itself, then its mock, navigation, data and objection — so a reviewer can object to *how it is drawn*, to *whether it carries the whole application*, to *what it would cost*, and to *whether it should exist at all*. Those are four different arguments and they were collapsing into one.

- `masthead` — the framing: what this is, what it is not, and what is now real
- `capabilities` — the twelve things a replacement has to carry, read off the code
- `coverage` — the ten designs against those capabilities; where the ✕ marks are is the finding
- `matrix` — the six-axis separation table; the check on "these are nine applications, not nine themes"
- `orbit`, `atlas`, `reel`, `pulse`, `ask`, `deck`, `ledger`, `broadsheet`, `foundry`, `room` — one per plate, for a comment about the concept as a whole
- `<plate>-mock` — the drawing, for a comment about what is on screen
- `<plate>-navigation` — the claimed interaction model, which is what separates each design from the other eight
- `<plate>-data` — what exists today against what would have to be built
- `<plate>-application` — the whole application in that idiom: at rest, the document, the verbs, the terminal, the fleet
- `<plate>-objection` — the strongest argument against building it, mine unless stated
- `orbit-treatments`, `room-treatments` — the three-way visual decisions, one region each
- `not-drawn` — seven concepts considered and rejected, each with the reason
- `first-build` — which two are worth a prototype, and the order
- `incidental-finding` — the stale-verdict measurement, which is not a design and says so

## Tokens

**Status and severity are the implementation's, verbatim** from `src/project_os_cockpit/static/base.css` — `--status-active`, `--status-pending`, `--status-done`, `--status-archived`, `--status-blocked`, `--status-reference` and the four `--severity-*`. Light values are declared first, because `design_tokens.read_tokens` takes the first declaration and a dark-block-first artifact would be compared against the wrong scheme.

Everything else in the artifact is its own chrome and is **not** a specification. The dossier's editorial palette (`--paper`, `--ink`, `--rule`, `--accent`) exists to frame nine mocks that must not look alike, and each mock declares a scoped local palette under its own selector (`.m-orbit`, `.m-atlas`, …). Those are illustration. If any of the nine is ever built, its palette is designed then, against [[DES-0002]].

## Out of scope

- **Choosing.** Ten proposals, no ranking beyond `first-build`. One exception: [[FEAT-0001]] exists because it was asked for, and even that leaves its treatment undecided ([[TASK-0005]]).
- **Feasibility beyond the data.** Each plate names the endpoints it would need; none estimates effort, and no plate has been checked against what the sidecar can actually serve at 1537 notes.
- **The cockpit's own shape.** Nothing here proposes changing the three-pane reader. These are applications *beside* it, over the same corpus.
- **Mobile.** [[project-os-cockpit#FEAT-0079]] owns supervision from a phone; DECK is drawn at a phone's proportions but does not restate that feature's boundary.

## Revisions

- 2026-09-05 — written; nine plates, fifty regions
- 2026-09-05 — rev 2. Re-pitched as whole applications after Edwin's *"I asked for a full replacement"*: added the twelve-capability inventory and the coverage table, and a `<plate>-application` region on every plate covering the document, the verbs, the terminal and the fleet. ORBIT forked into three live treatments (constellation / glass / blocks) and filed as [[FEAT-0001]]. Room-scale VR promoted out of the not-drawn list to plate 10 with three treatments of its own. Ten plates, 69 regions.

## Review

<Region-anchored comments land here. Verdicts go in the frontmatter, transcribed from a review that actually happened — never anticipated.>

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `DES-0013` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).
