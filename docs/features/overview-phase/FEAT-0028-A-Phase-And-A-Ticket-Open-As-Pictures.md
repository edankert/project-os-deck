---
type: "[[feature]]"
id: FEAT-0028
aliases: ["FEAT-0028"]
title: "A phase and a ticket open as pictures: the phase's web, exit-criteria ring and depth field; a ticket's lifecycle track and neighbourhood; re-phasing as moving particles"
status: review
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "From the wheel a person opens a phase and sees what it still owes and what kind of work it is, opens a ticket and sees where it is in its life and what it is joined to, and sees where the tickets with no phase would go, all without reading a list."
requirements: []
tasks: ["[[TASK-0127]]", "[[TASK-0128]]", "[[TASK-0129]]"]
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

- `bash tools/scripts/run-desktop-tests.sh overview-screens`, 2026-10-14: 8 tests, 8 passed (TST-0090), every phase of both workspaces and a ticket of every kind and state.
- `cd desktop && npm test`, 2026-10-14: 737 tests, 737 passed, none skipped.
- The window run, TST-0093, 2026-10-14: S2, S3 and S4 opened in a real window on both workspaces.

## Where this stands

2026-10-14: built and at review. TASK-0127, TASK-0128 and TASK-0129 are done; TASK-0129's cockpit issue is cut from this run and written in the adoption table instead. Codex reviews it, as the agent that did not build it. Edwin's acceptance test is [[TST-0092-A-Phase-A-Ticket-And-Re-Phasing-Read-As-Pictures]], not yet run.

## Questions between the lanes

None yet. Write a question here, dated, and land it on `main`; the other agent answers under it.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
