---
type: "[[feature]]"
id: FEAT-0036
aliases: ["FEAT-0036"]
title: "Deck opens only on the overview, and the original Deck is kept under a tag"
status: review
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source:
  - "Edwin 2026-10-23: 'Can we first of all remove or park the original deck, possibly create its own separate application to be worked on at another time or maybe never? (suggest approach)'"
  - "Edwin 2026-10-23, answering the proposal: 'tag and remove; park Vault too (as far as I know the other sessions are stopped??? otherwise I think it is save to stop them)'"
goal: "Deck opens on the overview and on nothing else, its code and tests carry only the overview, the agent sessions and the shell drawer, and the original Deck (Spread, Glass, the orbit) is kept whole under the tag original-deck-2026-10-23."
requirements: []
tasks: ["[[TASK-0213]]", "[[TASK-0214]]", "[[TASK-0215]]", "[[TASK-0216]]", "[[TASK-0217]]", "[[TASK-0219]]"]
deferred: []
release: ""
acceptance_exception: ""
acceptance: ""
design: ""
reviewed_by: ["model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-23
review_verdict: changes-requested
review_round: 1
related: ["[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]", "[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[PHASE-0003-Vault]]", "[[PHASE-0004-Parity]]", "[[RISK-0018]]", "[[TST-0109]]"]
---

# Deck opens only on the overview

## Goal

**When this is done, Deck opens on the wheel of phases and nothing else, and about half its code is gone from main.** Spread, Glass and the orbit (the original Deck) are kept whole under the git tag `original-deck-2026-10-23`, and can become their own repository from there ([[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]). Nobody has to build, test or review them while the overview is worked on.

## Scope

What stays, and is not changed by this feature:

- The overview: the wheel, a phase, a ticket, the towers and the accept flows ([[PHASE-0005-Overview]]).
- The agent sessions, the session pane, Needs you, the cockpit's overview panels and the shell drawer ([[PHASE-0004-Parity]]).
- What those run on: the store, Deck's own index of the notes, the sidecar client, the HTTP host that serves a tablet read-only, writes through the shell, and the addresses of the overview's screens.

What leaves main:

- In the window: Spread, Glass and the orbit; the view switcher and the surface toggle; desks and scenes; pop-out panels and windows that follow another.
- In the main process: satellite windows, throwing and handing a note between windows, the orbit worker and its layout, the measuring run (`npm run measure`) and the Glass smoke checks.
- In the store: the state only those used. An old state file still opens.
- The view description language and the view provider, which only Spread and Glass read.
- The node suites and smoke checks of removed code. Their test notes become `retired`.

Out of scope:

- A separate application for the original Deck. If it is ever wanted, a new repository is made from the tag.
- Changing how the overview, the agent pane or the shell drawer look or behave. A defect found in them on the way is fixed under its own task (`tools/instructions/QUALITY.md`).
- The sidecar and the cockpit. Nothing there changes.

## Acceptance

- Deck opens on the wheel of phases. No view switcher, surface toggle, Spread, Glass or orbit is drawn at any address the overview offers.
- A state file Deck wrote before this feature opens Deck on the overview with no error and no lost workspace.
- An address that names a removed view, desk or panel opens the overview and says that view is not in this Deck. It does not fail silently.
- The agent pane, Needs you, the overview panels and the shell drawer behave as before: TST-0104 to TST-0107 pass unchanged.
- The served page on a tablet shows the overview read-only and offers no verb.
- `npm test` passes, and no file under `desktop/tests/` tests a removed module.
- The `deck-smoke` job in CI passes, and every check it runs is about the overview, the agent pane or the shell drawer.
- `git ls-remote --tags origin original-deck-2026-10-23` names commit `b1bc30b`, and `parked/original-deck` on origin holds TASK-0005's orbit comparison.
- No test note whose subject is gone is left `active`, and `bash tools/scripts/validate-docs.sh` reports no new finding.

## Verification

- 2026-10-23: built in [[TASK-0213]] to [[TASK-0217]]. `npm test` runs 542 checks, all passing. The container smoke passes on loopback and on the network, and its loopback half makes 30 checks about the workspace, the overview in a window, the served page, the guards and the quit. Its old-address check was shown to fail when broken. The overview's five walks pass in the container.
- The tag `original-deck-2026-10-23` is on origin at `b1bc30b`, and `parked/original-deck` holds TASK-0005's orbit comparison.
- Still Edwin's: [[TST-0109]], which opens Deck on his own state file and runs the original Deck from the tag. A copy of his state file from before the cut is kept at `~/Library/Application Support/project-os-deck/deck-state.before-overview-only-2026-10-23.json`.

## Review

**Round one, 2026-10-23, at 765c0e5: changes requested by both reviewers.** Both ran `claude-opus-5-5` from the packet in fresh contexts, read the files that were rewritten rather than the 42,000 deleted lines, and broke five guards between them in a scratch copy (the old state file's workspace, the served state's name, the window's allowed actions); each break failed a check.

What they found, both of them, fixed in [[TASK-0219]]:

- The ticket screen still made two addresses only Spread could open: a link in a ticket's text to a note that is not a ticket (a phase, a change note, a reference note), and the button on a ticket waiting on such a note. Both threw the person onto the wheel with a line saying a view was gone. A phase now opens its own screen; any other note leaves the person where they are, and the button is drawn off and says why.
- The "not in this Deck" line was said even when the wheel did not open, over the line that said why. It is now said only once the wheel is open.
- An overview address that also named a desk, a panel or a surface dropped those parts without a word. It now says what it dropped.
- The smoke's check that an old address lands on the wheel passed trivially, because the window was on the wheel already. It now starts from the re-phasing screen.

Left as they are: the smoke's list of ids that must be gone is a spot check of eight, which is enough while the modules that drew the rest are deleted. The reserved flow cursor left with the old store; nothing had written it, and a flow that needs one adds it back. The validator reading the tag as the last release is a rule of the template's `validate-docs.py`, which this repository does not edit: CI clones without tags and still shows every finding, and a local run says how many it hides.

## Notes

- **Impact analysis, 2026-10-23.** No requirement in this repository constrains the overview. REQ-0001 to REQ-0006 constrain Glass only, and are deferred with it. Two phase notes needed changing, and [[TASK-0213]] carries the edits: [[PHASE-0004-Parity]] names PHASE-0002 in `depends:`, places FEAT-0021 "on Glass", and its first exit criterion's acceptance test ([[TST-0015-One-Real-Task-Done-In-Deck-Instead-Of-The-Cockpit]]) speaks of "two screens". [[PHASE-0005-Overview]] names PHASE-0001 in `depends:`; that work stays on main and is finished, so the dependency is met.
- **Risk scan, 2026-10-23.** One trigger applies: a directory layout change, because files, an npm script and smoke checks are removed. [[RISK-0018]] records it. No new dependency, environment variable, credential or long-running step.
- **Assumption.** An address naming a removed view opens the overview with a line saying so. A refusal was the other reading; opening the overview loses nothing a person had.
