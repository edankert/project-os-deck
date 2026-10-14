---
type: "[[feature]]"
id: FEAT-0026
aliases: ["FEAT-0026"]
title: "One list of tickets, each with a type, a state and a place: the overview model every screen reads, and the checks every screen is held to"
status: review
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "Every overview screen reads one model of the workspace's tickets, so no two screens can disagree, and every screen is checked automatically against the look's rules on two real workspaces."
requirements: []
tasks: ["[[TASK-0115-Build-One-Overview-From-The-Notes]]", "[[TASK-0116-Serve-And-Print-The-Overview]]", "[[TASK-0117-Build-Both-Overview-Fixtures-From-Real-Notes]]", "[[TASK-0118-Check-Every-Screen-As-Data]]", "[[TASK-0119-Report-When-Localhost-Tests-Cannot-Run]]", "[[TASK-0140-Fix-The-Overview-Review-Findings]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: ""
reviewed_by: ["model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-14
review_verdict: changes-requested
review_round: 1
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

`cd desktop && npm test` passed on 2026-10-14 in this worktree: **704 tests passed, none failed, none skipped**. Temporary test files stayed under `desktop/dist/tmp`. No Electron process or window was started.

| Suite within that run | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| `overview-model` | 21 | 0 | 0 |
| `overview-route` | 12 | 0 | 0 |
| `overview-fixtures` | 3 | 0 | 0 |
| `overview-checks` | 14 | 0 | 0 |
| `overview-screens` (drawing lane) | 8 | 0 | 0 |

Five new screen-check tests failed before the fix. The local lowercase heading-link test failed with the old resolver. Deliberately removing the feature-parent restriction, reversing the member-list tie winner and replacing phase order with id order each failed its regression. The recorded Deck ledger failed against the old service and command. The new tests cover ledger edits without a note revision, multiple platforms, sealed excuses, old `mark` fields, date ordering, malformed files and dirty note provenance. The localhost socket test runs without an EPERM or EACCES skip.

The resolved results were also compared with `tools/scripts/release-test.py` against both real repositories. Every surviving verdict agreed: 5 on Deck's app platform, 541 on Your Trainer's Android platform and 1 on iOS. The overview additionally retains invalidations as the owed-again state.

`bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` pass. The validator reports existing advisory warnings. No CI run or human acceptance verdict is claimed.

## Where this stands

The first review's findings are fixed on `lane/codex-fix` under TASK-0140, through fixture commit `a1d8876`. The model reads acceptance history, the checks enforce the scene contract, and both fixtures have been rebuilt with recorded source provenance. All 704 desktop tests pass without skips. FEAT-0026 remains at `review`; Claude owns round two and merging. Edwin owns acceptance. Nothing was pushed or merged, and FEAT-0029's files were not touched.

## Review

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

## Model and route

`desktop/src/shared/overview-model.ts` exports `buildOverview(records, options)`. The caller supplies the workspace name, commit, generation time and `readBody(relPath)`. The builder reads no filesystem or clock and changes no input record. It uses the existing graph link parser and resolver for frontmatter and body links. Cross-project links never become local links.

Placement follows DES-0004 in order. Member-list ties use phase order. Open phases, the shelf and the backlog all sort by the phase note’s numeric `order`, using its numeric id when no order is declared, then by id for ties. Deck’s Parity (order 3) precedes Vault (order 4). A phase id ending in 999 is backlog by convention; `kind: backlog` explicitly marks any other id as backlog. Finished status takes precedence and puts the phase on the shelf. Parent links are followed only to features through `parent`, `implements` or `covers`. A missing phase target falls through to later rules. Cycles cannot hang the builder. Suggestions use a unique highest link count, then a unique inclusive date range. They do not move tickets, and project-wide tickets receive no suggestion. Each phase's tickets sort by kind, then `STATE_ORDER`, then id.

Acceptance tests read `docs/releases/ledgers/*.json` through `overview-ledger.ts`. The host and CLI supply the resolved results through `acceptanceResults`. Each platform with a ledger participates, including an empty working ledger. A failure wins over a withdrawal. Every applicable platform must pass or be excused before the ticket closes; `na` excludes that platform and `partial` alone does not satisfy DES-0004's pass rule. A missing result stays open. Retired tests remain dropped.

The reader follows `release-test.py` and the cockpit's `ledger.resolve`: sealed ledgers in seal-date order, then working ledgers, with entries ordered by date and file order for ties. It accepts the historical `mark` key. A sealed excuse expires without erasing a surviving pass. An invalidation clears the verdict and marks the test owed again until a retest or current excuse settles it. Invalid ledgers fail visibly. Automated `active` and `passing` statuses still approximate closed; `ciGreen: false` keeps them open. These states do not certify CI or human acceptance.

`GET /deck/overview/<workspaceId>` returns the model at the top level, with `workspaceId`, `revision` and `building: false`. Before the first index build, it returns only those three fields with `building: true`. An unknown workspace returns 404. The host refuses writes with 405. Desktop and served pages use this same route. The main process caches the model by workspace, index revision and a digest of ledger filenames and contents and clears it when the workspace is removed. A body-only edit raises the existing index revision and refreshes exit criteria. A ledger edit, addition or removal refreshes results even when the note revision stays unchanged.

After `cd desktop && npm run build`, run `node desktop/scripts/overview.mjs <repo-root> [--json]` from the repository root. It prints per-phase counts or the same model as JSON. It reads the repository and starts no window. The only contract addition is optional `dirty` beside `head`, agreed below.

## Screen checks

`desktop/src/shared/overview-checks.ts` returns the four results `words`, `numbers`, `address` and `twin`. The exact count rule is documented at the top of that module. Each count needs its own text and `markRef`, resolving to one mark with the same nonnegative integer count. Split ratios and multi-count labels into separate texts. Explicit phase labels, real ids, dates, times and version strings are excluded from inferred counts. A padded number in a label still counts. A `number` role requires a mark even on hover. An `id` role accepts only ids or bare padded phase numbers; prose fails and still counts toward the word limit. Word counting excludes only complete REQ, FEAT, TASK, TST, ISS, ADR, DES, RISK, PHASE, CHG and REL ids followed by a number.

Use `formatAddress(addressFor(...))` to make scene addresses canonical. Its query order puts `note` before `page` or `flow`. The seven overview page and flow names are registered. An address must name the scene it restores, not merely round-trip. Dotted test steps such as `android.3` now round-trip. Other malformed steps remain refused.

The list twin includes ordinary ticket IDs and the four legacy acceptance-document IDs described below. Phase IDs and aggregate mark IDs are not ticket rows. Every mark action also needs a row with that action. The fixture suite checks all IDs from both corpora through a scene, including the legacy documents.

## Fixture comparison with DES-0004

The fixtures are real builder output captured on 2026-10-14. Deck's `head` is `306e7bf3482930caaad83c71ee04a1b5c1ee1921`, with `dirty: false`. Your Trainer's is `c38475f8862520eca61d64383ac946163e1d5bd9`, with `dirty: true`. The flag covers Markdown notes, ledger files and `SNAPSHOT.yaml`, including staged and untracked changes. Build output does not set it. Your Trainer was read only, and Git's optional index writes were disabled.

| Workspace | DES-0004 tickets | Current tickets | No phase, excluding project-wide | Open / finished / backlog phases |
| --- | ---: | ---: | ---: | --- |
| Deck | 333 | 361 | 1 | 5 / 0 / 0 |
| your-trainer | 2,646 | 2,747 | 987 | 9 / 17 / 1 |

Deck's core contains 22 tickets: 21 project-wide and one unplaced. Your Trainer's core contains 1,028 tickets: 41 project-wide and 987 unplaced. The captured exit criteria contain 47 boxes for Deck and 144 for Your Trainer. PHASE-019 and PHASE-999 in Your Trainer have prose exit criteria.

| Acceptance tests | Closed | Failed | Owed again | Open | Retired (dropped) | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Deck | 4 | 0 | 2 | 17 | 1 | 24 |
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
| Tasks | 13 | 58 |
| Tests | 8 | 14 |
| Issues | 0 | 12 |
| Decisions and designs | 2 | 3 |
| Risks | 0 | 2 |
| Total new notes | 28 | 97 |

Thus Your Trainer's total is 2,646 + 4 previously omitted test documents + 97 new notes = 2,747. Its unplaced count is 968 + 4 legacy documents + 11 new unplaced tickets + 5 existing tickets that lost placement − 1 that gained placement = 987. Twenty-two existing tickets changed placement as the notes moved on, including the work moved out of finished PHASE-020. Deck's shared tickets keep their placements. Its fifth phase and this run's notes account for the larger total.

Suggestions are recomputed from the current links and dates. Deck has one suggestion from links. Your Trainer has 438 from links and 549 tickets without a suggestion. No current unplaced ticket has a unique qualifying date range. These are suggestions, not changes to `phase:`. DES-0004's older suggestion counts remain a historical measurement.

## Preflight

The request is bounded to FEAT-0026 and is testable by five node suites. No new requirement is needed beyond the phase’s stated checks. FEAT-0006’s address contract, FEAT-0008’s read-only host, FEAT-0011’s index revision and ADR-0001 remain intact. Their feature notes have no linked requirements. No phase dependency blocks this work; the model and checks need no design verdict.

The risk scan found no new external dependency, environment setting, storage layout, long-running process or credential exposure. The fixtures keep their existing paths. The route exposes derived data from the same index already served read-only.

## Questions between the lanes

2026-10-14: Claude agreed to one contract addition for the review fixes: `dirty?: boolean` beside `head` in `OverviewModel`. It records whether the source tree had uncommitted note changes at capture time. TASK-0140 implements the findings without changing the scene contract or FEAT-0029 files.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
