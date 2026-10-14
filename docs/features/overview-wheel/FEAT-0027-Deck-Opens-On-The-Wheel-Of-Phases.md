---
type: "[[feature]]"
id: FEAT-0027
aliases: ["FEAT-0027"]
title: "Deck opens on the wheel of phases: the circular overview, with finished phases on a shelf, the backlog in a tray and tickets with no phase in the core"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "A person opening Deck sees, in one picture, how far each unfinished phase has got and where the failed, owed-again and open tickets are, and reaches any phase from it in one click."
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

# Deck opens on the wheel of phases

## Goal

**Deck opens on the wheel: one sector per phase still to finish, one wedge per ticket, coloured by state.** This is S1 in [[DES-0005-The-Overview-Is-Drawn-Not-Written]], the circular view from [[DES-0004-The-Phase-Overview]]. Finished phases sit on a shelf below it, the backlog in a tray, and tickets with no phase in the core. It becomes the first view in the built-in project-os view provider.

Lane: `system:claude`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- S1 as a Deck view with its own address, drawn from the overview model (the fixtures until FEAT-0026 lands).
- The dark Glass look of DES-0005: glow for what needs a person, depth on hover, animated transitions that honour reduced motion.
- Hover callouts, keyboard focus on every sector and wedge, and the list twin.
- Clicking a sector hands over to S2 (FEAT-0028); until S2 exists it opens the phase note.
- The served host shows the wheel read-only.

Out of scope:

- S2 to S7.
- Changing the overview model; a change is asked for in FEAT-0026.

## Acceptance

- Deck opens on the wheel for Deck and for your-trainer, and every ticket in the model is drawn exactly once.
- The wheel passes FEAT-0026's screen checks on both workspaces.
- Every sector and every disc on the shelf is reachable by keyboard and opens its phase.
- Edwin's acceptance test for the wheel passes, including his judgement that it reads as a picture.

## Verification

Node suites for the geometry and the counts. Window-opening runs are batched once, after asking Edwin. One acceptance test at `docs/tests/acceptance/` for Edwin. Nothing has been run yet.

## Where this stands

2026-10-14: defined, not started. Waits on Edwin moving PHASE-0005 to `active`. The owner creates the task notes from [the plan](plan/PLAN.md) before writing code, taking each id as the brief says.

## Questions between the lanes

None yet. Write a question here, dated, and land it on `main`; the other agent answers under it.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
