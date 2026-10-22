---
type: "[[feature]]"
id: FEAT-0025
aliases: ["FEAT-0025"]
title: "Every overview screen is drawn before it is built: DES-0005's prototype and one plate per screen, from real tickets"
status: review
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-14
updated: 2026-10-21
source: ["Edwin 2026-10-14: 'Please make sure that each of these screens identified show dialogs/views which are based more on diagrams and images to show case progress and status and less on text! Also introduce the circular view we defined previously as an overview view. And think about what is needed to handle the design, the acceptance test and the tickets acceptance flows. (the goal is to define a goal which can be worked on with both openai astra and claude opus!)'"]
goal: "Edwin can look at all seven overview screens, drawn from Deck's and your-trainer's real tickets, and accept or decline the design before any of it is built."
requirements: []
tasks: ["[[TASK-0130]]", "[[TASK-0150]]", "[[TASK-0157]]", "[[TASK-0161]]", "[[TASK-0163]]", "[[TASK-0164]]", "[[TASK-0176]]", "[[TASK-0177]]", "[[TASK-0179]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"
reviewed_by: ["model:gpt-6-astra", "model:gpt-6-astra", "model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-21
review_verdict: approve
review_round: 2
review_response: "Fifth revision (needs you, grouping, ages, evidence, weeks, TASK-0177): round one, changes requested, fixed in f6ad457 and 8a5fb90; round two, data approve, page changes requested on two fixes, both fixed in e26fb59 and checked by the author. Fourth revision (links, search and next up, TASK-0176): round one, two Claude reviewers, changes requested; all fixed in a101bb5; round two, two Claude reviewers, approve, and their notes fixed in 3e964d4 and 78b220b. Third revision (towers on the ring): round one asked for changes, all five fixed in b9e61bb; round two, two Claude reviewers, approve. The untested single-quoted parent they both noted is tested since."
related: ["[[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]]", "[[PHASE-0005-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[DES-0004-The-Phase-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# Every overview screen is drawn before it is built

## Goal

**Edwin sees every overview screen as a picture before any of it is built.** This feature turns [[DES-0005-The-Overview-Is-Drawn-Not-Written]] from a brief into a design: an interactive prototype and one plate per screen, S1 to S7, drawn from real tickets on both workspaces. It ends when DES-0005 is `proposed` and Edwin has a verdict to give.

Lane: `system:claude`. How the two agents share this phase is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]].

## Scope

- **The plates are drawn by the screen code itself**, which changed the plan on 2026-10-14: `desktop/scripts/overview-plates.mjs` renders every screen's scene, the same functions Deck draws with, into SVG plates, JPEG copies and the prototype page. The design and the build cannot disagree, at the cost that the design was not drawn before the code.
- The prototype `docs/designs/DES-0005-the-overview.html`: no network, scripts allowed, both workspaces switchable. Served by the cockpit's viewer, a press on a sector, a ticket or a gate opens that screen as in Deck; opened as a file, the switches reach every screen.
- The tickets are the overview model's fixtures, built from Deck and your-trainer on 2026-10-14 (FEAT-0026), not DES-0004's measurements of 2026-10-08. S6 draws your-trainer's REL-0017 from the sidecar's recorded release-test payloads, which have 14 sections where the command-line sheet has 12 (`desktop/fixtures/overview/flows/README.md`).
- For S5 and S6, real images: design plates, and before-and-after captures from your-trainer's acceptance gallery, reduced in size and copied into `__attachments__/DES-0005/`.
- One plate per screen per workspace, captioned in DES-0005 with its word count at rest.
- A proposed answer to each of DES-0004's four open questions.

Out of scope:

- Application code beyond the plate script. The screens themselves are FEAT-0027, FEAT-0028 and FEAT-0029.

## Acceptance

- Every screen S1 to S7 has a plate for Deck and a plate for your-trainer, and each plate's caption gives its measured word count at rest, at most 60.
- No plate shows a number without a mark that draws the same count.
- The prototype opens offline and every screen in it is reached from the wheel in at most two clicks.
- DES-0005 is `proposed`, with a Revisions line saying what Edwin is asked to decide.

## Verification

2026-10-16, towers on the ring ([[TASK-0163]]): `cd desktop && npm test`, 789 tests, 789 passed. TST-0094 checks the towers page holds every ticket of both fixtures once and loads only three.js. `desktop/scripts/towers-capture.cjs` drew the page in a hidden window with no page errors and took eight pictures. Round one of review, by two independent Claude reviewers, asked for changes: two parsing bugs put three of Deck's tickets in the wrong tower (a dash list at column 0 was skipped, and ids were read inside link file names), a `parent:` in single quotes was not read, the notes were read as they are today rather than at the fixture's commit, and TST-0094 still passed with every tower empty or the focus lost. All five are fixed; TST-0094 now checks that a task stands in its parent's tower, the two parsing cases, and Deck's focus against its snapshot at the fixture's commit. 789 node tests pass.

2026-10-14: DES-0005 is `proposed`, with fourteen plates (each screen on Deck and on your-trainer) and the prototype page, all generated by `node desktop/scripts/overview-plates.mjs` from the screen code. Words at rest per plate: 5 to 37, against a limit of 60 (5 to 44 since the revisions of 2026-10-15). TASK-0130 is done.

## Where this stands

**Back at `review` on 2026-10-22, later.** Pictures now stand at their own tickets, sized by how near they are to the work ([[TASK-0179]], reviewed in two rounds).

**Back to `doing` on 2026-10-22.** Edwin found the ring of evidence pictures wrong: further out on the towers should mean further from the work, and the pictures of the work in hand stood furthest out. [[TASK-0179]] stands each picture at its own ticket instead.

**Back at `review` on 2026-10-21, night.** All seven of Rubric's ideas are drawn on the towers page and reviewed ([[TASK-0176]], [[TASK-0177]]). DES-0005 asks Edwin whether to build them into Deck. Edwin's separate question about the cockpit's agent terminals, Needs you and overview panels is answered with a proposal for [[PHASE-0004-Parity]]; it waits on his decisions.

**Back to `doing` on 2026-10-21, late, for the other four of Rubric's ideas.** Edwin liked the first three ("Looks great, can we continue with the next set of features?"); the needs-you panel, grouping by feature, age badges with a ring of recent evidence, and the year as weeks are drawn on the towers page in [[TASK-0177]].

**Back at `review` on 2026-10-21, evening.** The three ideas are drawn on the towers page and reviewed in two rounds ([[TASK-0176]]); Edwin is asked in DES-0005 whether to build them into Deck. The other four wait in [[TASK-0177]].

**Back to `doing` on 2026-10-21, for ideas taken from Rubric's dashboard.** Edwin asked for Rubric, a dashboard for AI agents, to be reviewed for ways of showing data that Deck could use. The review is [[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]]. Edwin agreed with all seven of its suggestions and asked for three first: a selected ticket's links drawn as curves with its card and text, search that lights the towers, and a next-up board. They are drawn on the towers page in [[TASK-0176]]; the other four wait in [[TASK-0177]]. Deck itself is not changed until Edwin has tried the page.

**Back to `doing` on 2026-10-16, to build the towers into Deck.** Edwin liked DES-0005's towers page and asked for it to be implemented as suggested, with a different design for the exit criteria and the red caps made pressable ([[TASK-0164]] to [[TASK-0169]]).

**Back to `doing` on 2026-10-16, for a third design round.** Edwin found the disc flat, the turn going against the mouse, the way back hard to find, and the phase screen's web not working. He chose towers on the ring, grouped by phase, drawn in three.js first ([[TASK-0163]]). Deck's camera is fixed under FEAT-0027 ([[TASK-0162]]).

**Back to `doing` on 2026-10-15 (second revision), because Edwin ran the overview again and approved six changes.** He prefers the re-phase screen to the wheel, asked for more depth with mouse turning and zoom, said the gate's five boxes look wrong, wants the feature's text beside Accept and Send back, and wants a ticket that needs him to say what to do. The approved plan is DES-0005's revision of 2026-10-15 (second). The move from `review` back to `doing` is the same one the first revision made, because new work is added inside the feature. The paragraphs below it describe the state before this revision.

New work: [[TASK-0157]] (Claude) draws a real 3D wheel where height is time, as a design page with pictures for Edwin to judge; nothing enters `desktop/`. It can start at once. [[TASK-0161]] (Claude) redraws every plate once the screens have changed; it waits on every other task of the revision.

**Back to `doing` on 2026-10-15, because Edwin ran the overview and asked for changes.** He liked much of it, and asked for the cockpit's ticket colours and status marks on every screen, tickets drawn as cockpit rows, more of a ticket on its own screen, and back and forward buttons. The agreed plan is DES-0005's revision of 2026-10-15. The move is from `review` back to `doing`, which STATUSES.md does not list as a typical transition; it is used because new work is added inside the feature, as FEAT-0005 and FEAT-0006 were reopened before. The review rounds below are for the build of 2026-10-14. The new tasks get their own review by the other model before the feature goes back to `review`.

New work: [[TASK-0150]] (Claude) redraws every plate once the screens have changed, with the wheel in both colourings, and revises DES-0005, which stays `proposed`. It waits on every other task of the run.

2026-10-14: built and at review. Codex reviews it, as the agent that did not build it. Edwin's verdict on DES-0005 is the acceptance, given through the cockpit's Accept or Decline on the note, or in Deck's S5 once FEAT-0029 is accepted.

2026-10-15, later: the revision is built, tested and reviewed across models in two rounds. Every task of the revision is done (TASK-0144 to TASK-0151). The node suites pass (777 tests) and the window run TST-0093 passed on both workspaces. The feature goes back to `review`: what is left is Edwin's acceptance tests and his decisions on DES-0005.

2026-10-15, last: the second revision is built (by Claude alone after Codex stopped), reviewed in two rounds by two independent Claude reviewers, and verified: 789 node tests pass, and the window run TST-0093 passed on Deck and your-trainer at `20c4f35`. Back at `review`; what is left is Edwin's acceptance tests and his decisions on DES-0005.

## Review

### Round one

2026-10-14: one Codex reviewer (GPT-6 Astra), in a clean worktree, reviewed the packet. Codex reviewed it because Claude built it. Verdict: changes requested. Held: the fourteen plates reproduce byte for byte, the word counts agree three ways, every reference is local, and the four answers are proposed. Refuted: two plates had no caption (Deck's S4 and your-trainer's S7); the Revisions line did not say what Edwin decides; the scope still said the tickets came from DES-0004 and that nothing in `desktop/` changes; the page could not be navigated from the wheel; and no test failed when three screens were removed from the plate script or when every mark was lost.

Fixed in `57c2e3d`: both captions, the Revisions line, the scope rewritten to what was built, the page following a press on a mark, and [[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]], which fails on a missing plate or lost marks.

### Round two

2026-10-14: one Codex reviewer (GPT-6 Astra), round two. Fixed: both captions, the Revisions line, the scope, and both test gaps (removing three screens or every mark now fails TST-0094). Partly fixed: the prototype followed a press on a mark with an address, but not on a ticket, so the design, release-test and gate screens could not be reached from the wheel's marks. Verdict: changes requested. Fixed after it in `d844e5e`: a press on a ticket opens the screen Deck opens next for its kind. A review gate runs two rounds at most, so no third round was run; the verdict stays the reviewer's.

### Third revision, round one (towers on the ring, TASK-0163)

2026-10-16: two independent Claude reviewers, each in its own worktree, reviewed `4d3a67f`. Both requested changes. Held: every ticket of both fixtures is on the towers page once, the page reproduces byte for byte, and the focus matches each snapshot at the fixture's commit.

1. A `tests:` list whose dash lines start at column 0 was skipped, so TST-0086 lay flat instead of standing in FEAT-0029's tower (both).
2. Ids were read inside link file names, so `[[TST-0094-DES-0005s-...]]` made DES-0005 a floor of FEAT-0025 (one reviewer).
3. A `parent:` written in single quotes was not read (one reviewer).
4. The notes were read as they are today, while the focus was read at the fixture's commit, so the two could disagree; and either one falling back did so silently (both).
5. TST-0094 still passed with every tower empty or the focus lost; one of its assertions checked a field that never exists (both).

Also noted: a ticket that several features name stands in the lowest-numbered one's tower, which was not stated; and your-trainer's "next" comes from the fallback, since its snapshot names no task.

Fixed in `b9e61bb`: dash lists at column 0 and single-quoted parents are read; only a link's leading id counts; the notes are read at the fixture's commit (for a fixture taken with uncommitted notes, a note the commit lacks from today's file), and a fallback is printed and recorded on the page. TST-0094 now checks that a task stands in its parent's tower, both parsing cases, and Deck's focus against its snapshot at the fixture's commit; breaking each of the four guards makes it fail. DES-0005 states the lowest-numbered rule and the fallback for "next".

### Third revision, round two

2026-10-16: two independent Claude reviewers, each in its own worktree on `main`, checked the five findings. Both approve: each fix was shown by reverting it and watching TST-0094 fail (dash lists at column 0, ids inside link names, notes read at the fixture's commit, empty towers, a lost focus). Both noted that nothing failed when the single-quoted `parent:` rule was reverted, because FEAT-0029's own `tasks:` list names the same tasks. The note parsing moved into `desktop/scripts/overview-towers-notes.mjs` (`9421c50`) and TST-0094 now tests it on small notes of its own, single quotes included; reverting the rule makes it fail.

### Fourth revision, round one (links, search and next up, TASK-0176)

2026-10-21: two independent Claude reviewers, each in its own worktree on `main` at `2a34949`; one checked the data and the tests, the other drove the page in hidden windows. Both requested changes. Held: every link of the fixture is on the page both ways and no other; notes, owners and dates are read at the fixture's commit; DES-0005's counts for TASK-0156 and FEAT-0124 are right; repeated selections and searches leave nothing behind; dimming comes back fully after Clear, Escape, a workspace switch and a phase opened and closed; Deck itself is unchanged.

1. TST-0094 failed without your-trainer beside Deck, which is CI's case (both).
2. The board's checks let three breaks through (the wrong done rows, the hidden count, every row "queued"), and its foot called seven in-progress tasks "queued" (A).
3. Only 60 links were drawn, cutting 18 of your-trainer's tickets, and DES-0005 said a few came close (A).
4. Search matched inside words (A); first paragraphs kept checklist boxes, ran numbered steps together, stopped at "Reproducible by:", dropped plain quotes and missed `~~~` fences (A); the board's empty message was wrong when the focus feature is not on the ring (A); cancelled tasks counted in its total (A).
5. With a phase close, search and selection marked tickets that were hidden (B); pressing a phase while a ticket was selected left it dimmed under the old links (B); a search replaced a selection unannounced (B); under reduced motion the focus glow stayed bright under a selection (B).

All fixed, as listed in [[TASK-0176]]'s Review section.

### Fourth revision, round two

2026-10-21: two fresh independent Claude reviewers on `a101bb5`, each in its own worktree. Both approve. The page reviewer showed all five page fixes with real presses and keys in hidden windows, and found nothing that held in round one had regressed; its three small notes (a search match in another phase left the camera on a phase drawn almost invisible, the search list ran under the right pane, a red cap replacing a selection was unstated) were fixed in `3e964d4`. The data reviewer broke each fix 21 ways, with and without your-trainer, and every one it could reach failed TST-0094; it noted that CI, with only Deck's board, could not check the board's words and counts, so the board's rules became a function tested on rows of their own (`78b220b`).

### Fifth revision, round one (needs you, grouping, ages, evidence and weeks, TASK-0177)

2026-10-21: two independent Claude reviewers on `e392180`. Both requested changes; every count held. The data reviewer found that TST-0094 let four breaks through, because the ages, badges, weeks and panel counts were worked out only in the page, and that the `evidence:` field was ignored. The page reviewer found the header covering the card at 1100 wide, a needs-you press opening the search list over the bar, graphics memory growing with each regroup, evidence pictures off-screen and swallowing the wheel, and phase words left in the feature grouping. All fixed in `f6ad457` and `8a5fb90`, as listed in [[TASK-0177]]'s Review section.

### Fifth revision, round two

2026-10-21: two fresh independent Claude reviewers on `e0c9a91`. The data reviewer approved: the four breaks now fail TST-0094 with and without your-trainer, and the evidence ties and DES-0005's numbers hold; its small notes were fixed in `e26fb59`. The page reviewer requested changes on two fixes: the panels' top followed the header only on a window resize, so a wheel turn at 1100 wide brought the overlap back, and regrouping still kept the instanced meshes' own buffers. Both were fixed in `e26fb59` and checked in hidden-window drives (header 97 px, card from 103 px; 498 buffers before and after 40 regroups). A gate runs two rounds at most; the verdict stays the reviewer's.

### Sixth revision (designs at their own tickets, TASK-0179)

2026-10-22: two rounds, two independent Claude reviewers each. Round one: the data reviewer found the design of the work in hand still stood a size smaller than it should (a design now stands with the feature in focus when that feature names it) and that CI checked no picture; the page reviewer found distance outweighing nearness on your-trainer, so finished work's pictures came out largest. Fixed in `68630f7` and `dc09b75`. Round two: page approve; data changes requested on a check that failed in a shallow clone and two untested parts of the rule, fixed in `3892418`. Details in [[TASK-0179]]'s Review section.

## Questions between the lanes

None yet. Write a question here, dated, and land it on `main`; the other agent answers under it.

### Round one of the 2026-10-15 revision

2026-10-15: Codex (GPT-6 Astra) reviewed the drawing lane of the 2026-10-15 revision from a clean session, in a detached worktree at `b866405`. Codex reviewed it because Claude built it. Verdict: **changes-requested**, ten findings across TASK-0145 to TASK-0148 and TASK-0150. Claude fixed them in `1476b06` and, for the gate counts, after Codex's fixes merged.

- **The S2 plate said it drew 172 tickets while drawing 34, and lost the closed strip** (P2). Fixed: a flat panel keeps room for every section, the manifest counts what the SVG draws, and the plate test requires each section to draw at least one ticket.
- **The design page had no back and forward** (P2). Fixed: it has both, with ⌘[ and ⌘], and the test runs the page's script.

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
