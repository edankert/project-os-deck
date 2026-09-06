---
type: "[[plan]]"
title: "Plan — the orbit view"
status: draft
owner: user:edwin
created: 2026-09-05
updated: 2026-09-06
source: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
implements: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]"]
---

# Plan — the orbit view

## Delivery sequence

1. **[[TASK-0001]] — the payload.** One endpoint returns the whole edge list plus each link's character offset, so the edge callout can quote the sentence that made the link. Read-only; nothing else depends on the renderer existing.
2. **[[TASK-0002]] — the layout.** Positions computed once from the edge list and stored, with the rule for what a *new* note does: take a place without moving its neighbours. This is the task that decides whether the view is stable enough to be worth learning.
3. **[[TASK-0005]] — the treatment.** The decision, before the renderer. Drawn both ways in [[DES-0001]]; taken by a person.
4. **[[TASK-0003]] — the renderer.** Canvas, status-band colour, fly/zoom/land, at 1537 nodes and 16148 edges without dropping frames.
5. **[[TASK-0004]] — landing.** A node opens the note in Deck's reader, so the field never becomes a second, worse document pane.

## Sequencing note

**2 before 4, and 3 before 4.** A renderer written against an unstable layout has to be rewritten when the layout is fixed, and a renderer written before the treatment is chosen is written twice. Neither is expensive; both are avoidable.

## Verification

The view's claim is *structural*, so its check is structural: a corpus with a known planted defect — one orphan note, one cluster joined by a single edge — must make both visible without the reader being told where to look.

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `docs/features/orbit-view/plan/PLAN.md` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).
