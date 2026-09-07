---
type: "[[feature]]"
id: FEAT-0001
aliases: ["FEAT-0001"]
title: "The corpus has an inside — an orbit view of the whole link graph, flown rather than listed, in Deck"
status: planned
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-05
updated: 2026-09-07
source: ["Edwin 2026-09-05: 'I like the idea of the 3d world fly-through ... I would like an orbit view in the application in general, so feel free to create the corresponding docs for thus'", "Edwin 2026-09-07: 'I am still very much thinking that glass should be the main view, so let's build glass now first, iron out issues and then work on parity'"]
goal: "Give Deck a view of the link graph as a whole — 16148 edges over 1537 notes, coloured by status band, entered by flying rather than by listing — so the structural questions the reader cannot currently ask (what does nothing link to, which clusters hang by one edge) have somewhere to be asked."
requirements: []
tasks: ["[[TASK-0001-The-Whole-Edge-List-Is-One-Payload]]", "[[TASK-0002-The-Layout-Is-Computed-Once-And-Kept]]", "[[TASK-0003-The-Field-Renders-And-Flies]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[TASK-0005-The-Treatment-Is-Chosen-Not-Assumed]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0001-Nine-Ways-To-Read-The-Record]]"
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[TST-0025-A-Planted-Orphan-And-A-Single-Edge-Cluster-Are-Visible]]", "[[project-os-cockpit#FEAT-0093]]", "[[project-os-cockpit#ADR-0009]]"]
---

# The corpus has an inside

## Goal

**The cockpit resolves one link at a time and has never shown the shape the links make.** Click a `[[wikilink]]` and it navigates; scroll to the foot of a note and it lists backlinks. Both are the *local* view of a structure with 16148 edges over 1537 notes, and there is no view of the whole.

This adds one, in Deck: **the orbit arrangement of the Glass field.** Glass ([[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]) is one field of cards that every view re-arranges under its own rule. The orbit is one more arrangement of that same field, where distance is connectedness: nodes coloured by status band, clustered by phase, entered by flying rather than by scrolling. It is drawn by the field's own renderer, with the near bands as bound cards and the quiet band on a canvas, and it is not a second renderer.

**The field is Deck-only.** Edwin decided on 2026-09-06 that the cockpit gets no orbit route. The cockpit keeps its reader and its backlinks; the view of the whole graph lives in Deck.

## Why it earns a place

Three questions are asked in this project and answered today by grep or not at all:

- **What does nothing link to?** 2206 of the corpus's link targets are distinct; notes outside that set are unreachable by reading, and nothing reports them.
- **Which clusters hang by a single edge?** The phases are supposed to be separable. Nobody has checked.
- **Where did this note come from?** Backlinks list *that* something links here. The graph shows *from where*, at a glance, including the two-hop neighbourhood the list cannot show.

The first is a query a table could answer, and [[DES-0001]] says so plainly in ORBIT's own objection. The second and third are not.

## Scope

- The orbit as one arrangement of the Glass field, with its own address (the address grammar is [[PHASE-0001-Deck]]'s, and [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] extends it with the surface), reachable from Deck's view switcher and from any note ("show this in the field")
- Node colour is the **status band from `statuses.py`** — no second vocabulary ([[project-os-cockpit#ISS-0023]])
- Node size is inbound links; clusters are phases
- Fly, zoom, and land: landing lifts the note onto the desk ([[FEAT-0010-Lifting-A-Note]]) and opens it in Deck's reader, the pane Spread already opens notes in, rather than in a bespoke panel
- Hovering an **edge** surfaces the sentence in the source note that contains the link — the one thing a graph view usually discards
- Layout computed once and cached; a new note takes a place without moving its neighbours
- **Three measurements, written as numbers.** The size and time of the one request that returns the whole edge list ([[TASK-0001-The-Whole-Edge-List-Is-One-Payload]]); the position drift when a note is added and the layout is recomputed ([[TASK-0002-The-Layout-Is-Computed-Once-And-Kept]]); the frame rate the orbit holds at 1537 nodes and 16148 edges on a laptop ([[TASK-0003-The-Field-Renders-And-Flies]]). They are exit criteria of [[PHASE-0002-Glass]].

## Out of scope

- **Replacing the reader.** The document pane is where a note is read. Orbit navigates to it.
- **Editing from the field.** No verb is discharged here. Obligations live with their subject ([[project-os-cockpit#ADR-0020]]) and the field is not their subject.
- **The fleet as one graph.** One sidecar serves one repo ([[project-os-cockpit#FEAT-0093]]); a cross-repo field is a separate question and is not answered here.
- **An orbit route in the cockpit.** Decided against on 2026-09-06. The adoption table needs no row for it.
- **The visual treatment of the orbit**, which is [[TASK-0005]] and [[DES-0001]]'s open decision D1 — constellation, glass or blocks.
- **A second renderer.** The Glass field's renderer is [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]'s; the orbit adds an arrangement and an edge overlay to it.

## Acceptance

- The orbit arrangement opens from the view switcher and from a note, over this repository's whole link graph, and a planted orphan note and a planted cluster joined by one edge are both visible without being told where to look ([[TST-0025-A-Planted-Orphan-And-A-Single-Edge-Cluster-Are-Visible]]).
- A node's colour is the status band the reader shows for the same note, asserted by a test.
- Hovering an edge shows the sentence in the source note that made the link.
- Landing on a node lifts it onto the desk and opens it in Deck's reader, and no verb can be discharged from the field.
- The three measurements are written as numbers in this note.

## Open decision

**D1 — constellation, glass or blocks.** [[DES-0001]] draws three treatments of the same view, live and switchable: a near-black sky of luminous points; a cyan instrument with brackets and billboarded panes; and opaque painted-wood solids on a lit table. They differ in what they make easy to believe, not only in how they look, and two of them cost something real — glass collapses four of the six status hues into 25 degrees, and blocks cannot draw the 16148 edges at all. The choice is Edwin's. It now concerns the orbit arrangement's look only, because the Glass field itself is built with [[DES-0002]]'s fog-and-detail treatment. Nothing else in this feature depends on it except [[TASK-0003]]'s edge overlay.

## Where this stands

**2026-09-07: no longer the gate in front of Glass, but one arrangement inside it.** Edwin, the same day: *"I am still very much thinking that glass should be the main view, so let's build glass now first, iron out issues and then work on parity."* [[ADR-0002-Glass-Is-The-Main-View]] records the decision, and [[PHASE-0002-Glass]] opens today. Until then this feature was the read-only slice the phase had to measure before [[DES-0002]]'s arrangements could be built. That order is reversed: the field is built first ([[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]), and the orbit is drawn by the field's renderer as the arrangement where distance is connectedness. The three measurements stay, as exit criteria of the phase rather than as preconditions for starting it. If one of them fails, the orbit arrangement is what is not built, and the rest of Glass is unaffected.

**One dependency lives in the other repository.** The whole edge list with the offset of every link is a new read endpoint, and the sidecar is not changed for Deck: the cockpit is the primary place for new functionality. So [[TASK-0001-The-Whole-Edge-List-Is-One-Payload]] is split. The endpoint is an issue filed in project-os-cockpit when the task starts, and the task in this repository is the consuming half: the typed client method, the path in Deck's host's allow-list, and the assertion that a node's band equals the reader's. Nothing else in the phase waits on it. [[FEAT-0010-Lifting-A-Note]]'s neighbourhood reads `/api/cockpit/context` per held note until the graph endpoint exists.

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `FEAT-0144` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]). Rewritten on 2026-09-06 with Deck as the venue; the text as moved described `~orbit` as a cockpit route.
