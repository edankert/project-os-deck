---
type: "[[feature]]"
id: FEAT-0027
aliases: ["FEAT-0027"]
title: "Deck opens on the wheel of phases: the circular overview, with finished phases on a shelf, the backlog in a tray and tickets with no phase in the core"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-15
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "A person opening Deck sees, in one picture, how far each unfinished phase has got and where the failed, owed-again and open tickets are, and reaches any phase from it in one click."
requirements: []
tasks: ["[[TASK-0125]]", "[[TASK-0126]]", "[[TASK-0131]]", "[[TASK-0145]]", "[[TASK-0146]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"
reviewed_by: ["model:gpt-6-astra", "model:gpt-6-astra"]
review_date: 2026-10-14
review_verdict: approve
review_round: 2
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

- `bash tools/scripts/run-desktop-tests.sh overview-screens`, 2026-10-14: 8 tests, 8 passed (TST-0090).
- `cd desktop && npm test`, 2026-10-14: 737 tests, 737 passed, none skipped.
- The window run, TST-0093, 2026-10-14: passed on Deck (374 tickets) and your-trainer (2,747) after `99eeeab`; its first run found two defects, fixed there.

## Where this stands

**Back to `doing` on 2026-10-15, because Edwin ran the overview and asked for changes.** He liked much of it, and asked for the cockpit's ticket colours and status marks on every screen, tickets drawn as cockpit rows, more of a ticket on its own screen, and back and forward buttons. The agreed plan is DES-0005's revision of 2026-10-15. The move is from `review` back to `doing`, which STATUSES.md does not list as a typical transition; it is used because new work is added inside the feature, as FEAT-0005 and FEAT-0006 were reopened before. The review rounds below are for the build of 2026-10-14. The new tasks get their own review by the other model before the feature goes back to `review`.

New work: [[TASK-0145]] (Claude) draws every ticket in the cockpit's type colour and state fill on every screen, and the wheel in two colourings for Edwin to choose; it waits on TASK-0144. [[TASK-0146]] (Claude) adds back and forward, and can start at once.

2026-10-14: built and at review. TASK-0125, TASK-0126 and TASK-0131 are done. Codex reviews it, as the agent that did not build it. Edwin's acceptance test is [[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]], not yet run.

## Review

### Round one

2026-10-14: two Codex reviewers (GPT-6 Astra), each in a clean worktree, reviewed the packet. Codex reviewed it because Claude built it. Both requested changes. Held: every ticket drawn once on both workspaces, the screen checks, every sector and disc reachable and opening its phase, the address, the list twin, reduced motion, and the served page read-only. Refuted:

1. Opening the wheel while the index is still being built cached the empty answer and failed twice with one request (one reviewer).
2. Owed-again tests in the backlog tray did not glow (one reviewer).
3. No wedge could take keyboard focus (both).
4. TST-0093 logged where Escape landed and whether the served page offered a write, without asserting either (both).

Fixed in `57c2e3d`: the wheel waits for the index and never keeps the empty answer; the tray glows; every ticket mark takes focus by the arrow keys from its sector, and Enter opens it; the window run asserts Escape and the served page and fails on a missing screen. TST-0090 now checks focus and glow on every ticket.

### Round two

2026-10-14: two Codex reviewers (GPT-6 Astra), round two. Both found all four findings fixed, each shown by breaking the fix and watching a test or probe fail: the wheel waits for an index still being built, the tray glows, every one of 361 and 2,747 tickets is reached and opened by the arrow keys and Enter, and the window run asserts Escape, the served page and every screen. Both approved.

## Questions between the lanes

None yet. Write a question here, dated, and land it on `main`; the other agent answers under it.

### Round one of the 2026-10-15 revision

2026-10-15: Codex (GPT-6 Astra) reviewed the drawing lane of the 2026-10-15 revision from a clean session, in a detached worktree at `b866405`. Codex reviewed it because Claude built it. Verdict: **changes-requested**, ten findings across TASK-0145 to TASK-0148 and TASK-0150. Claude fixed them in `1476b06` and, for the gate counts, after Codex's fixes merged.

- **An overtaken step back corrupted the history** (P1). Fixed: a step completes only when its own screen draws; any other draw is an ordinary visit. The decision is the pure `afterDraw` in `overview-trail.ts`, and a test reproduces the overtaken step.
- **An in-progress square looked like "complete, not proven" under reduced motion** (P2). Fixed: the square keeps the cockpit's static outline. A test checks every fill's shapes and the needs-you dot on each, which no test checked before.
- **The colouring was not in the address** (P2), as this feature's task requires. Fixed: `colour=state` is part of the address grammar; every overview address keeps its colouring. DES-0005 now says the switch reaches the wheel, its shelf and tray, and the re-phase cloud, and that lists keep the cockpit's marks.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
