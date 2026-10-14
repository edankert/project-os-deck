---
type: "[[feature]]"
id: FEAT-0026
aliases: ["FEAT-0026"]
title: "One list of tickets, each with a type, a state and a place: the overview model every screen reads, and the checks every screen is held to"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "Every overview screen reads one model of the workspace's tickets, so no two screens can disagree, and every screen is checked automatically against the look's rules on two real workspaces."
requirements: []
tasks: []
release: ""
acceptance_exception: ""
acceptance: ""
design: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[PHASE-0005-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[DES-0004-The-Phase-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# One list of tickets, each with a type, a state and a place

## Goal

**Every overview screen reads one list of tickets, computed once by DES-0004's rules, so no two screens can disagree about a count.** This feature builds that list, the overview model, from Deck's own index, and the automated checks that hold every screen to the look in [[PHASE-0005-Overview]]. It is the seam between the two lanes; its shape is fixed in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

Lane: `system:codex`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- Two fixtures first, in the brief's shape: `desktop/test/fixtures/overview/deck.json` and `desktop/test/fixtures/overview/your-trainer.json`, converted from DES-0004's prototype data. Pushed before anything else so the drawing lane can start.
- The model, computed from Deck's index: DES-0004's state table, its five placement rules, its three kinds of phase, the exit criteria read from each phase note, and the re-phase suggestions from links and from dates.
- A way to print the model for a workspace from the command line, so a person or an agent can compare it with what a screen draws.
- The screen checks, as a module any screen's test calls: visible words at rest (at most 60, ticket ids not counted), every number paired with a mark, an address that restores the screen, and a list twin holding the same ids.

Out of scope:

- Drawing any screen.
- Writing anything. The model is read only.

## Acceptance

- For Deck and your-trainer at the commits DES-0004's prototype names, the model's counts per phase, per type and per state equal DES-0004's counts, or each difference is explained ticket by ticket in this note.
- Every ticket in a workspace appears in the model exactly once, with exactly one place.
- The screen checks fail on a deliberately text-heavy test page and pass on a page that meets the rules.
- `npm test` runs the model's and the checks' suites in CI.

## Verification

Node suites only; no window opens. Each task names the suite it adds and the command that runs it (`bash tools/scripts/run-desktop-tests.sh <suite>`). Nothing has been run yet.

## Where this stands

2026-10-14: defined, not started. PHASE-0005 is `active` since 2026-10-14, so the lane can start. The owner creates the task notes from [the plan](plan/PLAN.md) before writing code, taking each id as the brief says.

## Questions between the lanes

None yet. Write a question here, dated, and land it on `main`; the other agent answers under it.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
