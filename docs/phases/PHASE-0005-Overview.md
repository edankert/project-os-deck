---
type: "[[phase]]"
id: PHASE-0005
aliases: ["PHASE-0005"]
title: "Overview — Deck opens on a wheel of the project's phases, and every screen behind it shows progress as a picture, including the screens where a design, an acceptance test and a ticket are accepted"
status: active
order: 5
owner: user:edwin
created: 2026-10-14
updated: 2026-10-22
goal: "Deck opens on the circular overview, a wheel with one segment of its ring per unfinished phase and one particle per ticket (a wedge per ticket until the second revision of 2026-10-15). Every screen reached from it, including accepting a design, running an acceptance test and accepting a feature, shows status and progress as diagrams and images rather than lists of text."
features: ["[[FEAT-0025]]", "[[FEAT-0026]]", "[[FEAT-0027]]", "[[FEAT-0028]]", "[[FEAT-0029]]", "[[FEAT-0031]]", "[[FEAT-0036]]"]
requirements: []
tasks: ["[[TASK-0125]]", "[[TASK-0126]]", "[[TASK-0127]]", "[[TASK-0128]]", "[[TASK-0129]]", "[[TASK-0130]]", "[[TASK-0131]]", "[[TASK-0115]]", "[[TASK-0116]]", "[[TASK-0117]]", "[[TASK-0118]]", "[[TASK-0119]]", "[[TASK-0140]]", "[[TASK-0120]]", "[[TASK-0121]]", "[[TASK-0122]]", "[[TASK-0123]]", "[[TASK-0141]]", "[[TASK-0142]]", "[[TASK-0143]]", "[[TASK-0144]]", "[[TASK-0145]]", "[[TASK-0146]]", "[[TASK-0147]]", "[[TASK-0148]]", "[[TASK-0149]]", "[[TASK-0150]]", "[[TASK-0151]]", "[[TASK-0152]]", "[[TASK-0153]]", "[[TASK-0154]]", "[[TASK-0155]]", "[[TASK-0156]]", "[[TASK-0157]]", "[[TASK-0158]]", "[[TASK-0159]]", "[[TASK-0160]]", "[[TASK-0161]]", "[[TASK-0162]]", "[[TASK-0163]]", "[[TASK-0164]]", "[[TASK-0165]]", "[[TASK-0166]]", "[[TASK-0167]]", "[[TASK-0168]]", "[[TASK-0169]]", "[[TASK-0176]]", "[[TASK-0177]]", "[[TASK-0179]]", "[[TASK-0181]]", "[[TASK-0182]]", "[[TASK-0183]]", "[[TASK-0184]]", "[[TASK-0185]]", "[[TASK-0186]]", "[[TASK-0187]]", "[[TASK-0189]]", "[[TASK-0190]]", "[[TASK-0213]]", "[[TASK-0214]]", "[[TASK-0215]]", "[[TASK-0216]]", "[[TASK-0217]]"]
issues: []
depends: ["[[PHASE-0001-Deck]]"]
related: ["[[DES-0004-The-Phase-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]", "[[PHASE-0004-Parity]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]", "[[REFERENCE-COCKPIT-ADOPTION]]"]
tags: [phase, overview, glass, acceptance]
---

# Overview

## Goal

**Deck opens on one picture of the whole project: a wheel with a segment of its ring for each phase still to finish, and a particle for every ticket in it.** From the wheel you open a phase, then a ticket, and from a ticket you accept it. Each of those screens shows where things stand with shapes, rings, colours and images. Text appears when you point at something, not before.

This phase replaces the Glass screens Edwin rejected on 2026-10-14 as "too text heavy" and not like Minority Report. Those screens were cards with titles on them (DES-0004, plates 6 and 7). Here the same tickets are drawn as marks, the way DES-0004's wheel already draws them.

The work is shared by two agents: Claude Opus in Claude Code, and GPT-6 Astra in OpenAI Codex. How they split it, and how they avoid colliding, is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]. Both read this note first.

## The screens

There are seven screens. [[DES-0005-The-Overview-Is-Drawn-Not-Written]] draws each one; the table says what each must answer at a glance.

| # | Screen | What it answers at a glance | The main picture |
| --- | --- | --- | --- |
| S1 | **Wheel** (the overview) | How far is each phase, and where is the trouble? A constellation, laid out like S4: a segment of the outer ring per unfinished phase, its tickets fanned inward as particles (done near the ring, open further in, needs-you glowing at the front), a bubble counting what needs you per phase, wires to linked tickets on pointing. Finished phases orbit below as discs on a shelf; the backlog is an arc tray; tickets with no phase sit in the core, which opens S4 (revised 2026-10-15, second revision; until then DES-0004's RINGS wheel of sectors and wedges). |
| S2 | **Phase** | What does this phase still owe, and what kind of work is it? | The phase's web (one corner per ticket type, defined against closed), its exit criteria as a segmented ring, and its tickets as cockpit rows on a plane tilted in depth: needs you in front, open and in progress in the middle, closed folded at the back (revised 2026-10-15; until then a field of glyphs in depth bands). |
| S3 | **Ticket** | Where is this ticket in its life, and what is it joined to? | The ticket's id, title and lifecycle track, its full text, its linked tickets as cockpit rows split into "links to" and "linked from", for a feature its gate as a small arch, and for a ticket that needs you a banner saying what to do (revised 2026-10-15; until then a radial graph of neighbours). |
| S4 | **Re-phase** | Which tickets have no phase, and where would they go? | Tickets as particles in the core, with a line to the sector each is suggested for. Accepting a group moves its particles. |
| S5 | **Design acceptance** | What does this design propose, and has it been reviewed? | The design's plates as large images, a strip of its revisions, review comments as pins on the plate they name. Accept and Decline as two large controls. |
| S6 | **Acceptance test** | How far is this release's test, per platform, and what changed on screen? | One ring per platform, an arc per section, a bead per check coloured by result. A check opens as a before-and-after image pair with one Pass and one Fail control. |
| S7 | **Ticket acceptance** | Is this feature ready to accept? The feature's text beside a gate drawn as an arch of five segments (lamps, then labelled chips, until the second revision of 2026-10-15): requirements met, tasks done, independent reviews recorded, automated tests passing, acceptance tests passed. The feature can be accepted only when every segment is full, or sent back with a reason. |

## The look

These rules apply to every screen. Each one is a check a reviewer can run.

1. **A picture before words.** At rest, with nothing pointed at, a screen shows at most 60 visible words, not counting ticket ids. Titles, status words and explanations appear on hover, on keyboard focus or in the callout of a selected mark. **A list of tickets drawn as rows is exempt** (from 2026-10-15): S2's tickets and S3's linked tickets are rows with an id, a title and a status word each, as in the cockpit, and their words do not count. Everything else on the screen still does.
2. **Every number is also a mark.** A count on screen sits next to, or inside, a drawing of the same count: a ring, a bar, a set of beads. A number alone is a defect.
3. **Colour is the ticket's type; how its mark is filled is its state** (from 2026-10-15, replacing "colour is state"). The colours are the cockpit's `--type-*` colours. The fills are the cockpit's marks: filled is done, hollow is not started, inverted and pulsing is in progress, inverted and still is "complete, not proven", solid with a slit is "resolved, nothing delivered", hollow with a strike is "parked", and a corner dot is "needs you". The fill and the dot follow the cockpit's sidecar rules, and the words are the cockpit's. What needs a person stands in front; what is finished recedes. The wheel alone is also drawn in state colour (DES-0004's closed, in progress, failed, open, dropped), and Edwin chooses which one it opens in.
4. **The Glass look.** A dark field with depth. Lines and marks glow. Panels are translucent without blur (the DES-0002 review measured blur as the cost). Moving between screens animates the same marks to their new places, and honours reduced motion.
5. **Every screen has an address**, and a list twin. The address restores the screen. The list twin shows the same marks as rows for the keyboard and a screen reader, because a picture cannot be the only way in.
6. **Real data at real size.** Every screen is checked on Deck (5 phases, 395 tickets) and your-trainer (27 phases, 2,747 tickets). A screen that only works on the small one is not done.
7. **The pictures stand in depth and the person can move them** (from 2026-10-15, second revision). The wheel, S2's list of tickets and the ring screens S4 and S6 stand on a plane tilted away, drawn with CSS 3D on the existing SVG and HTML. The middle mouse button and a drag turns the plane, Shift with the middle button pans it, the scroll wheel zooms toward the pointer, and a double-click resets it. Under reduced motion nothing moves except by the person's own drag. Text stays crisp at every zoom, a press lands on the mark under the pointer, and checks 1, 2 and 5 hold unchanged because only the camera moves. A real 3D scene (WebGL) is not part of Deck; it is drawn as a design plate first ([[TASK-0157]]).
8. **A ticket that needs you says what to do** (from 2026-10-15, second revision). The red dot is never the only signal: the callout, S2's row and S3's banner say why, in the cockpit's terms, and offer the one action that answers it.

## The three acceptance flows

**The overview is also where a person accepts work.** Three kinds of acceptance exist in project-os, and each gets a screen. All three write through the cockpit's sidecar, behind its guards; Deck adds no write path. Each verdict is a person's: the sidecar refuses it from an agent, and an agent never records one by any other route.

- **A design is accepted** (S5). Today a design's Accept and Decline are on the note in the cockpit (`/api/notes/decide`). In Deck the person sees the plates first and accepts from them.
- **An acceptance test is run** (S6). Today this is the cockpit's release test page (`shell.pages.release-test`), which writes through `/api/notes/mark-check`. In Deck the checks are beads on a ring and a check shows its before-and-after pictures.
- **A ticket is accepted** (S7). Today a feature reaches `done` through a transition and, where it opted in, an acceptance run (`shell.pages.accept`, `/api/notes/transition`, `/api/notes/acceptance-run`). In Deck the gate shows what is missing as unlit lamps.

These are rows [[PHASE-0004-Parity]] planned to adopt. This phase adopts them early, for these three flows only; [[REFERENCE-COCKPIT-ADOPTION]] records each row as it is adopted.

**This phase uses the same three flows on its own work.** DES-0005 is accepted by Edwin before the screens are built. Each feature gets acceptance tests that Edwin runs. Each feature is reviewed by the agent that did not build it, then accepted by Edwin. Until S5 to S7 exist in Deck, those steps happen in the cockpit.

## Scope

- [[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]: DES-0005, its interactive prototype and one plate per screen. Lane: Claude.
- [[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]: the overview model, computed from Deck's index by DES-0004's rules, and the checks every screen is held to (word count, address, list twin). Lane: Codex.
- [[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]: S1, the wheel with its shelf, tray and core, as Deck's first view. Lane: Claude.
- [[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]: S2, S3 and S4. Lane: Claude.
- [[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]: S5, S6 and S7, with the sidecar reads and writes they need. Lane: Codex.
- [[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]: the seven ideas from Rubric that DES-0005's towers page draws, built into Deck's towers (Edwin, 2026-10-22). Lane: Claude.

## Out of scope

- **The card field of PHASE-0002.** Glass's bands, desks and scenes stay as they are; this phase does not repair or extend them. Its look (depth, glow, translucency) is what carries over.
- **New write paths.** Re-phasing (S4) shows suggestions and moves them on screen. Writing `phase:` into a note needs a sidecar action the cockpit does not have; asking for it is a task in FEAT-0028, building it is the cockpit's.
- **The tablet layout.** The served host shows the wheel read-only; the acceptance screens are desktop only.
- **Forecasts.** The overview shows state and what has happened, never a prediction. Two dates are in since 2026-10-22, when Edwin asked for TASK-0177's ideas to be built (FEAT-0031): a tower's age since its last change, and the tickets closed each week. DES-0004 had put all dates out of scope.

## Exit Criteria

- [ ] DES-0005 is accepted by Edwin, with one plate per screen S1 to S7, drawn from Deck's and your-trainer's real tickets.
- [x] Deck opens on the wheel for both workspaces. Every ticket the overview model returns is drawn exactly once, and the counts on screen equal the model's counts (automated). Evidence: TST-0090 on both fixtures; TST-0093's window run on 2026-10-14 drew 377 of 377 tickets on Deck and 2,747 of 2,747 on your-trainer.
- [x] Every screen S1 to S7 passes the look's checks 1, 2 and 5: at most 60 words at rest, no number without a mark, an address that restores it and a list twin (automated, on both workspaces). Evidence: `checkScene` in TST-0090 (S1 to S4) and the overview-flows suite (S5 to S7) on both workspaces, and TST-0094 on every plate; words at rest range from 5 to 37.
- [x] From the wheel, a phase, a ticket, a design, a release test check and a feature gate are each reached in at most two clicks, and by keyboard alone. Evidence: a sector opens its phase and a wedge its ticket (one click; TST-0093); on a ticket's screen its glyph opens its design, release test or gate (two clicks), and an owed-again badge opens the release test in one. Tab reaches every sector, disc and control, and the arrow keys and Enter reach and open all 361 and 2,747 tickets (Codex's round-two review of FEAT-0027).
- [ ] Edwin accepts a design in S5, records a Pass and a Fail in S6 and accepts a feature in S7, and each verdict appears in the cockpit. The same verbs from an agent session are refused.
- [x] Each feature has an independent review by the agent that did not build it, recorded on the feature. Evidence: two rounds each, Claude reviewing FEAT-0026 and FEAT-0029, Codex (GPT-6 Astra) reviewing FEAT-0025, FEAT-0027 and FEAT-0028; verdicts and fixes are under each feature's Review.
- [ ] Edwin's acceptance tests for each feature pass, including whether the screens read as pictures rather than text.

## Notes

- **Order.** `order: 5` only because the field cannot repeat. Edwin set Glass aside on 2026-10-08 to get the overview right first (DES-0004), so this phase is worked next. He set it `active` on 2026-10-14. Moving it in [PHASES.md](../PHASES.md) is his call.
- **Open questions carried from DES-0004.** How a backlog phase is marked (an id ending in 999, or `kind: backlog`); whether an open risk is amber; whether accepting a re-phase suggestion should write. The design lane proposes an answer to each in DES-0005, and Edwin decides when he accepts it.
- **Depends on PHASE-0001** for the store, the addresses, the view provider and Deck's index. It does not depend on PHASE-0002's unfinished work.

## Where this stands

**2026-10-15, second revision: the phase is being reworked again after Edwin ran the overview a second time.** He prefers the re-phase screen to the wheel, asked for more depth with mouse turning and zoom, said the gate's five boxes look wrong, wants the feature's text beside Accept and Send back, and wants a ticket that needs him to say what to do. He approved six recommendations, recorded in DES-0005's revision of 2026-10-15 (second). All five features moved from `review` back to `doing`. The look gains rules 7 and 8.

Nine tasks carry it, in the same two lanes. Each lane's work is reviewed by the other model, in two rounds at most.

| Task | Lane | Feature | Waits on |
| --- | --- | --- | --- |
| [[TASK-0153]] Every ticket that needs you says why, what to do and where | Codex | FEAT-0026 | nothing; first (contract proposal to agree first) |
| [[TASK-0154]] The feature's gate is an arch of five segments, one component for S3 and S7 | Claude | FEAT-0028 | nothing; first (Codex agrees to the module move first) |
| [[TASK-0155]] The wheel becomes a constellation | Claude | FEAT-0027 | nothing |
| [[TASK-0156]] The overview stands in 3D, and turns, pans and zooms | Claude | FEAT-0027 | TASK-0155 |
| [[TASK-0157]] A 3D wheel where height is time, drawn as a plate to judge | Claude | FEAT-0025 | nothing |
| [[TASK-0158]] A phase and a ticket say what you need to do | Claude | FEAT-0028 | TASK-0153 |
| [[TASK-0159]] S7 shows the feature's text, and its gate as the arch | Codex | FEAT-0029 | TASK-0154 |
| [[TASK-0160]] An issue at triage is decided from its ticket screen | Codex | FEAT-0029 | TASK-0153, TASK-0158 |
| [[TASK-0161]] DES-0005's plates redrawn for the second revision | Claude | FEAT-0025 | all of the above |

No new test note. The node suites TST-0080, TST-0082, TST-0085, TST-0087, TST-0090 and TST-0094 and the window run TST-0093 take the new checks; Edwin's TST-0091, TST-0092 and TST-0100 have new steps. The exit criterion on reaching every screen in two clicks is run again once the constellation replaces the wedges.

Risk scan for the second revision: no trigger applies, so no risk note is added. The one to judge was three.js. It is loaded from cdnjs at a pinned version by one design page under `docs/designs/` ([[TASK-0157]]); it is not added to `desktop/package.json`, no Deck code imports it, and the page's captured pictures keep the plate readable without the network. CSS 3D in TASK-0156 adds no library, no environment variable, no new path and no long-running step. If Edwin decides to build the Level 2 wheel into Deck, that is a new dependency and gets a risk note then.

What follows is the state before the second revision.

**2026-10-15: the phase is being reworked after Edwin ran the overview.** He liked much of it and asked for five changes: the cockpit's ticket colours and status marks everywhere, S2's tickets as cockpit rows on a tilted plane, S3 showing the ticket's text and linked tickets, labelled chips instead of the round gate lamps, and back and forward buttons. The agreed plan is DES-0005's revision of 2026-10-15. All five features moved from `review` back to `doing`.

Seven tasks carry it, in two lanes as before:

| Task | Lane | Feature | Waits on |
| --- | --- | --- | --- |
| [[TASK-0144]] Every ticket carries the cockpit's fill and needs-you flag | Codex | FEAT-0026 | nothing; first |
| [[TASK-0145]] Every screen marks a ticket in the cockpit's colour and fill; the wheel both ways | Claude | FEAT-0027 | TASK-0144 |
| [[TASK-0146]] Back and forward retrace the overview screens | Claude | FEAT-0027 | nothing |
| [[TASK-0147]] A phase lists its tickets as cockpit rows on a tilted plane | Claude | FEAT-0028 | TASK-0144, TASK-0145 |
| [[TASK-0148]] A ticket opens with its text and linked tickets as rows, and chips | Claude | FEAT-0028 | TASK-0144, TASK-0145, TASK-0149 |
| [[TASK-0149]] The feature gate shows labelled chips; S5 and S6 in the new marks | Codex | FEAT-0029 | TASK-0144, TASK-0145 |
| [[TASK-0150]] DES-0005's plates redrawn, the wheel in both colourings | Claude | FEAT-0025 | all of the above |

No new test note: the node suites `overview-model` (TST-0080), `overview-checks` (TST-0083), `overview-flows` (TST-0085) and `overview-screens` (TST-0090) and the window run TST-0093 hold the new checks, including back and forward. Edwin's TST-0091 and TST-0092 are rewritten for the new screens. The four exit criteria ticked on 2026-10-14 stay ticked; they are run again before the features return to `review`.

What follows is the state at the end of the first build, on 2026-10-14; the three decisions in it are still Edwin's.

2026-10-14, end of the build run: every feature is built, tested and reviewed twice by the other agent, and at `review`. The full suite passes (752 tests on the last run), and the window run passes on Deck and your-trainer. Four of the seven exit criteria are ticked with evidence. The three left are Edwin's:

1. **Accept or decline DES-0005**, in the cockpit or in Deck's S5.
2. **Run the acceptance tests**: TST-0091 and TST-0092 (the drawing lane), and TST-0088, TST-0089 and TST-0100 (the three flows). They include the step where an agent tries a verdict and is refused.
3. **Decide three narrowings**: FEAT-0029's criteria narrowed to what the cockpit's sidecar allows (it moves no feature out of review and refuses an agent only on `acceptance-run`); FEAT-0026's your-trainer fixture, captured from a working tree with another session's uncommitted notes; the three cockpit gaps are filed there at triage on 2026-10-15: [[project-os-cockpit#ISS-0323]], [[project-os-cockpit#ISS-0324]] and [[project-os-cockpit#ISS-0325]].

**What the cockpit owes Deck** is filed as [[project-os-cockpit#ISS-0323]] (person-only feature transitions), [[project-os-cockpit#ISS-0324]] (agent refusal on `decide` and `mark-check`) and [[project-os-cockpit#ISS-0325]] (a guarded write that sets `phase:`). When the first two land, FEAT-0029's narrowed criteria can be restored.

2026-10-15, later: **Edwin: "codex is no longer working, only use claude from now on."** Codex now signs in with a ChatGPT account, which does not offer GPT-6 Astra, so it cannot run. Claude takes over every Codex task (TASK-0153, TASK-0159, TASK-0160 move to `system:claude`), the proposals between the lanes are decided by Claude, and two independent Claude reviewers, each in a clean context, replace Codex's cross-model review.

