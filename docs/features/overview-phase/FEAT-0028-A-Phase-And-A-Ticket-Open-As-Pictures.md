---
type: "[[feature]]"
id: FEAT-0028
aliases: ["FEAT-0028"]
title: "A phase and a ticket open as pictures: the phase's web, exit-criteria ring and depth field; a ticket's lifecycle track and neighbourhood; re-phasing as moving particles"
status: review
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-15
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "From the wheel a person opens a phase and sees what it still owes and what kind of work it is, opens a ticket and sees where it is in its life and what it is joined to, and sees where the tickets with no phase would go, all without reading a list."
requirements: []
tasks: ["[[TASK-0127]]", "[[TASK-0128]]", "[[TASK-0129]]", "[[TASK-0147]]", "[[TASK-0148]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"
reviewed_by: ["model:gpt-6-astra", "model:gpt-6-astra"]
review_date: 2026-10-14
review_verdict: changes-requested
review_round: 2
review_response: "Round two: both Codex reviewers found the neighbour overlap fixed (202 neighbours on 202 places), and the band and neighbour tests now fail when broken. Not fixed: the re-phase test still passed when tickets stopped moving, because a size change counted as movement; fixed after it in d844e5e, where the test compares centres and fails on both workspaces with the move switched off. The cockpit issue stays unfiled, as TASK-0129 records. No third round."
related: ["[[PHASE-0005-Overview]]", "[[DES-0004-The-Phase-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# A phase and a ticket open as pictures

## Goal

**A phase, a ticket and the unplaced tickets each open as a picture.** These are S2, S3 and S4 in [[DES-0005-The-Overview-Is-Drawn-Not-Written]]. They replace DES-0004's text-heavy phase page and its Glass field and desk plates.

Lane: `system:claude`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- S2 Phase: the web, the exit-criteria ring, open tickets as glyphs in depth bands.
- S3 Ticket: the lifecycle track, the radial neighbourhood, and for a feature the small gate from S7.
- S4 Re-phase: particles in the core and suggestion lines; accepting moves them on screen only.
- A request to the cockpit, filed as an issue there, for a sidecar action that sets `phase:`, so a later feature can make re-phasing write.

Out of scope:

- Writing `phase:` into any note.
- The full S7 gate (FEAT-0029).

## Acceptance

- Each of S2, S3 and S4 passes FEAT-0026's screen checks on both workspaces.
- The wedges of a sector become the glyphs of S2 in one animated transition, and back.
- A ticket's neighbours in S3 are the links in the model, and clicking one re-centres on it.
- Edwin's acceptance tests for the three screens pass.

## Verification

- `bash tools/scripts/run-desktop-tests.sh overview-screens`, 2026-10-14: 8 tests, 8 passed (TST-0090), every phase of both workspaces and a ticket of every kind and state.
- `cd desktop && npm test`, 2026-10-14: 737 tests, 737 passed, none skipped.
- The window run, TST-0093, 2026-10-14: S2, S3 and S4 opened in a real window on both workspaces.

## Where this stands

**Back to `doing` on 2026-10-15, because Edwin ran the overview and asked for changes.** He liked much of it, and asked for the cockpit's ticket colours and status marks on every screen, tickets drawn as cockpit rows, more of a ticket on its own screen, and back and forward buttons. The agreed plan is DES-0005's revision of 2026-10-15. The move is from `review` back to `doing`, which STATUSES.md does not list as a typical transition; it is used because new work is added inside the feature, as FEAT-0005 and FEAT-0006 were reopened before. The review rounds below are for the build of 2026-10-14. The new tasks get their own review by the other model before the feature goes back to `review`.

New work: [[TASK-0147]] (Claude) turns S2's right-hand pane into cockpit rows on a tilted plane. [[TASK-0148]] (Claude) makes S3 show the ticket's text and its linked tickets as rows, with the gate as labelled chips. Both wait on TASK-0144 and TASK-0145; TASK-0148 also waits on Codex's chips in TASK-0149.

2026-10-14: built and at review. TASK-0127, TASK-0128 and TASK-0129 are done; TASK-0129's cockpit issue is cut from this run and written in the adoption table instead. Codex reviews it, as the agent that did not build it. Edwin's acceptance test is [[TST-0092-A-Phase-A-Ticket-And-Re-Phasing-Read-As-Pictures]], not yet run.

2026-10-15, later: the revision is built, tested and reviewed across models in two rounds. Every task of the revision is done (TASK-0144 to TASK-0151). The node suites pass (777 tests) and the window run TST-0093 passed on both workspaces. The feature goes back to `review`: what is left is Edwin's acceptance tests and his decisions on DES-0005.

## Review

### Round one

2026-10-14: two Codex reviewers (GPT-6 Astra), each in a clean worktree, reviewed the packet. Codex reviewed it because Claude built it. Both requested changes. Held: S2, S3 and S4 pass the screen checks on every phase and every ticket of both workspaces; S3's neighbours are exactly the model's links; re-phase acceptance moves every accepted ticket and writes nothing. Refuted:

1. At your-trainer scale neighbours share places: FEAT-0051 drew 202 neighbours on 116 places, and 94 exact collisions were found across the corpus (both).
2. TST-0090 still passed when failed and owed tickets were sent to the far band, when neighbours were dropped, and when accepted particles stopped moving, because it reused the module's own rules (both).
3. The cockpit issue for a write that sets `phase:` is not filed (both); it is cut from this run, as TASK-0129 says.

Fixed in `57c2e3d`: neighbours stand on wide rings that hold only what fits, below the track and gate, so every neighbour has its own place; TST-0090 works out the front band and the neighbours itself, checks that no two neighbours of the 25 most linked tickets share a place, and checks that accepting a group moves exactly its tickets.

### Round two

2026-10-14: two Codex reviewers (GPT-6 Astra), round two. Both found fixed: neighbours share no place on either workspace, and TST-0090 fails when failed and owed tickets leave the front band or neighbours are dropped. Both found not fixed: the re-phase test passed with the move switched off, because a glyph that only shrank counted as moved; and the cockpit issue is unfiled. Both requested changes. Fixed after it in `d844e5e`: the test compares where each glyph's centre is, and fails on both workspaces with the move switched off. The cockpit issue is cut from this run, as TASK-0129 says. No third round was run; the verdict stays the reviewers'.

## Questions between the lanes

None yet. Write a question here, dated, and land it on `main`; the other agent answers under it.

### Round one of the 2026-10-15 revision

2026-10-15: Codex (GPT-6 Astra) reviewed the drawing lane of the 2026-10-15 revision from a clean session, in a detached worktree at `b866405`. Codex reviewed it because Claude built it. Verdict: **changes-requested**, ten findings across TASK-0145 to TASK-0148 and TASK-0150. Claude fixed them in `1476b06` and, for the gate counts, after Codex's fixes merged.

- **Panels opened at scale zero when the overview was entered from another view** (P1). Fixed: the layer is shown before it is measured, and a ResizeObserver keeps the panels on the picture.
- **A link inside S3's text left Deck** (P2). Fixed: it opens the note it names, as Glass's reader does.
- **S3 hid repeated gate squares from the exactly-once check** (P2). Fixed with Codex: gate squares are evidence and never carry a ticket id, so nothing is stripped and every ticket is drawn once; a test checks it.
- **S3 cut the title short** (P2). Fixed: the whole title over up to three lines, forty words at most, the rest in the callout.
- **S3's gate showed five "not reported" chips** (P2). Fixed: S3 loads the same evidence as S7 through Codex's `featureGate`; a test checks the counts.

### Round two of the 2026-10-15 revision

2026-10-15: Codex reviewed Claude's fixes at `416cda5`. Verdict: **changes-requested**. Eight of the ten round-one findings were fixed; the title and colouring findings were partly fixed, and Codex found two new ones: back across workspaces lost its place, because switching workspace drew that workspace's wheel and recorded it as a visit (P1), and forty title words could push a feature's screen past sixty words at rest (P2). Claude fixed all four: an address that names an overview screen no longer draws the wheel first; S3 gives its title only the words the rest of the screen leaves, counted by the check itself, with no character cut-off; the colouring switch is shown, and C acts, only on the wheel and the re-phase screen, the two it changes. Codex's own reproducers now pass against main (three entries and forward live after back across workspaces; no S3 scene over sixty words and no title under forty words cut, across all 3,131 tickets), and the title sweep is a test. Two rounds is this run's limit, so no third review was asked for; Edwin's acceptance tests are the next check.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
