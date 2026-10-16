---
type: "[[feature]]"
id: FEAT-0027
aliases: ["FEAT-0027"]
title: "Deck opens on the wheel of phases: the circular overview, with finished phases on a shelf, the backlog in a tray and tickets with no phase in the core"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-16
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "A person opening Deck sees, in one picture, how far each unfinished phase has got and where the failed, owed-again and open tickets are, and reaches any phase from it in one click."
requirements: []
tasks: ["[[TASK-0125]]", "[[TASK-0126]]", "[[TASK-0131]]", "[[TASK-0145]]", "[[TASK-0146]]", "[[TASK-0152]]", "[[TASK-0155]]", "[[TASK-0156]]", "[[TASK-0162]]", "[[TASK-0166]]", "[[TASK-0167]]", "[[TASK-0169]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"
reviewed_by: ["model:gpt-6-astra", "model:gpt-6-astra", "model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-16
review_verdict: changes-requested
review_round: 2
review_response: "Towers: round one asked for changes; findings 1 to 5 fixed in 0286df2, and round two (two Claude reviewers) agrees. Finding 6, the window run on the towers, waits for Edwin. See Review, Towers."
related: ["[[PHASE-0005-Overview]]", "[[DES-0004-The-Phase-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# Deck opens on the wheel of phases

## Goal

**Deck opens on the wheel: one sector per phase still to finish, one wedge per ticket, coloured by state.** This is S1 in [[DES-0005-The-Overview-Is-Drawn-Not-Written]], the circular view from [[DES-0004-The-Phase-Overview]]. Finished phases sit on a shelf below it, the backlog in a tray, and tickets with no phase in the core. It becomes the first view in the built-in project-os view provider.

Lane: `system:claude`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- S1 as a Deck view with its own address, drawn from the overview model (the fixtures until FEAT-0026 lands).
- The dark Glass look of DES-0005: glow for what needs a person, depth on hover, animated transitions that honour reduced motion.
- Hover callouts, keyboard focus on every sector and wedge, and the list twin.
- Clicking a sector hands over to S2 (FEAT-0028); until S2 exists it opens the phase note.
- The served host shows the wheel read-only.

Out of scope:

- S2 to S7.
- Changing the overview model; a change is asked for in FEAT-0026.

## Acceptance

- Deck opens on the wheel for Deck and for your-trainer, and every ticket in the model is drawn exactly once.
- The wheel passes FEAT-0026's screen checks on both workspaces.
- Every sector and every disc on the shelf is reachable by keyboard and opens its phase.
- Edwin's acceptance test for the wheel passes, including his judgement that it reads as a picture.

## Verification

- 2026-10-16, the camera's turn and Home ([[TASK-0162]]): `cd desktop && npm test`, 789 tests, 789 passed; TST-0090's camera check covers the turn's direction, the limits, the three views and Home. The window run was not repeated: Edwin asked to stay with the design, and its driver now expects the new turn.
- `bash tools/scripts/run-desktop-tests.sh overview-screens`, 2026-10-14: 8 tests, 8 passed (TST-0090).
- `cd desktop && npm test`, 2026-10-14: 737 tests, 737 passed, none skipped.
- The window run, TST-0093, 2026-10-14: passed on Deck (374 tickets) and your-trainer (2,747) after `99eeeab`; its first run found two defects, fixed there.

## Where this stands

**Back to `doing` on 2026-10-16, to build the towers into Deck.** Edwin liked DES-0005's towers page and asked for it to be implemented as suggested, with a different design for the exit criteria and the red caps made pressable ([[TASK-0164]] to [[TASK-0169]]).

**Back to `doing` on 2026-10-16.** Edwin found the camera turned against the mouse now and again and was hard to bring back. [[TASK-0162]] fixes both. The towers on the ring that may replace the wheel are drawn under FEAT-0025 first ([[TASK-0163]]).

**Back to `doing` on 2026-10-15 (second revision), because Edwin ran the overview again and approved six changes.** He prefers the re-phase screen to the wheel, asked for more depth with mouse turning and zoom, said the gate's five boxes look wrong, wants the feature's text beside Accept and Send back, and wants a ticket that needs him to say what to do. The approved plan is DES-0005's revision of 2026-10-15 (second). The move from `review` back to `doing` is the same one the first revision made, because new work is added inside the feature. The paragraphs below it describe the state before this revision.

New work: [[TASK-0155]] (Claude) turns the wheel into a constellation laid out like the re-phase screen; it can start at once. [[TASK-0156]] (Claude) stands the wheel, S2's plane and the ring screens S4 and S6 on a tilted 3D plane that turns, pans and zooms with the mouse; it waits on TASK-0155.

**Back to `doing` on 2026-10-15, because Edwin ran the overview and asked for changes.** He liked much of it, and asked for the cockpit's ticket colours and status marks on every screen, tickets drawn as cockpit rows, more of a ticket on its own screen, and back and forward buttons. The agreed plan is DES-0005's revision of 2026-10-15. The move is from `review` back to `doing`, which STATUSES.md does not list as a typical transition; it is used because new work is added inside the feature, as FEAT-0005 and FEAT-0006 were reopened before. The review rounds below are for the build of 2026-10-14. The new tasks get their own review by the other model before the feature goes back to `review`.

New work: [[TASK-0145]] (Claude) draws every ticket in the cockpit's type colour and state fill on every screen, and the wheel in two colourings for Edwin to choose; it waits on TASK-0144. [[TASK-0146]] (Claude) adds back and forward, and can start at once.

2026-10-14: built and at review. TASK-0125, TASK-0126 and TASK-0131 are done. Codex reviews it, as the agent that did not build it. Edwin's acceptance test is [[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]], not yet run.

2026-10-15, later: the revision is built, tested and reviewed across models in two rounds. Every task of the revision is done (TASK-0144 to TASK-0151). The node suites pass (777 tests) and the window run TST-0093 passed on both workspaces. The feature goes back to `review`: what is left is Edwin's acceptance tests and his decisions on DES-0005.

2026-10-15, last: the second revision is built (by Claude alone after Codex stopped), reviewed in two rounds by two independent Claude reviewers, and verified: 789 node tests pass, and the window run TST-0093 passed on Deck and your-trainer at `20c4f35`. Back at `review`; what is left is Edwin's acceptance tests and his decisions on DES-0005.

## Review

### Round one

2026-10-14: two Codex reviewers (GPT-6 Astra), each in a clean worktree, reviewed the packet. Codex reviewed it because Claude built it. Both requested changes. Held: every ticket drawn once on both workspaces, the screen checks, every sector and disc reachable and opening its phase, the address, the list twin, reduced motion, and the served page read-only. Refuted:

1. Opening the wheel while the index is still being built cached the empty answer and failed twice with one request (one reviewer).
2. Owed-again tests in the backlog tray did not glow (one reviewer).
3. No wedge could take keyboard focus (both).
4. TST-0093 logged where Escape landed and whether the served page offered a write, without asserting either (both).

Fixed in `57c2e3d`: the wheel waits for the index and never keeps the empty answer; the tray glows; every ticket mark takes focus by the arrow keys from its sector, and Enter opens it; the window run asserts Escape and the served page and fails on a missing screen. TST-0090 now checks focus and glow on every ticket.

### Round two

2026-10-14: two Codex reviewers (GPT-6 Astra), round two. Both found all four findings fixed, each shown by breaking the fix and watching a test or probe fail: the wheel waits for an index still being built, the tray glows, every one of 361 and 2,747 tickets is reached and opened by the arrow keys and Enter, and the window run asserts Escape, the served page and every screen. Both approved.

### Third revision, round one (the camera, TASK-0162)

2026-10-16: two independent Claude reviewers, each in its own worktree, reviewed `ff7258b`. Both requested changes. Held: a drag to the right moves the leaning plane's near edge right wherever it starts, and the pan limit and the reversed turn are caught by TST-0090.

1. Home and the three views were drawn for the screen being left, not the one being opened, because `paint` drew them before `showOverview` set the new screen (one reviewer).
2. A whole turn to the right, a negative spin, was not tested as home (one reviewer).
3. The Home key was taken from the navigator's list and the list twin (both).
4. Two glides started close together cut each other short (one reviewer).
5. "Leaning" on a text screen went to 22°, not the ring screens' 26° its callout names, and "From the side" at 62° was not nearly edge on (both).
6. Home, Escape, the views and the pan limit in the renderer are guarded by no test that ran; only the window run can check them (both).

Fixed in `b9e61bb`: the camera bar is drawn after the new screen is current; TST-0090 checks negative whole turns; Home moves the camera only when focus is on the page or the overview's picture; a second glide takes over the first's timer; Leaning goes to 26° and From the side to 68°. The window-run driver now covers the views, the Home key, Escape on a moved and an unmoved camera, the pan limit and Home following the open screen; it waits for Edwin's word to run.

### Third revision, round two

2026-10-16: two independent Claude reviewers, each in its own worktree on `main`. Both found findings 1 to 5 fixed: the camera bar is drawn after the new screen is current, negative whole turns count as home, the Home key is left to the navigator and the list twin, a second glide takes over the first's timer, and Leaning and From the side match their callouts (each of the last two shown by putting the old value back and watching TST-0090 fail). Both ask for changes on finding 6 only: the window-run driver's new checks of the views, the Home key, Escape, the pan limit and Home following the screen have not run, so findings 1, 3 and 4 rest on reading the code until they do. That run waits for Edwin's word. Also fixed after the round: the comment on the Home key said the list twin goes to its first row, when the browser scrolls it (`0dea4f6`); and the negative-turn check could not fail, since −360 and −720.004 come out the same with or without the wrap, so it now checks −719.996 too.

### Towers, round one (TASK-0165 to TASK-0169)

2026-10-16: two independent Claude reviewers, each in its own worktree, reviewed `30f7f43`. Both requested changes. Held: every ticket stands once, in its feature's tower; a red cap opens the one ticket or the phase with what needs you first; a phase's screen lists each ticket in its segment once; three.js comes only from Deck's own origin, and the build refuses an import map without its hash.

1. In 3D no phase, shelf block, cap or ticket could be reached with the keyboard: the flat plan that holds their focusable marks was hidden with `display: none` (both).
2. The commit that removed the constellation's tests also cut the camera test (TASK-0156, TASK-0162), S3's needs-you banner test and S2's needs-you notes test, which stood between them; the packet still cited the camera test as passing (one reviewer).
3. Nothing tested the order of the feature rule: reversing it so a feature's lists beat the parent chain passed every test (one reviewer).
4. Nothing tested that a plinth or a shelf disc opens its phase: removing their targets passed every test (one reviewer).
5. TST-0092 still described the web; TST-0091 the constellation (both).
6. The window run TST-0093 has not run on the towers (both).

Also noted: three.js was imported statically, so a missing `vendor/` file would stop the whole overview; the build copied the page before checking the hash; the ring grew one step past its first fit.

Fixed in `0286df2`: the three tests are restored and pass; in 3D the plan stays in the page, invisible and ignoring the pointer, so Tab and the arrows reach everything, and a focused ticket's floor is outlined; TST-0090 checks that the parent chain wins over a lower-numbered feature's list, and that every plinth and shelf disc carries its phase's address and takes focus (each break now fails a test); three.js loads with the 3D view's module when first needed; the build checks the hash before copying; the ring stops at its first fit. TST-0091 and TST-0092 describe the towers. Finding 6 waits for Edwin's word. 791 node tests pass.

### Towers, round two

2026-10-16: two independent Claude reviewers, each in its own worktree on `main` (`3eb65dc`). Both found findings 1 to 5 fixed: the plan stays focusable under the 3D view, the three cut tests are back and pass, and reversing the feature rule's order or removing a plinth's or a disc's target now fails a test (each shown by breaking it). Both keep finding 6 open: the window run TST-0093 has not run on the towers, and its `passing` is from the old screens; its note now says so. It waits for Edwin's word. 791 node tests: 789 pass and the 2 cockpit parity checks skip where the sibling cockpit cannot be found.

## Questions between the lanes

None yet. Write a question here, dated, and land it on `main`; the other agent answers under it.

### Round one of the 2026-10-15 revision

2026-10-15: Codex (GPT-6 Astra) reviewed the drawing lane of the 2026-10-15 revision from a clean session, in a detached worktree at `b866405`. Codex reviewed it because Claude built it. Verdict: **changes-requested**, ten findings across TASK-0145 to TASK-0148 and TASK-0150. Claude fixed them in `1476b06` and, for the gate counts, after Codex's fixes merged.

- **An overtaken step back corrupted the history** (P1). Fixed: a step completes only when its own screen draws; any other draw is an ordinary visit. The decision is the pure `afterDraw` in `overview-trail.ts`, and a test reproduces the overtaken step.
- **An in-progress square looked like "complete, not proven" under reduced motion** (P2). Fixed: the square keeps the cockpit's static outline. A test checks every fill's shapes and the needs-you dot on each, which no test checked before.
- **The colouring was not in the address** (P2), as this feature's task requires. Fixed: `colour=state` is part of the address grammar; every overview address keeps its colouring. DES-0005 now says the switch reaches the wheel, its shelf and tray, and the re-phase cloud, and that lists keep the cockpit's marks.

### Round two of the 2026-10-15 revision

2026-10-15: Codex reviewed Claude's fixes at `416cda5`. Verdict: **changes-requested**. Eight of the ten round-one findings were fixed; the title and colouring findings were partly fixed, and Codex found two new ones: back across workspaces lost its place, because switching workspace drew that workspace's wheel and recorded it as a visit (P1), and forty title words could push a feature's screen past sixty words at rest (P2). Claude fixed all four: an address that names an overview screen no longer draws the wheel first; S3 gives its title only the words the rest of the screen leaves, counted by the check itself, with no character cut-off; the colouring switch is shown, and C acts, only on the wheel and the re-phase screen, the two it changes. Codex's own reproducers now pass against main (three entries and forward live after back across workspaces; no S3 scene over sixty words and no title under forty words cut, across all 3,131 tickets), and the title sweep is a test. Two rounds is this run's limit, so no third review was asked for; Edwin's acceptance tests are the next check.

### Review of the second revision (2026-10-15)

Codex stopped running on 2026-10-15 and Edwin asked for Claude only, so two independent Claude reviewers, each in a clean context and a separate session, reviewed the second revision (TASK-0153 to TASK-0161, range `efd0870..65e3952`) in Codex's place. Both are the same model that built the work (`model:claude-opus-5-5`); the independence is of context, not of model.

**Round one.** Reviewer A: changes-requested. Reviewer B: changes-requested. Their findings, and what was done (`20c4f35`):
- A phase with thousands of tickets drew none of them on the wheel. The fan now packs finer down to a dot and never returns nothing; tested up to 20,000 tickets in a thirtieth of the wheel.
- The triage buttons sent the note's time read at the press, or nothing when Deck could not read it; S5's decide never sent one, because the sidecar's note payload has no time. Both now keep the time from Deck's index when the screen is drawn, send that, and refuse before asking a reason when there is none.
- Three tests let a break through: overlapping particles, the needs order for each status reason before waiting, and a verb the sidecar now refuses. Each now fails when its guard is broken, which reviewer B confirmed.
- The wires rebuilt the reverse links on every pointer move; they are built once per model.
- Tasks ticked a Codex review and a Codex agreement that never happened; they now say what happened. Stale ticket counts were corrected, and the window run turns S2 for its picture.

**Round two.** Reviewer B: approve; every round-one finding fixed, the record items done in this close-out. Reviewer A: changes-requested, on two small points, both fixed after the round: a comment that named the wrong row for overflow particles, and the guard's time being read after the design S5 shows rather than before (both screens now read it first, so it is never newer than what the person sees). A also saw two constellation tests fail; that was reviewer B breaking `fanPlaces` on purpose in the same tree at the same moment, and the suites pass on a clean tree (789 tests). Two rounds is this run's limit.

## Links

- Phase: [[PHASE-0005-Overview]]
- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]]
- Plan: [plan/PLAN.md](plan/PLAN.md)
