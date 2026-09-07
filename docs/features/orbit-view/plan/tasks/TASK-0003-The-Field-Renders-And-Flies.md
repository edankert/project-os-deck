---
type: "[[task]]"
id: TASK-0003
aliases: ["TASK-0003"]
title: "The field renders and flies — 1537 nodes and 16148 edges, coloured by status band, at a frame rate that survives a laptop"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-05
updated: 2026-09-07
source: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
parent: "FEAT-0001"
effort: ""
due: ""
depends: ["TASK-0002", "TASK-0005", "TASK-0031"]
blocks: ["TASK-0004"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
tests: []
---

# The field renders and flies

## Objective

The orbit arrangement draws the whole link graph inside the Glass field and lets you move through it: drag to turn, scroll to close in, hover an edge to read the sentence that made it.

## Detail

**This is an arrangement of the Glass field, not a second renderer.** [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]'s TASK-0031 builds the renderer: the near bands as bound cards, the quiet band on one canvas, fog instead of blur. The orbit adds to it an arrangement rule, distance is connectedness, using the positions [[TASK-0002]] stored, and an edge overlay. The edges go on the canvas the quiet band already uses, because 16148 edge elements in the DOM is a different and worse problem.

Colour is the **status band**, read from the sidecar, the same source the cockpit reads. Size is inbound links. Clusters are phases.

The treatment of the orbit — the sky, the instrument or the lit workshop of blocks — is [[TASK-0005]]'s decision and arrives before this task starts. The three differ in more than palette: blocks are opaque and stack, so occlusion carries meaning, and edges have to be drawn differently or not at all. The field's own cards keep [[DES-0002]]'s fog-and-detail treatment whatever is chosen here.

**Reduced motion is not an afterthought.** The orbit must not drift on its own for a reader who has asked for stillness; it still turns under the pointer, and arriving at a node is shown by a highlight rather than by nothing.

**The frame rate is the phase's third number.** The median frame time while turning, at this repository's 1537 nodes and 16148 edges, in a foreground window on the development laptop, goes into [[FEAT-0001-The-Corpus-Has-An-Inside]] and is an exit criterion of [[PHASE-0002-Glass]]. If it is not there, the orbit is what is not built, and the field's other arrangements are unaffected.

## Acceptance

- The orbit is one arrangement in the field's switcher, drawn by the field's renderer, with edges on the canvas overlay and no second renderer
- Interactive at this repo's real size on the development laptop, with the frame time written as a number in the feature note rather than described as "smooth"
- `prefers-reduced-motion` stops the idle rotation and nothing else, and arrival is shown without motion
- Hovering an edge shows the containing sentence from the source note

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `TASK-0594` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]). Rewritten on 2026-09-07 to render inside the Glass field's renderer when [[PHASE-0002-Glass]] opened with the field built first.
