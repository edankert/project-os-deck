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
tasks: ["[[TASK-0115-Build-One-Overview-From-The-Notes]]", "[[TASK-0116-Serve-And-Print-The-Overview]]", "[[TASK-0117-Build-Both-Overview-Fixtures-From-Real-Notes]]", "[[TASK-0118-Check-Every-Screen-As-Data]]", "[[TASK-0119-Report-When-Localhost-Tests-Cannot-Run]]"]
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

- Replace Claude’s placeholder fixtures at `desktop/fixtures/overview/deck.json` and `desktop/fixtures/overview/your-trainer.json` with the builder’s real output. Record each source commit in `head`.
- The model, computed from Deck's index: DES-0004's state table, its five placement rules, its three kinds of phase, the exit criteria read from each phase note, and the re-phase suggestions from links and from dates.
- Serve the model at `GET /deck/overview/<workspaceId>` on both hosts, cached by index revision. Print it with `node desktop/scripts/overview.mjs <repo-root> [--json]`.
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

The targeted suites ran in Codex's sandbox on 2026-10-14 without opening a window. That sandbox refused to listen on localhost, so one route test was skipped there:

| Command | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| `bash tools/scripts/run-desktop-tests.sh overview-model` | 16 | 0 | 0 |
| `bash tools/scripts/run-desktop-tests.sh overview-route` | 5 | 0 | 1 |
| `bash tools/scripts/run-desktop-tests.sh overview-fixtures` | 3 | 0 | 0 |
| `bash tools/scripts/run-desktop-tests.sh overview-checks` | 8 | 0 | 0 |

**The full run, outside the sandbox:** `cd desktop && npm test`, 2026-10-14, run by Claude on `lane/codex` before the merge: 679 tests, 679 passed, none failed, none skipped.

Codex had wrapped the host tests of eight existing suites in a helper that skipped them when listening was refused (TASK-0119). Claude reverted that before the merge, because the same skip would hide a real failure in CI; TASK-0119 is cancelled and its test TST-0084 retired.

`bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` pass. No CI run or human acceptance verdict is claimed.

## Where this stands

2026-10-14: the model, the cached route, the command, the real fixtures and the screen checks are implemented, and TASK-0115 to TASK-0118 are done. FEAT-0026 is at review: Claude reviews it, as the agent that did not build it, and Edwin's acceptance follows.

The sandbox also refused git's lock file, so Codex could not commit. Claude committed the work on `lane/codex` on Codex's behalf, with Codex as co-author, and merged it into `main`.

## Model and route

`desktop/src/shared/overview-model.ts` exports `buildOverview(records, options)`. The caller supplies the workspace name, commit, generation time and `readBody(relPath)`. The builder reads no filesystem or clock and changes no input record. It uses the existing graph link parser and resolver for frontmatter and body links. Cross-project links never become local links.

Placement follows DES-0004 in order. Member-list ties use phase order. Parent links are followed only to features through `parent`, `implements` or `covers`. A missing phase target falls through to later rules. Cycles cannot hang the builder. Suggestions use a unique highest link count, then a unique inclusive date range. They do not move tickets, and project-wide tickets receive no suggestion. Each phase's tickets sort by kind, then `STATE_ORDER`, then id.

Acceptance tests use note status because the index has no release-ledger revision or verdict reducer. An `active` acceptance check is open. The optional `acceptanceResults` input accepts the latest result for every applicable platform; failed takes precedence over withdrawn, and all passed or excused means closed. Neither the host nor the CLI reads that ledger. Automated `active` and `passing` statuses approximate closed; `ciGreen: false` keeps them open. These states do not certify CI or human acceptance. Unknown per-type statuses remain open.

`GET /deck/overview/<workspaceId>` returns the model at the top level, with `workspaceId`, `revision` and `building: false`. Before the first index build, it returns only those three fields with `building: true`. An unknown workspace returns 404. The host refuses writes with 405. Desktop and served pages use this same route. The main process caches the model by workspace and index revision and clears it when the workspace is removed. A body-only edit raises the existing index revision and refreshes exit criteria.

After `cd desktop && npm run build`, run `node desktop/scripts/overview.mjs <repo-root> [--json]` from the repository root. It prints per-phase counts or the same model as JSON. It reads the repository and starts no window. Neither contract file changed.

## Screen checks

`desktop/src/shared/overview-checks.ts` returns the four results `words`, `numbers`, `address` and `twin`. The exact count rule is documented at the top of that module. A number must name a unique mark whose integer `count` matches a displayed value. A ratio may name either its numerator or denominator. IDs, explicit phase labels, padded phase labels, dates, times and version strings are excluded from inferred counts. A `number` role always requires a mark, including on hover.

Use `formatAddress(addressFor(...))` to make scene addresses canonical. Its query order puts `note` before `page` or `flow`. The seven overview page and flow names are registered. Dotted test steps such as `android.3` now round-trip. Other malformed steps remain refused.

The list twin includes ordinary ticket IDs and the four legacy acceptance-document IDs described below. Phase IDs and aggregate mark IDs are not ticket rows. Every mark action also needs a row with that action. The fixture suite checks all IDs from both corpora through a scene, including the legacy documents.

## Fixture comparison with DES-0004

The fixtures are real builder output captured on 2026-10-14. Deck's `head` is `22b19e43c051f3ad4c7e0d2c4d04b29ae1120c37`; your-trainer's is `c38475f8862520eca61d64383ac946163e1d5bd9`. Both repositories had working-tree changes at capture time. The `head` records the checked-out commit, not a claim that the tree was clean. Deck includes this lane's new notes. The your-trainer repository was read only.

| Workspace | DES-0004 tickets | Current tickets | No phase, excluding project-wide | Open / finished / backlog phases |
| --- | ---: | ---: | ---: | --- |
| Deck | 333 | 357 | 1 | 5 / 0 / 0 |
| your-trainer | 2,646 | 2,747 | 987 | 9 / 17 / 1 |

Deck's core contains 22 tickets: 21 project-wide and one unplaced. Your Trainer's core contains 1,028 tickets: 41 project-wide and 987 unplaced. The captured exit criteria contain 47 boxes for Deck and 144 for Your Trainer. PHASE-019 and PHASE-999 in Your Trainer have prose exit criteria.

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

Acceptance-state differences come from the authorised status fallback. In historical Deck, TST-0008, TST-0009, TST-0012 and TST-0013 change from closed to open; TST-0010 and TST-0011 change from owed to open. In historical Your Trainer, 252 tests change from closed to open, 177 from owed to open, and TST-0656 from failed to open. Their notes say active; their ledger verdict is not in the index. In the current capture, one of those owed checks has since retired, leaving 176 owed-to-open differences and one owed-to-dropped difference.

Repository growth after those historical commits accounts for the remaining ticket increases. No historical typed ticket disappeared:

| Kind | New Deck tickets | New Your Trainer tickets |
| --- | ---: | ---: |
| Requirements | 0 | 4 |
| Features | 5 | 4 |
| Tasks | 12 | 58 |
| Tests | 5 | 14 |
| Issues | 0 | 12 |
| Decisions and designs | 2 | 3 |
| Risks | 0 | 2 |
| Total new notes | 24 | 97 |

Thus Your Trainer's total is 2,646 + 4 previously omitted test documents + 97 new notes = 2,747. Its unplaced count is 968 + 4 legacy documents + 11 new unplaced tickets + 5 existing tickets that lost placement − 1 that gained placement = 987. Twenty-two existing tickets changed placement as the notes moved on, including the work moved out of finished PHASE-020. Deck's shared tickets keep their placements. Its fifth phase and this run's notes account for the larger total.

Suggestions are recomputed from the current links and dates. Deck has one suggestion from links. Your Trainer has 438 from links and 549 tickets without a suggestion. No current unplaced ticket has a unique qualifying date range. These are suggestions, not changes to `phase:`. DES-0004's older suggestion counts remain a historical measurement.

## Preflight

The request is bounded to FEAT-0026 and is testable by five node suites. No new requirement is needed beyond the phase’s stated checks. FEAT-0006’s address contract, FEAT-0008’s read-only host, FEAT-0011’s index revision and ADR-0001 remain intact. Their feature notes have no linked requirements. No phase dependency blocks this work; the model and checks need no design verdict.

The risk scan found no new external dependency, environment setting, storage layout, long-running process or credential exposure. The fixtures keep their existing paths. The route exposes derived data from the same index already served read-only.

## Questions between the lanes

2026-10-14: no contract change is requested. Claude should use the top-level route payload and canonical addresses described above. The fixtures include four legacy test IDs. Acceptance states remain the explicitly allowed status approximation.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
