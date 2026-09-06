---
type: "[[feature]]"
id: FEAT-0001
aliases: ["FEAT-0001"]
title: "The corpus has an inside — an orbit view of the whole link graph, flown rather than listed, in the cockpit"
status: planned
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-05
updated: 2026-09-06
source: ["Edwin 2026-09-05: 'I like the idea of the 3d world fly-through ... I would like an orbit view in the application in general, so feel free to create the corresponding docs for thus'"]
goal: "Give the cockpit a view of the link graph as a whole — 16148 edges over 1537 notes, coloured by status band, entered by flying rather than by listing — so the structural questions the reader cannot currently ask (what does nothing link to, which clusters hang by one edge) have somewhere to be asked."
requirements: []
tasks: ["[[TASK-0001-The-Whole-Edge-List-Is-One-Payload]]", "[[TASK-0002-The-Layout-Is-Computed-Once-And-Kept]]", "[[TASK-0003-The-Field-Renders-And-Flies]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[TASK-0005-The-Treatment-Is-Chosen-Not-Assumed]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0001-Nine-Ways-To-Read-The-Record]]"
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[project-os-cockpit#FEAT-0093]]", "[[project-os-cockpit#ADR-0009]]"]
---

# The corpus has an inside

## Goal

**The cockpit can resolve one link but has never shown the shape they make.** Click a `[[wikilink]]` and it navigates; scroll to the foot of a note and it lists backlinks. Both are the *local* view of a structure with 16148 edges over 1537 notes, and there is no view of the whole.

This adds one: a field of nodes coloured by status band, clustered by phase, entered by flying rather than by scrolling. It is a **view in the cockpit**, at `~orbit`, alongside `~history` and `~checks` — not a replacement for anything.

## Why it earns a place

Three questions are asked in this project and answered today by grep or not at all:

- **What does nothing link to?** 2206 of the corpus's link targets are distinct; notes outside that set are unreachable by reading, and nothing reports them.
- **Which clusters hang by a single edge?** The phases are supposed to be separable. Nobody has checked.
- **Where did this note come from?** Backlinks list *that* something links here. The graph shows *from where*, at a glance, including the two-hop neighbourhood the list cannot show.

The first is a query a table could answer, and [[DES-0001]] says so plainly in ORBIT's own objection. The second and third are not.

## Scope

- `~orbit` as a cockpit route, reachable from the rail and from any note ("show this in the field")
- Node colour is the **status band from `statuses.py`** — no second vocabulary ([[project-os-cockpit#ISS-0023]])
- Node size is inbound links; clusters are phases
- Fly, zoom, and land: landing opens the note in the existing reader rather than in a bespoke panel
- Hovering an **edge** surfaces the sentence in the source note that contains the link — the one thing a graph view usually discards
- Layout computed once and cached; a new note takes a place without moving its neighbours

## Out of scope

- **Replacing the reader.** The document pane is where a note is read. Orbit navigates to it.
- **Editing from the field.** No verb is discharged here. Obligations live with their subject ([[project-os-cockpit#ADR-0020]]) and the field is not their subject.
- **The fleet as one graph.** One sidecar serves one repo ([[project-os-cockpit#FEAT-0093]]); a cross-repo field is a separate question and is not answered here.
- **The visual treatment**, which is [[TASK-0005]] and [[DES-0001]]'s open decision D1 — constellation, glass or blocks.

## Open decision

**D1 — constellation, glass or blocks.** [[DES-0001]] draws three treatments of the same view, live and switchable: a near-black sky of luminous points; a cyan instrument with brackets and billboarded panes; and opaque painted-wood solids on a lit table. They differ in what they make easy to believe, not only in how they look, and two of them cost something real — glass collapses four of the six status hues into 25 degrees, and blocks cannot draw the 16148 edges at all. The choice is Edwin's. Nothing else in this feature depends on it except [[TASK-0003]]'s renderer.

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `FEAT-0144` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).
