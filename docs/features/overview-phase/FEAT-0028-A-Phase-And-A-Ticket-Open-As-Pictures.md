---
type: "[[feature]]"
id: FEAT-0028
aliases: ["FEAT-0028"]
title: "A phase and a ticket open as pictures: the phase's web, exit-criteria ring and depth field; a ticket's lifecycle track and neighbourhood; re-phasing as moving particles"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "From the wheel a person opens a phase and sees what it still owes and what kind of work it is, opens a ticket and sees where it is in its life and what it is joined to, and sees where the tickets with no phase would go, all without reading a list."
requirements: []
tasks: []
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[PHASE-0005-Overview]]", "[[DES-0004-The-Phase-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# A phase and a ticket open as pictures

## Goal

**A phase, a ticket and the unplaced tickets each open as a picture.** These are S2, S3 and S4 in [[DES-0005-The-Overview-Is-Drawn-Not-Written]]. They replace DES-0004's text-heavy phase page and its Glass field and desk plates.

Lane: `system:claude`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- S2 Phase: the web, the exit-criteria ring, open tickets as glyphs in depth bands.
- S3 Ticket: the lifecycle track, the radial neighbourhood, and for a feature the small gate from S7.
- S4 Re-phase: particles in the core and suggestion lines; accepting moves them on screen only.
- A request to the cockpit, filed as an issue there, for a sidecar action that sets `phase:`, so a later feature can make re-phasing write.

Out of scope:

- Writing `phase:` into any note.
- The full S7 gate (FEAT-0029).

## Acceptance

- Each of S2, S3 and S4 passes FEAT-0026's screen checks on both workspaces.
- The wedges of a sector become the glyphs of S2 in one animated transition, and back.
- A ticket's neighbours in S3 are the links in the model, and clicking one re-centres on it.
- Edwin's acceptance tests for the three screens pass.

## Verification

Node suites for layout and counts; window-opening runs batched once with Edwin's permission; one acceptance test per screen. Nothing has been run yet.

## Where this stands

2026-10-14: defined, not started. PHASE-0005 is `active` since 2026-10-14, so the lane can start. The owner creates the task notes from [the plan](plan/PLAN.md) before writing code, taking each id as the brief says.

## Questions between the lanes

None yet. Write a question here, dated, and land it on `main`; the other agent answers under it.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
