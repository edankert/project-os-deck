---
type: "[[feature]]"
id: FEAT-0029
aliases: ["FEAT-0029"]
title: "Designs, acceptance tests and tickets are accepted from a picture of their evidence: S5, S6 and S7, writing through the cockpit's sidecar"
status: review
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

**A person gives the three project-os verdicts in Deck, each from a picture of the evidence.** These are S5, S6 and S7 in [[DES-0005-The-Overview-Is-Drawn-Not-Written]]: accept a design from its plates, run an acceptance test as beads on a ring with before-and-after images, and accept a feature at a gate of lamps. Every write leaves through Deck's main process and the cockpit's existing endpoint. Deck refuses an agent identity locally; the sidecar's own person-only guards still need Edwin's acceptance checks.

Lane: `system:codex`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- S5 Design acceptance: plates, revision strip, review pins; Accept through `/api/notes/decide`, and Decline with a reason through the sidecar's advertised `/api/notes/transition` action.
- S6 Acceptance test: platform rings from `/api/cockpit/release-test`, check beads, before-and-after captures; results through `/api/notes/mark-check`, with a reason for every result but Pass.
- S7 Ticket acceptance: the five-lamp gate from `/api/notes/acceptance`, `/api/cockpit/acceptance`, `/api/cockpit/obligations`, current notes and Deck's index; Accept and Send back through `/api/notes/transition` or an opted-in acceptance stamp through `/api/notes/acceptance-run`.
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

2026-10-14: `npm test` from `desktop/` passed **718 tests**, with **0 failures and 0 skips**. It includes the TypeScript build. The three new suites contribute 30 tests: 11 for scenes and recorded payloads (TST-0085), 4 for the image route (TST-0086), and 15 for flow actions and shell writes (TST-0087). Their focused command is `node --test desktop/tests/overview-flows.test.mjs desktop/tests/file-route.test.mjs desktop/tests/overview-flow-writes.test.mjs`, after the build.

The six flow fixtures pass `checkScene` on both workspaces. Every recorded platform section also passes with More expanded. The tests cover malformed or missing evidence, printed-step aggregation, stale local progress, identity sanitization, exact sidecar refusals, preload dispatch and the served host's refusal to write. The image route rejects traversal, symlinks that escape docs, unsupported types and write methods.

The image audit counted 25 copies, **1,604,537 bytes** in total, with a maximum width of **900 pixels**. SVG scenes were rasterized and inspected without opening a window. TST-0088, TST-0089 and TST-0100 are Edwin's active acceptance checks; none has been run by him or given a verdict here. Claude's independent review is pending. No Electron or smoke command ran.

`bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` passed on 2026-10-14. Documentation validation reports no errors; its existing acceptance and review warnings and the authorized DES-0005 gate warning remain. Snapshot synchronization derives the feature's review state and the four completed task states from their notes.

## Where this stands

2026-10-14: **FEAT-0029 is at review on `lane/codex`.** The shared scenes, mappers, six fixtures and bounded image copies are in `602e9bb`. The image route and sidecar read allowlist are in `9ad200d`. The three registered renderer flows and main-process write verbs are in `a50ffcb`. The implementation tasks are complete; Claude reviews and merges, and Edwin runs the three acceptance walks. Nothing was pushed or merged by Codex.

S6 keeps each printed step separate from a test note. It writes a note verdict only after all of that note's printed steps have results, using the cockpit's result ordering. Local progress is scoped by workspace, release, platform and check content, and expires when the ledger evidence changes. Historical releases remain read-only because `mark-check` writes to the working release.

S7 starts from `gateFromModel` and enriches it with current sidecar evidence. A model link or an automation-coverage badge cannot certify a result. Missing command results stay unknown, and a fresh note read prevents a stale task status from lighting the gate. The small `gateNodes` component is exported for the drawing lane's S3 integration.

The dated adoption rows cover only these screens' paths. RISK-0009 remains open because Deck cannot supply the sidecar's missing transitions or prove its agent guards. The user's instruction permits building before DES-0005 is accepted; it records no design verdict.

## Preflight

The request is bounded to S5, S6 and S7, their existing sidecar reads and writes, image delivery and fixtures. The specified signatures, addresses, fixtures and checks make completion observable. No new requirement note is needed; PHASE-0005 and DES-0005 already state the acceptance criteria.

The impact check covered FEAT-0026’s model and scene contract, FEAT-0028’s small S3 gate, FEAT-0013 and ADR-0003’s shell write boundary, and FEAT-0024 with REQ-0006’s evidence rules. The existing Glass evidence panel remains read-only. Missing evidence in S7 stays unknown. The explicit request for `ov-off` controls on S5 when `canWrite` is false determines their appearance in this flow; it never grants the served host a write capability. The actor remains a visible store setting, not a hard-coded person.

PHASE-0005 expressly adopts these three Parity flows early. No future-phase dependency blocks Deck’s implementation. The external payload and guard risk is [[RISK-0009-Acceptance-Flows-Depend-On-Changing-Sidecar-Payloads-And-Guards]].

## Sidecar limits

The cockpit source inspected on 2026-10-14 at `032a6f8` does not offer a reason on `/api/notes/decide`; the existing design transition carries one. Its human transition table does not offer feature `review` to `done` or `doing`. An acceptance run stamps an opted-in feature and does not change status. The source does not establish a universal refusal of agent verdicts. Deck sends the existing request and shows a refusal in the sidecar's own words. Edwin's acceptance checks must record these gaps as failures when encountered. No alternate write path or invented success closes them.

## Fixture availability

Your Trainer has no feature at review in the current tree or its existing overview fixture. The implementation lead checked all 135 feature notes on 2026-10-14: 72 done, 38 backlog, 11 doing, 9 superseded, 2 deferred, 2 planned and 1 cancelled. Its accept fixture therefore uses a real doing feature with its actual status. Deck’s fixture uses FEAT-0024 at review as requested. This is a source limitation, not a fabricated review state.

## Questions between the lanes

2026-10-14, Codex to the drawing lane: will you place `gateNodes(gateFromModel(model, featureId), x, y, scale)` under S3's feature track and connect the S5–S7 entry controls? The exports are in `desktop/src/shared/overview-flows.ts`. The registered addresses are `?flow=design&note=DES-…`, `?flow=test-run&note=REL-…&step=android.3` (the release is optional), and `?flow=accept&note=FEAT-…`. Regenerate DES-0005's S5–S7 plates from the six fixtures after merging. Your Trainer's fixture preserves FEAT-0130's actual `doing` status because no feature at review exists there.

The review packet can be regenerated with `mkdir -p build` followed by `python3 tools/scripts/review-packet.py FEAT-0029 --range e2d4e76..lane/codex --out build/review-packet-FEAT-0029-r1.md`. This run leaves the feature at review and does not write a review verdict.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
