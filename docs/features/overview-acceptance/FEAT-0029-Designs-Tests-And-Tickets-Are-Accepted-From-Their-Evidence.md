---
type: "[[feature]]"
id: FEAT-0029
aliases: ["FEAT-0029"]
title: "Designs, acceptance tests and tickets are accepted from a picture of their evidence: S5, S6 and S7, writing through the cockpit's sidecar"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "A person accepts a design from its plates, records an acceptance test result from a before-and-after picture, and accepts a feature from a gate that shows what is missing, each in Deck and each written through the cockpit's sidecar."
requirements: []
tasks: ["[[TASK-0120]]", "[[TASK-0121]]", "[[TASK-0122]]", "[[TASK-0123]]"]
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

# Designs, acceptance tests and tickets are accepted from a picture of their evidence

## Goal

**A person gives the three project-os verdicts in Deck, each from a picture of the evidence.** These are S5, S6 and S7 in [[DES-0005-The-Overview-Is-Drawn-Not-Written]]: accept a design from its plates, run an acceptance test as beads on a ring with before-and-after images, and accept a feature at a gate of lamps. Every write goes through the cockpit's sidecar and its guards; Deck adds no write path, and an agent's verdict is refused.

Lane: `system:codex`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- S5 Design acceptance: plates, revision strip, review pins; Accept and Decline through `/api/notes/decide`.
- S6 Acceptance test: platform rings from `/api/cockpit/release-test`, check beads, before-and-after captures; results through `/api/notes/mark-check`, with a reason for every result but Pass.
- S7 Ticket acceptance: the five-lamp gate from `/api/cockpit/acceptance`, `/api/cockpit/obligations` and Deck's index; Accept and Send back through `/api/notes/transition` and `/api/notes/acceptance-run`.
- A gate component small enough for S3 to show (FEAT-0028).
- Rows in [[REFERENCE-COCKPIT-ADOPTION]] moved to adopted for exactly what these screens use, and a risk note if a payload Deck now depends on can change under it.

Out of scope:

- Any verdict written by an agent, by any route.
- Release preparation, sealing and marking released; those stay in the cockpit.

## Acceptance

- Edwin accepts a design in S5, records a Pass and a Fail in S6, and accepts a feature in S7; each verdict shows in the cockpit afterwards.
- The same three verbs from an agent session are refused by the sidecar, and Deck shows the refusal.
- S7 offers Accept only when every lamp is lit, and each unlit lamp names what is missing on hover.
- Each screen passes FEAT-0026's screen checks; S6 is checked on your-trainer's REL-0017 and on Deck with no release.

## Verification

The executable checks are TST-0085 (scenes and recorded payloads), TST-0086 (image route) and TST-0087 (flow actions and shell writes). TST-0088, TST-0089 and TST-0100 are Edwin’s acceptance checks for S5, S6 and S7. No window opens in this run. No tests have run yet; commands, date and counts are recorded here at close-out.

## Where this stands

2026-10-14: the implementation is authorized on `lane/codex` after FEAT-0026 and the drawing lane’s S1 to S4 were merged. TASK-0120 is doing; TASK-0121 to TASK-0123 are allocated. The task and test notes exist before code. The user’s instruction for this run permits building before Edwin accepts DES-0005; it does not record his verdict. Claude merges and reviews the result. Edwin runs the three acceptance checks. The feature stops at review.

## Preflight

The request is bounded to S5, S6 and S7, their existing sidecar reads and writes, image delivery and fixtures. The specified signatures, addresses, fixtures and checks make completion observable. No new requirement note is needed; PHASE-0005 and DES-0005 already state the acceptance criteria.

The impact check covered FEAT-0026’s model and scene contract, FEAT-0028’s small S3 gate, FEAT-0013 and ADR-0003’s shell write boundary, and FEAT-0024 with REQ-0006’s evidence rules. The existing Glass evidence panel remains read-only. Missing evidence in S7 stays unknown. The explicit request for `ov-off` controls on S5 when `canWrite` is false determines their appearance in this flow; it never grants the served host a write capability. The actor remains a visible store setting, not a hard-coded person.

PHASE-0005 expressly adopts these three Parity flows early. No future-phase dependency blocks Deck’s implementation. The external payload and guard risk is [[RISK-0009-Acceptance-Flows-Depend-On-Changing-Sidecar-Payloads-And-Guards]].

## Sidecar limits

The cockpit source inspected on 2026-10-14 does not offer a reason on `/api/notes/decide`; the existing design transition carries one. Its human transition table does not offer feature `review` to `done` or `doing`. An acceptance run stamps an opted-in feature and does not change status. The source does not establish a universal refusal of agent verdicts. Deck will send the supported request and show the sidecar’s refusal in its own words. Edwin’s acceptance checks must record these gaps as failures when encountered. No alternate write path or invented success closes them.

## Fixture availability

Your Trainer has no feature at review in the current tree or its existing overview fixture. The implementation lead checked all 135 feature notes on 2026-10-14: 72 done, 38 backlog, 11 doing, 9 superseded, 2 deferred, 2 planned and 1 cancelled. Its accept fixture therefore uses a real doing feature with its actual status. Deck’s fixture uses FEAT-0024 at review as requested. This is a source limitation, not a fabricated review state.

## Questions between the lanes

None yet. Write a question here, dated, and land it on `main`; the other agent answers under it.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
