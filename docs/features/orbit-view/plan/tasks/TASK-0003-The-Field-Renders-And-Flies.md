---
type: "[[task]]"
id: TASK-0003
aliases: ["TASK-0003"]
title: "The field renders and flies — 1537 nodes and 16148 edges, coloured by status band, at a frame rate that survives a laptop"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-05
updated: 2026-09-06
source: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
parent: "FEAT-0001"
effort: ""
due: ""
depends: ["TASK-0002", "TASK-0005"]
blocks: ["TASK-0004"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]"]
tests: []
---

# The field renders and flies

## Objective

The Glass view draws the field and lets you move through it: drag to turn, scroll to close in, hover an edge to read the sentence that made it.

## Detail

Canvas, not SVG — 16148 edge elements in the DOM is a different and worse problem.

Colour is the **status band**, read from the sidecar, the same source the cockpit reads. Size is inbound links. Clusters are phases.

The treatment — the holographic field or the lit workshop of blocks — is [[TASK-0005]]'s decision and arrives before this task starts. The two differ in more than palette: blocks are opaque and stack, so occlusion carries meaning, and edges have to be drawn differently or not at all.

**Reduced motion is not an afterthought.** The field must not drift on its own for a reader who has asked for stillness; it still turns under the pointer.

## Acceptance

- Interactive at this repo's real size on the development laptop, with the frame budget stated in the note rather than described as "smooth"
- `prefers-reduced-motion` stops the idle rotation and nothing else
- Hovering an edge shows the containing sentence from the source note

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `TASK-0594` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).
