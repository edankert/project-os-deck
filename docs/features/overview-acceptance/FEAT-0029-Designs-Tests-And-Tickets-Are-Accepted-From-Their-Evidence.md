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
tasks: ["[[TASK-0120]]", "[[TASK-0121]]", "[[TASK-0122]]", "[[TASK-0123]]", "[[TASK-0143]]", "[[TASK-0149]]", "[[TASK-0151]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"
reviewed_by: ["model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-15
review_verdict: changes-requested
review_round: 1
review_response: "TASK-0144 and TASK-0149 round one on f003195..f68d4ee: reviewer A approve; reviewer B changes-requested. TASK-0151 fixes all seven findings; Claude verifies the repairs. Earlier review rounds remain below."
related: ["[[PHASE-0005-Overview]]", "[[DES-0004-The-Phase-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# Designs, acceptance tests and tickets are accepted from a picture of their evidence

## Goal

**A person gives the three project-os verdicts in Deck, each from a picture of the evidence.** These are S5, S6 and S7 in [[DES-0005-The-Overview-Is-Drawn-Not-Written]]: accept a design from its plates, run an acceptance test as beads on a ring with before-and-after images, and accept a feature at a gate of labelled chips. Every write leaves through Deck's main process and the cockpit's existing endpoint. Deck refuses an agent identity locally; missing sidecar guards are cockpit work, recorded under Sidecar limits.

Lane: `system:codex`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- S5 Design acceptance: plates, revision strip, review pins; Accept through `/api/notes/decide`, and Decline with a reason through the sidecar's advertised `/api/notes/transition` action.
- S6 Acceptance test: platform rings from `/api/cockpit/release-test`, check beads, before-and-after captures; results through `/api/notes/mark-check`, with a reason for every result but Pass.
- S7 Ticket acceptance: the five-chip gate from `/api/notes/acceptance`, `/api/cockpit/acceptance`, `/api/cockpit/obligations`, current notes and Deck's index; Accept and Send back through `/api/notes/transition` only when `/api/notes/actions` offers them, or an opted-in acceptance stamp through `/api/notes/acceptance-run` that records acceptance without changing status.
- A gate component small enough for S3 to show (FEAT-0028).
- Rows in [[REFERENCE-COCKPIT-ADOPTION]] moved to adopted for exactly what these screens use, and a risk note if a payload Deck now depends on can change under it.

Out of scope:

- Any verdict written by an agent, by any route.
- Release preparation, sealing and marking released; those stay in the cockpit.

## Acceptance

- Edwin accepts a design in S5 and records a Pass and a Fail in S6; each verdict shows in the cockpit afterwards. In S7, Deck offers feature status changes only when the sidecar advertises them. For an opted-in feature with complete evidence, Edwin can record acceptance without changing status, and that acceptance stamp shows in the cockpit.
- Deck never sends a verdict as an agent: its shell requires a configured `user:` identity. When the sidecar refuses a person’s request, Deck shows the refusal in the sidecar’s own words.
- S7 enables Accept only when every nonempty chip is known and complete, no evidence is missing, at least one known item exists, and the sidecar supports the action. Known empty chips are hollow and say “nothing to check”; every unknown or incomplete chip explains the gap on hover.
- Each screen passes FEAT-0026's screen checks; S6 is checked on your-trainer's REL-0017 and on Deck with no release.

## Verification

2026-10-15: `cd desktop && npm test` passed **769 tests, with zero failures and zero skips**, including the TypeScript build. Flow suites contribute 46 tests: 21 scenes and payloads, four image-route checks, and 21 action and loader checks. The scene-check suite contributes 18 tests.

Both recorded acceptance fixtures reproduce from raw payloads with each item's completion and result. The recorded flow scenes pass the word, number, address and list checks. Eight deliberate regressions each failed a named test; after restoring built files, all 60 focused tests passed. The Review section records the mutations.

`bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` pass. No Electron window, new raster inspection or human verdict is claimed. Claude owns official plate regeneration and the window run; TST-0088, TST-0089 and TST-0100 remain Edwin's unrun acceptance checks.

## Where this stands

2026-10-15: **TASK-0151 fixes all seven findings from the round-one review of TASK-0144 and TASK-0149.** Reviewer A's verdict is `approve`; reviewer B's is `changes-requested`. Both are transcribed under Review. The full desktop suite passes 769 tests.

Known item squares show their own evidence completion in the item's type colour. Unknown chips show neutral hollow squares without attention dots. Evidence marks carry a unique `markId` and a label naming the source id, never `ticket`. The list twin has five evidence rows. Result glyphs preserve legacy cancellation and carry the cockpit's opacity.

The renderer exports `featureGate(input: ScreenInput, featureId = input.address.note): Promise<AcceptData>`. S7 uses it; Claude's S3 must await it and pass its result to `gateChips`. Sidecar failures return the neutral `gateFromModel` fallback with a reason. S3 can append both `nodes` and `rows` directly and remove its `delete node.ticket` loop and row filter.

The feature stays `doing` for Claude's verification and Edwin's acceptance. Claude owns S3 integration, official plates, the batched window run, merge and push. Codex commits on `lane/codex-r2` and does not push. The existing sidecar limits and narrowed acceptance criteria remain unresolved by a human verdict.

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

### Chip evidence and empty chips

Every nonempty chip must be known and complete, and no chip may have missing evidence. A known zero-item chip is neutral: hollow, labelled “nothing to check”, and unable to make the gate ready by itself. Accept requires at least one known item across the five chips. Empty requirement and task lists are known empty. Missing automated or acceptance records remain unknown because they do not establish a complete empty inventory. Review provenance accepts a list or a string containing reviewer identities; one person or two model reviewers must accompany an approved verdict, date and round.

Command results remain unknown. `tools/scripts/run-tests.py` prints outcomes and returns an exit code without saving a result file. `tools/scripts/hooks/pre-push` only invokes it. The CI workflows record job outcomes and logs but publish no per-test result artifact through Deck's reads. A note's status or prose about an old run cannot certify a current command result. Every unknown chip carries a non-empty missing list; the Automated hover explains the absent command result.

### Acceptance-run totals

The cockpit's acceptance runner increments `skipped` after reconciling a criterion with a reason (`desktop/src/renderer/renderer.ts`, the `kind === 'skip'` branch). `stamp_acceptance_run` records that count as “skipped” and does not treat it as passed. S7 summarizes existing criteria: ticked criteria are `passed`, reconciled criteria are `skipped`, and `failed` is zero only when no open criteria remain. This is a summary of recorded evidence, not a claim that S7 ran the checks again. The request is tested with nonzero reconciled totals. The opted-in stamp changes acceptance fields, never lifecycle status.

## Fixture availability

Your Trainer has no feature at review in the current tree or its existing overview fixture. The implementation lead checked all 135 feature notes on 2026-10-14: 72 done, 38 backlog, 11 doing, 9 superseded, 2 deferred, 2 planned and 1 cancelled. Its accept fixture therefore uses a real doing feature with its actual status. Deck’s fixture uses FEAT-0024 at review as requested. This is a source limitation, not a fabricated review state.

## Questions between the lanes

2026-10-15, TASK-0151 handoff to Claude: import `featureGate` from `desktop/src/renderer/overview-flows.ts`. Its signature is `featureGate(input: ScreenInput, featureId = input.address.note): Promise<AcceptData>`. Await it in S3's renderer, then pass the returned data into the pure ticket scene and `gateChips(data, x, y, width, { compact: true })`. It uses the same reads as S7 and returns `gateFromModel` if required evidence cannot be read. It does not change the input address or write anything.

Append both returned `nodes` and `rows`. Chip item marks never set `ticket`; they set `markId: gate-<feature>-<key>-item-<n>` and retain the source id in their label. The rows are only `gate-<key>` evidence rows. Remove S3's `delete node.ticket` workaround and its filter on gate rows. The old `gateNodes` wrapper was already removed in the merged drawing lane.

Both acceptance fixtures were remapped from their recorded raw payloads. Regenerate official plates after integrating S3. Claude verifies the fixes to the blocking round-one findings; the author's tests are not a new reviewer verdict.

## Review

### TASK-0144 and TASK-0149 — round one, 2026-10-15

Two Claude reviewers reviewed `f003195..f68d4ee`. Edwin supplied their findings and verdicts: **reviewer A: approve; reviewer B: changes-requested**. The combined verdict remains `changes-requested`; these are the author's fixes in [[TASK-0151]], awaiting Claude's verification, not a new approval. Earlier rounds below belong to earlier commit ranges.

| Finding | Resolution and evidence |
| --- | --- |
| 1. B-A and A-3: criterion squares contradicted the count. | `GateItem.complete` records each criterion, task, review or test's evidence. Known squares fill only for complete evidence, in the item's type colour. A shuffled REQ-0006 example at `implemented` draws three filled purple squares among eight. Reconciled criteria retain the existing completion rule and identify themselves in the label. The flow tests cover task statuses that contradict ticket fills, missing reviewers, non-pass results and stale passes. |
| 2. B-B: unknown chips retained needs-you dots. | Unknown items are neutral outlines without fill, type colour, lifecycle decoration or attention dots. Their labels retain identity and say “not reported”. Both sizes and both fixtures are tested. |
| 3. Gate items duplicated tickets in S3. | Item marks never set `ticket`. Each gets `gate-<feature>-<key>-item-<n>` as `markId`; its label names the source id. `gateChips` returns only five `gate-<key>` evidence rows, never item tickets. Existing S3 exactly-once checks pass. |
| 4. A-2: unknown results looked like Fail. | `resultMark` sets SVG opacity on both outline and glyph: 0.6 for unknown, 0.75 for the cancelled class (N/A, Excused and legacy Canceled), 1 for other results. Tests inspect attributes and serialized SVG. |
| 5. B observation 1: legacy canceled became Excused. | Legacy `canceled` and `-` now draw Canceled `[-]`, separately from Excused `[·]`. Exact raw aliases `x X / ~ - ! F ?` are tested through release and acceptance payloads. The current sidecar's `acceptance.normalise_mark` normalizes characters before serving acceptance items; `release_test_payload` reads canonical ledger results. Compatibility handling also preserves old payloads without accepting padded character typos. |
| 6. A-1: panel numbers were exempt without saying so. | The `overview-checks.ts` comment names both panel exemptions. A section's rows or folded strip represent its count. The new test executes HTML panel rendering and SVG panel rendering, requiring counts to equal rows and strip marks for both folded and open sections. |
| 7. S3 could not load S7's evidence. | The renderer exports `featureGate(input: ScreenInput, featureId = input.address.note): Promise<AcceptData>`. S7 uses it for scenes and action-time refreshes. A failed sidecar read returns `gateFromModel` with its reason and no write capability. Tests cover S3/S7 parity, explicit feature id, unchanged address, no writes and failures on the four required reads. |

Verification: `cd desktop && npm test` passes **769 tests, zero failures, zero skips**. Focused suites pass **60 tests**: overview-checks 18, overview-flows 21, overview-flow-writes 21. Eight deliberate regressions were caught: criterion completion forced true, unknown fill, unknown type colour, ticket identity on evidence, missing opacity, canceled mapped to excused, panel count plus one, and a loader returning only model data. Built files were restored and the 60 tests passed again. Both acceptance fixtures reproduce from their recorded raw payloads. No Electron window or human verdict was used.

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
