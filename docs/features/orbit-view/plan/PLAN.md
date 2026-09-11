---
type: "[[plan]]"
title: "Plan — the orbit view"
status: active
owner: user:edwin
created: 2026-09-05
updated: 2026-09-11
source: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
implements: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[DES-0002-The-Glass-Cockpit]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[TST-0025-A-Planted-Orphan-And-A-Single-Edge-Cluster-Are-Visible]]"]
---

# Plan — the orbit view

## Delivery sequence

1. **[[TASK-0001]] — the payload.** The whole edge list, with each link's character offset, is a new read endpoint in the sidecar, and the sidecar is not changed for Deck. The task therefore starts by filing an issue in project-os-cockpit for the endpoint, and its own work is the consuming half: the typed client method, the path in Deck's host's allow-list, and the assertion that a node's band equals the reader's. The first of the phase's three numbers, the size and time of that one request, is written here.
2. **[[TASK-0002]] — the layout.** Positions computed once from the edge list and stored, with the rule for what a *new* note does: take a place without moving its neighbours. This is the task that decides whether the orbit is stable enough to be worth learning, and its drift is the phase's second number.
3. **[[TASK-0005]] — the treatment.** The decision, before the orbit is drawn. Drawn three ways in [[DES-0001]]; taken by a person. It no longer blocks the field's renderer, only the orbit's edge overlay.
4. **[[TASK-0003]] — the orbit renders.** Inside the Glass field's renderer ([[FEAT-0009-The-Field-Where-Depth-Carries-Priority]], TASK-0031), as the arrangement where distance is connectedness: edges on the canvas overlay, fly and zoom and land. The frame rate at 1537 nodes and 16148 edges is the phase's third number.
5. **[[TASK-0004]] — landing.** A node is lifted onto the desk the way [[FEAT-0010-Lifting-A-Note]] lifts one, and opens in Deck's reader, so the field never becomes a second, worse document pane.

## Sequencing note

**Changed 2026-09-07.** This feature was the gate in front of Glass: the field was to be measured here before [[DES-0002]]'s arrangements were built. Edwin reversed that order the same day, and the field is built first. The orbit is now an arrangement of that field, so step 4 waits on the field's renderer and not the other way round. The measurements stay, as exit criteria of [[PHASE-0002-Glass]].

**2 before 4, and 3 before 4.** A renderer written against an unstable layout has to be rewritten when the layout is fixed, and an edge overlay drawn before the treatment is chosen is drawn twice. Neither is expensive; both are avoidable.

## Dependencies

- **Outside this repository:** the graph endpoint in the cockpit's sidecar (step 1). Nothing else in the phase waits on it. [[FEAT-0010-Lifting-A-Note]]'s neighbourhood reads `/api/cockpit/context` for the held note until the endpoint exists, and switches to the graph payload when it does.
- **Inside the phase:** step 4 depends on FEAT-0009's TASK-0031 (the field renders and turns); step 5 depends on FEAT-0010's TASK-0035 (a note is lifted and put back).
- **This feature's own layout serves only the orbit.** The field's other arrangements are dealt from the band function and the slot geometry (FEAT-0009's TASK-0029 and TASK-0030), not from step 2's stored positions.

## Verification

The view's claim is *structural*, so its check is structural: [[TST-0025-A-Planted-Orphan-And-A-Single-Edge-Cluster-Are-Visible]] plants one orphan note and one cluster joined by a single edge in a scratch copy of this repository, and both must be visible in the orbit without the reader being told where to look. The band assertion is an automated check added with TASK-0001.

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `docs/features/orbit-view/plan/PLAN.md` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).
