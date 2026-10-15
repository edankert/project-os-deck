---
type: "[[feature]]"
id: FEAT-0029
aliases: ["FEAT-0029"]
title: "Designs, acceptance tests and tickets are accepted from a picture of their evidence: S5, S6 and S7, writing through the cockpit's sidecar"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-15
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "A person accepts a design from its plates, records an acceptance test result from a before-and-after picture, and accepts a feature from a gate that shows what is missing, each in Deck and each written through the cockpit's sidecar."
requirements: []
tasks: ["[[TASK-0120]]", "[[TASK-0121]]", "[[TASK-0122]]", "[[TASK-0123]]", "[[TASK-0143]]", "[[TASK-0149]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"
reviewed_by: ["model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-14
review_verdict: approve
review_round: 2
related: ["[[PHASE-0005-Overview]]", "[[DES-0004-The-Phase-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# Designs, acceptance tests and tickets are accepted from a picture of their evidence

## Goal

**A person gives the three project-os verdicts in Deck, each from a picture of the evidence.** These are S5, S6 and S7 in [[DES-0005-The-Overview-Is-Drawn-Not-Written]]: accept a design from its plates, run an acceptance test as beads on a ring with before-and-after images, and accept a feature at a gate of lamps. Every write leaves through Deck's main process and the cockpit's existing endpoint. Deck refuses an agent identity locally; missing sidecar guards are cockpit work, recorded under Sidecar limits.

Lane: `system:codex`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- S5 Design acceptance: plates, revision strip, review pins; Accept through `/api/notes/decide`, and Decline with a reason through the sidecar's advertised `/api/notes/transition` action.
- S6 Acceptance test: platform rings from `/api/cockpit/release-test`, check beads, before-and-after captures; results through `/api/notes/mark-check`, with a reason for every result but Pass.
- S7 Ticket acceptance: the five-lamp gate from `/api/notes/acceptance`, `/api/cockpit/acceptance`, `/api/cockpit/obligations`, current notes and Deck's index; Accept and Send back through `/api/notes/transition` only when `/api/notes/actions` offers them, or an opted-in acceptance stamp through `/api/notes/acceptance-run` that records acceptance without changing status.
- A gate component small enough for S3 to show (FEAT-0028).
- Rows in [[REFERENCE-COCKPIT-ADOPTION]] moved to adopted for exactly what these screens use, and a risk note if a payload Deck now depends on can change under it.

Out of scope:

- Any verdict written by an agent, by any route.
- Release preparation, sealing and marking released; those stay in the cockpit.

## Acceptance

- Edwin accepts a design in S5 and records a Pass and a Fail in S6; each verdict shows in the cockpit afterwards. In S7, Deck offers feature status changes only when the sidecar advertises them. For an opted-in feature with complete evidence, Edwin can record acceptance without changing status, and that acceptance stamp shows in the cockpit.
- Deck never sends a verdict as an agent: its shell requires a configured `user:` identity. When the sidecar refuses a person’s request, Deck shows the refusal in the sidecar’s own words.
- S7 enables Accept only when every nonempty lamp is known and complete, no evidence is missing, at least one known item exists, and the sidecar supports the action. Known empty lamps are hollow and say “nothing to check”; every unknown or incomplete lamp explains the gap on hover.
- Each screen passes FEAT-0026's screen checks; S6 is checked on your-trainer's REL-0017 and on Deck with no release.

## Verification

2026-10-14: `cd desktop && npm test` passed **745 tests**, with **0 failures and 0 skips**, including the TypeScript build. The three flow suites now contribute 39 checks: 16 scenes and payloads, 4 image-route checks, and 19 action and shell-write checks. A fresh independent implementation check passed all 35 scene/action tests and confirmed that targeted tests detect removal of three guards: advertised transitions, positive lamp totals and persisted stale-result deletion. This check leaves Claude’s formal round-two verdict untouched.

The tests exercise unavailable and withdrawn sidecar actions, nonzero reconciled counts, empty and unknown lamps, malformed payloads, scalar and list review provenance, saved progress across commits, workspace/release/platform/content separation, and persisted stale-result deletion. Identity and exact-refusal tests still pass. Every recorded S5–S7 scene passes the word, count, address and list checks; S5 uses 9 words and S7 uses 26 on each workspace. Every recorded S6 section passes with More expanded.

`cd desktop && npm run build && node scripts/overview-plates.mjs` regenerated all 14 plates without opening a window. The changed S5 and S7 SVG/JPEG plates were inspected. The S6 Your Trainer SVG changes only because saved check keys now include expected content; its JPEG is unchanged. The prototype page and plate manifest carry the current counts. No Electron or live acceptance verdict ran.

`bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` pass. Existing documentation warnings remain; no new warning is left by this task. Snapshot sync adds TASK-0143 to the feature and phase, derives its done status, and updates task counters and metrics. TST-0088, TST-0089 and TST-0100 remain Edwin's unrun acceptance checks. Claude owns the formal round-two verdict.

## Where this stands

**Back to `doing` on 2026-10-15, because Edwin ran the overview and asked for changes.** He liked much of it, and asked for the cockpit's ticket colours and status marks on every screen, tickets drawn as cockpit rows, more of a ticket on its own screen, and back and forward buttons. The agreed plan is DES-0005's revision of 2026-10-15. The move is from `review` back to `doing`, which STATUSES.md does not list as a typical transition; it is used because new work is added inside the feature, as FEAT-0005 and FEAT-0006 were reopened before. The review rounds below are for the build of 2026-10-14. The new tasks get their own review by the other model before the feature goes back to `review`.

New work: [[TASK-0149]] (Codex) turns S7's five lamps into labelled chips of cockpit marks, which S3 reuses, and moves S5 and S6 to the same marks and words. It waits on TASK-0144 and on Claude's mark module in TASK-0145. Edwin's open decisions on this feature's narrowed criteria are unchanged.

2026-10-14: **FEAT-0029 remains at review on `lane/codex`.** `a6fb6c7` repairs S7 action availability, empty and unknown lamps, review provenance, and the acceptance contract. `388d11e` preserves S6 progress across unrelated commits and persists stale-result deletion. `a7d450a` draws S5’s unselected plates as outlines and refreshes the S5/S7 plates, manifest and prototype. All 745 desktop tests pass with no skips.

Claude coordinates, reviews round two and merges. Edwin decides whether the narrower feature is acceptable and runs TST-0088, TST-0089 and TST-0100. The cockpit still owes person-only feature transitions and agent refusal on `decide` and `mark-check`. The requests are at the end of [[REFERENCE-COCKPIT-ADOPTION]], and RISK-0009 remains open. Nothing was pushed or merged by Codex.

S6 scopes saved progress by workspace, release, platform and check content, including expected results. An unrelated commit preserves it. A changed check or ledger result removes the stale result from both memory and storage. Historical releases remain read-only because `mark-check` writes to the working release.

S7 refreshes the evidence and advertised actions before writing. Missing command results remain unknown with a reason. A known empty lamp is hollow and neutral; readiness still needs at least one known item and no missing evidence. The opted-in stamp records acceptance without changing status. The shared `gateNodes` component keeps S3 consistent with S7.

## Preflight

The request is bounded to S5, S6 and S7, their existing sidecar reads and writes, image delivery and fixtures. The specified signatures, addresses, fixtures and checks make completion observable. No new requirement note is needed; PHASE-0005 and DES-0005 already state the acceptance criteria.

The impact check covered FEAT-0026’s model and scene contract, FEAT-0028’s small S3 gate, FEAT-0013 and ADR-0003’s shell write boundary, and FEAT-0024 with REQ-0006’s evidence rules. The existing Glass evidence panel remains read-only. Missing evidence in S7 stays unknown. The explicit request for `ov-off` controls on S5 when `canWrite` is false determines their appearance in this flow; it never grants the served host a write capability. The actor remains a visible store setting, not a hard-coded person.

PHASE-0005 expressly adopts these three Parity flows early. No future-phase dependency blocks Deck’s implementation. The external payload and guard risk is [[RISK-0009-Acceptance-Flows-Depend-On-Changing-Sidecar-Payloads-And-Guards]].

## Sidecar limits

The cockpit source inspected on 2026-10-14 at `ff08a0c` has no feature entry in `HUMAN_TRANSITIONS` in `src/project_os_cockpit/note_writes.py`. S7 reads `/api/notes/actions?id=<FEAT>` and leaves unsupported Accept and Send back controls unavailable. Their hover says the cockpit does not yet move a feature out of review. An opted-in acceptance run records acceptance without changing status; S7 says that on screen.

Deck's `requirePerson` refuses any identity outside `user:` before sending a verdict. The cockpit's `decide` and `mark-check` paths do not enforce that rule. Its acceptance-run rejects a plain `agent:` witness, although a witness naming an authorized charter has a separate delegation path. That is not a universal sidecar guard. Requests for person-only feature transitions and guards on `decide` and `mark-check` are recorded at the end of [[REFERENCE-COCKPIT-ADOPTION]]. RISK-0009 remains open.

### Acceptance narrowed for round one

Both changes below narrow this feature because of the cockpit. Edwin decides whether that narrower feature is acceptable. PHASE-0005's broader exit criteria are not claimed as satisfied.

- The first criterion originally said: “Edwin accepts a design in S5, records a Pass and a Fail in S6, and accepts a feature in S7; each verdict shows in the cockpit afterwards.” S7 now promises only advertised transitions and the opted-in acceptance stamp, since the cockpit cannot move a feature out of review.
- The second criterion originally said: “The same three verbs from an agent session are refused by the sidecar, and Deck shows the refusal.” It now promises Deck's local identity refusal and the unchanged display of a sidecar refusal. The cockpit does not enforce agent refusal on `decide` or `mark-check`.

### Lamp evidence and empty lamps

Every nonempty lamp must be known and complete, and no lamp may have missing evidence. A known zero-item lamp is neutral: hollow, labelled “nothing to check”, and unable to make the gate ready by itself. Accept requires at least one known item across the five lamps. Empty requirement and task lists are known empty. Missing automated or acceptance records remain unknown because they do not establish a complete empty inventory. Review provenance accepts a list or a string containing reviewer identities; one person or two model reviewers must accompany an approved verdict, date and round.

Command results remain unknown. `tools/scripts/run-tests.py` prints outcomes and returns an exit code without saving a result file. `tools/scripts/hooks/pre-push` only invokes it. The CI workflows record job outcomes and logs but publish no per-test result artifact through Deck's reads. A note's status or prose about an old run cannot certify a current command result. Every unknown lamp carries a non-empty missing list; the Automated hover explains the absent command result.

### Acceptance-run totals

The cockpit's acceptance runner increments `skipped` after reconciling a criterion with a reason (`desktop/src/renderer/renderer.ts`, the `kind === 'skip'` branch). `stamp_acceptance_run` records that count as “skipped” and does not treat it as passed. S7 summarizes existing criteria: ticked criteria are `passed`, reconciled criteria are `skipped`, and `failed` is zero only when no open criteria remain. This is a summary of recorded evidence, not a claim that S7 ran the checks again. The request is tested with nonzero reconciled totals. The opted-in stamp changes acceptance fields, never lifecycle status.

## Fixture availability

Your Trainer has no feature at review in the current tree or its existing overview fixture. The implementation lead checked all 135 feature notes on 2026-10-14: 72 done, 38 backlog, 11 doing, 9 superseded, 2 deferred, 2 planned and 1 cancelled. Its accept fixture therefore uses a real doing feature with its actual status. Deck’s fixture uses FEAT-0024 at review as requested. This is a source limitation, not a fabricated review state.

## Questions between the lanes

2026-10-14, Codex to the drawing lane: will you place `gateNodes(gateFromModel(model, featureId), x, y, scale)` under S3's feature track and connect the S5–S7 entry controls? The exports are in `desktop/src/shared/overview-flows.ts`. The registered addresses are `?flow=design&note=DES-…`, `?flow=test-run&note=REL-…&step=android.3` (the release is optional), and `?flow=accept&note=FEAT-…`. Regenerate DES-0005's S5–S7 plates from the six fixtures after merging. Your Trainer's fixture preserves FEAT-0130's actual `doing` status because no feature at review exists there.

Claude’s round-two packet can be regenerated with `python3 tools/scripts/review-packet.py FEAT-0029 --round 2 --since 83ca14c --out build/review-packet-FEAT-0029-r2.md`. This run leaves the feature at review and preserves Claude’s round-one verdict.

2026-10-15, written at planning for both lanes: **the gate's chip is written once, in this feature, and S3 uses it.** [[TASK-0149]] replaces `gateNodes` with five labelled chips ("Requirements 0 / 8" and a row of cockpit marks). Claude's [[TASK-0148]] places the same chips on S3 in place of the small lamps. The marks inside a chip come from Claude's shared module in [[TASK-0145]], so TASK-0149 starts after it.

## Review

### Round one

2026-10-14 repair: `a6fb6c7` fixes findings 1–5 and verifies finding 7’s skipped meaning; `388d11e` fixes finding 6’s saved-step keys and persisted deletion; `a7d450a` fixes the S5 fan and commits the regenerated S5/S7 plates. All 745 desktop tests pass with zero skips. FEAT-0029 stays at review; Claude owns round two and Edwin decides the narrowed scope.

2026-10-14: two Claude reviewers, each in a clean context, reviewed commits `e2d4e76..ad83201` as they stand on `main` after the repairs `26bdcbe..d50a79c`. Claude reviewed it because Codex built it. Both found the code and its three node suites sound: every guard they removed was caught by a test. Both requested changes:

1. **S7 cannot move a feature out of review.** The cockpit's sidecar lets a person transition requirements, decisions, designs and issues, and has no entry for features (`HUMAN_TRANSITIONS` in the cockpit's `note_writes.py`). Accept, by transition to `done`, and Send back, to `doing`, are refused live, yet both are drawn as enabled. The opted-in `acceptance-run` stamps acceptance without changing status.
2. **The sidecar does not refuse an agent on `decide` or `mark-check`.** Only `acceptance-run` refuses an `agent:` witness. Deck refuses any identity that is not `user:` before sending, but that is Deck refusing, not the sidecar, so the criterion is not met as written.
3. **S7's Automated lamp stays unknown for any feature with a `command:` test,** because the sidecar does not expose command results, so Accept is almost never offered. An unknown lamp can also have an empty "missing" list, so its hover says only "unknown".
4. **Empty lamps count as lit.** A feature with no requirements shows 0 of 0 and counts as met, and so does one with no tasks.
5. **The Reviews lamp** counts entries in `reviewed_by`, so two reviews recorded as one string can never light it.
6. **Saved S6 step results** are keyed on the model's `head`, so they are lost on every commit; a stale result dropped in memory is not dropped from storage.
7. **`acceptance-run` sends reconciled criteria as `skipped`**; whether the cockpit reads them that way was not checked.

Claude adds one from the plates: **S5's fanned plates** are drawn nearly as opaque as the selected one and muddle it; behind a busy plate they should be outlines or much dimmer.

### Round two

2026-10-14: two Claude reviewers, round two, on the fixes `a6fb6c7..4a5baa0`. Both found all eight findings fixed, each with a guard broken and a named test failing: S7 offers Accept and Send back only when the sidecar lists them, an unknown lamp always says why, an empty lamp is hollow and supplies no evidence, the Reviews lamp reads strings and lists, saved S6 results survive commits, `skipped` matches the cockpit's meaning, and S5's other plates are outlines. Both found the two criteria narrowed because of the cockpit stated honestly. Both approved. Whether the narrowed feature is acceptable is Edwin's decision.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
- Integration repair: [[CHG-20261014-Give-every-flow-count-its-own-mark]].
