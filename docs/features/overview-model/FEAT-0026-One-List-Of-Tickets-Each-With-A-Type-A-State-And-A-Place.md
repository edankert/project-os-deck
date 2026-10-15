---
type: "[[feature]]"
id: FEAT-0026
aliases: ["FEAT-0026"]
title: "One list of tickets, each with a type, a state and a place: the overview model every screen reads, and the checks every screen is held to"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-15
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "Every overview screen reads one model of the workspace's tickets, so no two screens can disagree, and every screen is checked automatically against the look's rules on two real workspaces."
requirements: []
tasks: ["[[TASK-0115-Build-One-Overview-From-The-Notes]]", "[[TASK-0116-Serve-And-Print-The-Overview]]", "[[TASK-0117-Build-Both-Overview-Fixtures-From-Real-Notes]]", "[[TASK-0118-Check-Every-Screen-As-Data]]", "[[TASK-0119-Report-When-Localhost-Tests-Cannot-Run]]", "[[TASK-0140-Fix-The-Overview-Review-Findings]]", "[[TASK-0141-Give-Every-Flow-Count-Its-Own-Mark]]", "[[TASK-0142-Keep-Test-Fixtures-Out-Of-The-Built-Module-Scan]]", "[[TASK-0144]]", "[[TASK-0153-Every-Ticket-That-Needs-You-Says-Why-And-What-To-Do]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: ""
reviewed_by: ["model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-15
review_verdict: changes-requested
review_round: 1
review_response: "TASK-0144 and TASK-0149 round one on f003195..f68d4ee: reviewer A approve; reviewer B changes-requested. TASK-0151 fixes all seven findings; Claude verifies the repairs. Earlier review rounds remain below."
related: ["[[PHASE-0005-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[DES-0004-The-Phase-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# One list of tickets, each with a type, a state and a place

## Goal

**Every overview screen reads one list of tickets, computed once by DES-0004's rules, so no two screens can disagree about a count.** This feature builds that list, the overview model, from Deck's own index, and the automated checks that hold every screen to the look in [[PHASE-0005-Overview]]. It is the seam between the two lanes; its shape is fixed in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

Lane: `system:codex`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- Replace Claude’s placeholder fixtures at `desktop/fixtures/overview/deck.json` and `desktop/fixtures/overview/your-trainer.json` with the builder’s real output. Record each source commit in `head` and uncommitted source-note changes in `dirty`.
- The model, computed from Deck's index: DES-0004's state table, its five placement rules, its three kinds of phase, the exit criteria read from each phase note, and the re-phase suggestions from links and from dates.
- Serve the model at `GET /deck/overview/<workspaceId>` on both hosts, cached by index revision and ledger content. Print it with `node desktop/scripts/overview.mjs <repo-root> [--json]`.
- The screen checks, as a module any screen's test calls: visible words at rest (at most 60, ticket ids not counted), every number paired with a mark, an address that restores the screen, and a list twin holding the same ids.

Out of scope:

- Drawing any screen.
- Writing anything. The model is read only.

## Acceptance

- Both fixtures contain the builder’s real output with their source commits. Compare them with DES-0004’s 333 Deck tickets and 2,646 your-trainer tickets, including 968 unplaced tickets. Explain kind differences ticket by ticket and later repository changes in aggregate.
- Every ticket in a workspace appears in the model exactly once, with exactly one place.
- The screen checks fail on a deliberately text-heavy test page and pass on a page that meets the rules.
- `npm test` builds and passes every node suite locally. The route, fixtures and scene checks each have their own suite.

## Verification

2026-10-15: `cd desktop && npm test` passed **769 tests, with zero failures and zero skips**. No Electron process or window started.

| Suite | Passed |
| --- | ---: |
| overview-model | 26 |
| overview-route | 13 |
| overview-fixtures | 3 |
| overview-checks | 18 |
| overview-screens | 14 |
| overview-flows | 21 |

Direct Python stats parity reports zero mismatches on 356 Deck items and 2,706 Your Trainer items. The port also covers the 28 and 41 model tickets outside stats. Changing doing to open fails with 100 and 519 named mismatches. Removing the panel row twin guard fails its regression. Tests preserve the separate DES-0004 state and placement rules.

Deck’s 384-ticket fixture was replayed from `git archive 96955cc8afecc56b8ac36d19e55e6b354d71cfd0`, with its recorded timestamp and snapshot threshold. Its serialized model matches exactly. Your Trainer’s 2,747-ticket fixture retains `dirty: true` and cannot be reconstructed from its commit alone.

`bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` pass. The validator reports existing advisory warnings. No CI or human acceptance verdict is claimed.

## Where this stands

**Back to `doing` on 2026-10-15 (second revision), because Edwin ran the overview again and approved six changes.** He prefers the re-phase screen to the wheel, asked for more depth with mouse turning and zoom, said the gate's five boxes look wrong, wants the feature's text beside Accept and Send back, and wants a ticket that needs him to say what to do. The approved plan is DES-0005's revision of 2026-10-15 (second). The move from `review` back to `doing` is the same one the first revision made, because new work is added inside the feature. The paragraphs below it describe the state before this revision.

New work: [[TASK-0153]] (Codex) makes the model say why a ticket needs you, what to do and where to do it, ported from the cockpit's `_needs_human`. It is a contract change to `Ticket`, proposed below under "Questions between the lanes" for both lanes to agree. It can start at once; TASK-0158 and TASK-0160 wait on it.

2026-10-15: **TASK-0151 fixes the round-one review findings on TASK-0144 and TASK-0149 on `lane/codex-r2`.** Panel count tests now cover both HTML rows and SVG strips. Gate evidence no longer repeats ticket drawings. The full desktop suite passes 769 tests; the Review section records each finding, its fix and the supplied verdicts.

The feature stays `doing`. Claude verifies the repairs, connects S3 to `featureGate`, removes its ticket-stripping workaround and redraws the official plates. Edwin's acceptance remains pending. The model fixtures are unchanged; Your Trainer still records `dirty: true`. Codex commits locally without pushing or opening Electron.

2026-10-15, later: the revision is built, tested and reviewed across models in two rounds. Every task of the revision is done (TASK-0144 to TASK-0151). The node suites pass (777 tests) and the window run TST-0093 passed on both workspaces. The feature goes back to `review`: what is left is Edwin's acceptance tests and his decisions on DES-0005.

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

2026-10-14 fixes: `5ca1405` closes the five screen-check holes; `4abe421` fixes local heading links and guards parent lookup, with tests that catch broken parent, tie and phase-order rules; `306e7bf` reads and refreshes ledger results in the host and CLI, adds the agreed dirty field and removes the localhost skip. `a1d8876` rebuilds both fixtures with dirty provenance, ledger states and the declared phase order. The Verification section records the final 704-test run.

2026-10-14: two Claude reviewers, each in a clean context, reviewed the packet for commits `22b19e4..b60e245`. Claude reviewed it because Codex built it. Both confirmed the counts against DES-0004 ticket by ticket, and both asked for changes:

1. Acceptance tests take their state from status alone, so none is ever owed again or failed. your-trainer's fixture holds 449 open acceptance tests and the shelf's violet mark never appears. The model must read the acceptance ledger.
2. A label with several numbers passes when one of them has a mark; a zero-padded count such as "012 open" is read as a phase label; the address check does not test that the address names the screen it is on; text marked `role: 'id'` escapes both the word count and the number check; and any prose token shaped like an id is dropped from the word count.
3. Two placement rules have no test that fails when they break: the parent rule's restriction to features (without it the builder crashes on your-trainer's history) and the member-list tie rule.
4. The route test still skips when listening is refused, which the note says was reverted elsewhere.
5. A lowercase local link with a heading is treated as cross-project and dropped.
6. The fixtures were captured from working trees with uncommitted notes, so they cannot be rebuilt from `head`.

Claude added one: the wheel's sectors are in id order, not in the order the phase notes declare (Deck's Parity is order 3 and Vault order 4).

### Round two

2026-10-14: two Claude reviewers, round two, on the fix commits `cb73801..63ad32f`. Both found findings 1 to 5 and Claude's addition fixed, each confirmed by breaking the guard and watching a named test fail. Both found finding 6 fixed for Deck and not for your-trainer. One reviewer requested changes on that point only; the other approved and left it to the author.

**Finding 6 stays open, and why.** your-trainer's working tree holds another session's uncommitted notes and its Android ledger. This run must not commit there, so the fixture cannot come from a clean commit today. The fixture says so with `dirty: true`. Recapturing it after that session commits closes the finding. Edwin decides whether to wait for that.

A reviewer also noted that a text with role `name` skips the count check, so a bare count marked as a name would pass. Codex closes that with the ratio fix that follows FEAT-0029's merge.

### Count integration review (TASK-0141 and TASK-0142)

Two fresh-context independent-reviewer agents reviewed `40645b2..0eeddf7` on 2026-10-14. Both inherit the session model; this is a bounded review of these repairs and does not replace Claude's feature review. Their combined round-one verdict was changes-requested:

| Claim | Verdict | Evidence |
| --- | --- | --- |
| S6 and S7 pair each ratio count with a separate mark, including zero. | holds | Both reviewers tested zero, partial and complete ratios. Removing S6 zero marks failed both workspace flow tests. |
| Recorded scenes remain within 60 words. | holds | Both reviewers measured maxima of 25 words for Deck and 49 for Your Trainer. |
| Numeric names are refused while real names retain digits. | refuted | Reviewer B showed `1 k` and `0x10` passing with and without marks, at rest and off rest. The existing regression caught removal of the guard but omitted those forms. |
| The module scan includes application outputs and excludes temporary repositories. | holds | Both reviewers checked the scan boundary; reviewer A's forbidden-write sentinel in root preload.js failed the write-channel check. |
| The scanner tests catch removal of its temporary-directory exclusion. | refuted | Reviewer A restored unrestricted recursion and all 26 write-channel tests passed. Reviewer B reproduced the gap on all three scan callers. |

The follow-up expands numeric-name coverage to spaced suffixes and hexadecimal, octal and binary literals. A deterministic scan regression includes a temporary JavaScript fixture and requires the root preload and representative main, shared and web modules. Round two approved both fixes in `b5f65df`. The reviewer reran all 15 scene-check tests and four targeted scan tests. Removing spaced-suffix handling failed on `1 k`; removing radix handling failed on `0x10`; unrestricted recursion failed on the temporary fixture. The full suite passes 737 tests, with no failures or skips. This approval covers only the integration repairs; Claude's full feature review remains pending.

## Model and route

`desktop/src/shared/overview-model.ts` exports `buildOverview(records, options)`. The caller supplies the workspace name, commit, generation time and `readBody(relPath)`. The builder reads no filesystem or clock and changes no input record. It uses the existing graph link parser and resolver for frontmatter and body links. Cross-project links never become local links.

Placement follows DES-0004 in order. Member-list ties use phase order. Open phases, the shelf and the backlog all sort by the phase note’s numeric `order`, using its numeric id when no order is declared, then by id for ties. Deck’s Parity (order 3) precedes Vault (order 4). A phase id ending in 999 is backlog by convention; `kind: backlog` explicitly marks any other id as backlog. Finished status takes precedence and puts the phase on the shelf. Parent links are followed only to features through `parent`, `implements` or `covers`. A missing phase target falls through to later rules. Cycles cannot hang the builder. Suggestions use a unique highest link count, then a unique inclusive date range. They do not move tickets, and project-wide tickets receive no suggestion. Each phase's tickets sort by kind, then `STATE_ORDER`, then id.

Acceptance tests read `docs/releases/ledgers/*.json` through `overview-ledger.ts`. The host and CLI supply the resolved results through `acceptanceResults`. Each platform with a ledger participates, including an empty working ledger. A failure wins over a withdrawal. Every applicable platform must pass or be excused before the ticket closes; `na` excludes that platform and `partial` alone does not satisfy DES-0004's pass rule. A missing result stays open. Retired tests remain dropped.

The reader follows `release-test.py` and the cockpit's `ledger.resolve`: sealed ledgers in seal-date order, then working ledgers, with entries ordered by date and file order for ties. It accepts the historical `mark` key. A sealed excuse expires without erasing a surviving pass. An invalidation clears the verdict and marks the test owed again until a retest or current excuse settles it. Invalid ledgers fail visibly. Automated `active` and `passing` statuses still approximate closed; `ciGreen: false` keeps them open. These states do not certify CI or human acceptance.

`GET /deck/overview/<workspaceId>` returns the model at the top level, with `workspaceId`, `revision` and `building: false`. Before the first index build, it returns only those three fields with `building: true`. An unknown workspace returns 404. The host refuses writes with 405. Desktop and served pages use this same route. The main process caches the model by workspace, index revision and a digest of ledger filenames and contents and clears it when the workspace is removed. A body-only edit raises the existing index revision and refreshes exit criteria. A ledger edit, addition or removal refreshes results even when the note revision stays unchanged.

After `cd desktop && npm run build`, run `node desktop/scripts/overview.mjs <repo-root> [--json]` from the repository root. It prints per-phase counts or the same model as JSON. It reads the repository and starts no window. The contract also carries `type`, `fill` and `needsYou` on every ticket, agreed below. `overview-status.ts` ports the cockpit rules, using the snapshot staleness threshold and caller-supplied verification date. The host and CLI supply those inputs without a sidecar. The service cache refreshes when either input changes.

## Screen checks

`desktop/src/shared/overview-checks.ts` returns the four results `words`, `numbers`, `address` and `twin`. The exact count rule is documented at the top of that module. A name consisting only of numeric tokens fails, even with a mark reference or off rest. Names containing digits, such as Schwinn 800IC and Model 3, remain valid. Each count needs its own text and `markRef`, resolving to one mark with the same nonnegative integer count. Split ratios and multi-count labels into separate texts. Explicit phase labels, real ids, dates, times and version strings are excluded from inferred counts. A padded number in a label still counts. A `number` role requires a mark even on hover. An `id` role accepts only ids or bare padded phase numbers; prose fails and still counts toward the word limit. Word counting excludes only complete REQ, FEAT, TASK, TST, ISS, ADR, DES, RISK, PHASE, CHG and REL ids followed by a number.

Use `formatAddress(addressFor(...))` to make scene addresses canonical. Its query order puts `note` before `page` or `flow`. The seven overview page and flow names are registered. An address must name the scene it restores, not merely round-trip. Dotted test steps such as `android.3` now round-trip. Other malformed steps remain refused.

Panel row and note text is exempt from words at rest and inferred-number checks. Each section count is drawn by its rows or folded strip; the HTML and SVG rendering test checks their agreement. Every ticket in a panel’s rows, including a folded section, must occur in the list twin. The list twin includes ordinary ticket IDs and the four legacy acceptance-document IDs described below. Phase IDs and aggregate mark IDs are not ticket rows. Every mark action also needs a row with that action. The fixture suite checks all IDs from both corpora through a scene, including the legacy documents.

## Fixture comparison with DES-0004

The fixtures are real builder output captured on 2026-10-15. Deck's `head` is `96955cc8afecc56b8ac36d19e55e6b354d71cfd0`, with `dirty: false`. Your Trainer's is `c38475f8862520eca61d64383ac946163e1d5bd9`, with `dirty: true`. The flag covers Markdown notes, ledger files and `SNAPSHOT.yaml`, including staged and untracked changes. Build output does not set it. Your Trainer was read only, and Git's optional index writes were disabled.

| Workspace | DES-0004 tickets | Current tickets | No phase, excluding project-wide | Open / finished / backlog phases |
| --- | ---: | ---: | ---: | --- |
| Deck | 333 | 384 | 1 | 5 / 0 / 0 |
| your-trainer | 2,646 | 2,747 | 987 | 9 / 17 / 1 |

Deck's core contains 23 tickets: 22 project-wide and one unplaced. Your Trainer's core contains 1,028 tickets: 41 project-wide and 987 unplaced. The captured exit criteria contain 47 boxes for Deck and 144 for Your Trainer. PHASE-019 and PHASE-999 in Your Trainer have prose exit criteria.

| Acceptance tests | Closed | Failed | Owed again | Open | Retired (dropped) | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Deck | 4 | 0 | 2 | 20 | 1 | 27 |
| your-trainer | 1 | 1 | 180 | 267 | 221 | 670 |

DES-0004's **257 withdrawn passes counts platforms**, not distinct checks: 91 Android and 166 iOS at historical commit `0318ab0`. Those sets overlapped in 62 checks, so they covered 195 distinct checks. The current ledgers hold 102 Android and 170 iOS withdrawals, totalling 272, or 15 more. Android gained 13 withdrawals and cleared 2; iOS gained 4. The current sets overlap in 73 checks and cover 199 distinct checks. Nineteen are now retired, leaving **180 owed-again tickets**, including 95 on the shelf. One check failed and takes the failed state. Only one active check has a surviving pass or excuse on every applicable platform, so only one is closed.

The comparison also rebuilt both historical trees through `recordFrom` and `buildOverview`, reading Git blobs without checking out or writing either tree. The source commits are DES-0004's `ac3c039` for Deck and `0318ab0` for Your Trainer. This separates builder differences from later note edits.

**No shared ticket changes kind.** The historical Deck build returns exactly 333 tickets with the same placements. The historical Your Trainer build returns 2,650: the same 2,646 tickets and placements, plus these four notes typed `test`:

| ID | Path relative to Your Trainer's docs | Why it is included |
| --- | --- | --- |
| `ACCEPTANCE-CHECKLIST-2.1.1` | `archive/tests/ACCEPTANCE_CHECKLIST_v2.1.1.md` | A retired test document omitted by the prototype's ticket list. |
| `ACCEPTANCE-RUN-2.1.1` | `archive/tests/ACCEPTANCE_RUN_PLAN_v2.1.1.md` | A retired test document omitted by the prototype's ticket list. |
| `ACCEPTANCE-TESTS-V2-1-0` | `archive/tests/ACCEPTANCE_TESTS_v2.1.0.md` | A retired test document omitted by the prototype's ticket list. |
| `ACCEPTANCE-RUN-2.2.0` | `tests/ACCEPTANCE_RUN_PLAN_v2.2.0.md` | A retired test document omitted by the prototype's ticket list. |

Their kind is `test`, their state is `dropped`, and each has no phase. Keeping every typed test makes those four visible instead of discarding them for their older ID format.

Five Your Trainer requirements differ from the prototype's state at the historical commit. DES-0004 lists neither deferred nor cancelled for requirements, so the builder leaves them open:

| Ticket | Note status | Prototype state | Builder state |
| --- | --- | --- | --- |
| `REQ-0118` | deferred | dropped | open |
| `REQ-0121` | deferred | dropped | open |
| `REQ-0137` | cancelled | dropped | open |
| `REQ-0138` | cancelled | dropped | open |
| `REQ-0169` | cancelled | dropped | open |

The old fixtures used note status and showed 449 open acceptance tests in Your Trainer. Reading the ledger now separates those same active checks into 1 closed, 1 failed, 180 owed again and 267 open. Most Android passes have no iOS result; they stay open rather than claiming every platform passed. The older prototype's closed total therefore is not a target for the all-platform rule.

Repository growth after those historical commits accounts for the remaining ticket increases. No historical typed ticket disappeared:

| Kind | New Deck tickets | New Your Trainer tickets |
| --- | ---: | ---: |
| Requirements | 0 | 4 |
| Features | 5 | 4 |
| Tasks | 27 | 58 |
| Tests | 16 | 14 |
| Issues | 0 | 12 |
| Decisions and designs | 2 | 3 |
| Risks | 1 | 2 |
| Total new notes | 51 | 97 |

Thus Your Trainer's total is 2,646 + 4 previously omitted test documents + 97 new notes = 2,747. Its unplaced count is 968 + 4 legacy documents + 11 new unplaced tickets + 5 existing tickets that lost placement − 1 that gained placement = 987. Twenty-two existing tickets changed placement as the notes moved on, including the work moved out of finished PHASE-020. Deck's shared tickets keep their placements. Its fifth phase and this run's notes account for the larger total.

Suggestions are recomputed from the current links and dates. Deck has one suggestion from links. Your Trainer has 438 from links and 549 tickets without a suggestion. No current unplaced ticket has a unique qualifying date range. These are suggestions, not changes to `phase:`. DES-0004's older suggestion counts remain a historical measurement.

## Preflight

The request is bounded to FEAT-0026 and is testable by five node suites. No new requirement is needed beyond the phase’s stated checks. FEAT-0006’s address contract, FEAT-0008’s read-only host, FEAT-0011’s index revision and ADR-0001 remain intact. Their feature notes have no linked requirements. No phase dependency blocks this work; the model and checks need no design verdict.

The risk scan found no new external dependency, environment setting, storage layout, long-running process or credential exposure. The fixtures keep their existing paths. The route exposes derived data from the same index already served read-only.

## Questions between the lanes

2026-10-14: Claude agreed to one contract addition for the review fixes: `dirty?: boolean` beside `head` in `OverviewModel`. It records whether the source tree had uncommitted note changes at capture time. TASK-0140 implements the findings without changing the scene contract or FEAT-0029 files.

2026-10-15, proposed at planning for both lanes to agree before either codes against it: **two fields on `Ticket`** for [[TASK-0144]]. `fill: 'delivered' | 'dropped' | 'deferred' | 'doing' | 'unproven' | null` is how the cockpit fills the ticket's square (`_square_state`). `needsYou: boolean` is whether the cockpit puts its "needs you" dot on it (`_needs_human`). `state` stays as it is, because the wheel keeps a state colouring. Agreed by: Codex (agreed, 2026-10-15), Claude (2026-10-15, with two amendments). The amendments: `fill` writes the cockpit's "no state" as `'open'` rather than `null`, so every ticket has a word for its fill (`FILL_WORD`); and a third field, `type: NoteType`, carries the cockpit's type word (`requirement`, `feature`, `task`, `test`, `issue`, `adr`, `design`, `risk`). The colour comes from `type`, not `kind`, because `kind: 'dec'` holds both decisions and designs and the cockpit colours them differently (`--type-adr` and `--type-reference`). The contract is written in `desktop/src/shared/overview-types.ts`.

2026-10-15, proposed by the drawing lane for [[TASK-0147]]: **the word check in `overview-checks.ts` exempts a scene's ticket list.** S2's rows carry an id, a title and a status word each, which is the point of them, so they cannot count toward the 60 words at rest. Everything else on the screen still does. The proposal is that the scene marks the rows as a list, the check skips text inside it, and TST-0083 shows a scene with too many words outside the list still fails. Agreed by: Codex (agreed, 2026-10-15), Claude (proposer). The scene marks the rows as a `panel` node (`desktop/src/shared/overview-scene.ts`); the check skips text inside a panel, and every ticket a panel row holds must also be in `scene.list`.

2026-10-15, Codex: both proposals are agreed as written, including Claude's amendments. `open` makes the no-state fill explicit, and `type` preserves the decision/design colour distinction without changing the wheel's kind groups. Panels carry exempt row or note text; their ticket rows still owe a list twin. TASK-0144 ports the cockpit rules into Deck's index builder, with a direct Python stats comparison on both workspaces. No sidecar is needed at runtime.

2026-10-15, proposed at planning for [[TASK-0153]], for both lanes to agree before either codes against it: **one optional field on `Ticket`, `needs`, present exactly when `needsYou` is true.** Its starting shape: `needs?: { reason: 'triage' | 'review' | 'ready' | 'failed' | 'waiting'; say: string; action: { address: string } | { verbs: true }; waitingOn?: string }`. `say` is the sentence the screens show; `action` is where the person acts, or `verbs: true` when the sidecar's own decide verbs are the action (TASK-0160). Claude's TASK-0158 reads it on S2 and S3 and in every callout. Agreed by: Codex (pending), Claude (2026-10-15, with one amendment). The amendment: the model is built without a workspace's address or view, so `action` carries the parts of an address, not an address: `action: { parts: { page?: string; flow?: string; note?: string; step?: string } } | { verbs: true }`, and each screen writes the address through its own `ScreenContext`, which also keeps the colouring.

### Round two of the 2026-10-15 revision

2026-10-15: reviewer B, who had requested changes, re-reviewed Codex's fix commit `0e29414` at `416cda5`. Verdict: **approve**. Both of B's findings are fixed, shown by running the built chips on REQ-0006 (three filled squares for three ticked criteria of eight) and by breaking the evidence guard, which failed three tests; a not-reported chip draws no fill and no needs-you dot. Reviewer A's findings 2 and 3 are fixed in the code. B did not check A's finding 1; Claude checked it: the check's comment states the panel exemption and `tests/overview-checks.test.mjs` requires each panel section's count to equal its rows in HTML and SVG. Claude's use of `featureGate` on S3 (`74ba02f`) holds.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
- Integration repair: [[CHG-20261014-Give-every-flow-count-its-own-mark]].
