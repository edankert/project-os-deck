---
type: "[[feature]]"
id: FEAT-0025
aliases: ["FEAT-0025"]
title: "Every overview screen is drawn before it is built: DES-0005's prototype and one plate per screen, from real tickets"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "Edwin can look at all seven overview screens, drawn from Deck's and your-trainer's real tickets, and accept or decline the design before any of it is built."
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

# Every overview screen is drawn before it is built

## Goal

**Edwin sees every overview screen as a picture before any of it is built.** This feature turns [[DES-0005-The-Overview-Is-Drawn-Not-Written]] from a brief into a design: an interactive prototype and one plate per screen, S1 to S7, drawn from real tickets on both workspaces. It ends when DES-0005 is `proposed` and Edwin has a verdict to give.

Lane: `system:claude`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- The prototype `docs/designs/DES-0005-the-overview.html`: no network, scripts allowed, both workspaces switchable, every screen reachable from the wheel the way it will be in Deck.
- Deck's tickets re-measured on the day the prototype is made; your-trainer's taken from DES-0004's prototype and, for S6, from your-trainer's release test (`python3 tools/scripts/release-test.py --release REL-0017 --platform android --json`, run in that repository).
- For S5 and S6, real images: DES-0004's plates for a design, and one before-and-after pair from your-trainer's acceptance gallery, reduced in size and copied into `__attachments__/`.
- One plate per screen per workspace in `docs/designs/__attachments__/`, captioned in DES-0005, with its word count at rest.
- A proposed answer to each of DES-0004's four open questions.

Out of scope:

- Application code. Nothing in `desktop/` changes in this feature.

## Acceptance

- Every screen S1 to S7 has a plate for Deck and a plate for your-trainer, and each plate's caption gives its measured word count at rest, at most 60.
- No plate shows a number without a mark that draws the same count.
- The prototype opens offline and every screen in it is reached from the wheel in at most two clicks.
- DES-0005 is `proposed`, with a Revisions line saying what Edwin is asked to decide.

## Verification

This feature is a design, so it has no automated test. Its verification is Edwin's verdict on DES-0005, recorded through the cockpit's Accept or Decline on the note. Nothing has been run yet.

## Where this stands

2026-10-14: defined, not started. PHASE-0005 is `active` since 2026-10-14, so the lane can start. The owner creates the task notes from [the plan](plan/PLAN.md) before writing code, taking each id as the brief says.

## Questions between the lanes

None yet. Write a question here, dated, and land it on `main`; the other agent answers under it.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
