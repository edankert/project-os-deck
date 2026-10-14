---
type: "[[phase]]"
id: PHASE-0005
aliases: ["PHASE-0005"]
title: "Overview — Deck opens on a wheel of the project's phases, and every screen behind it shows progress as a picture, including the screens where a design, an acceptance test and a ticket are accepted"
status: active
order: 5
owner: user:edwin
created: 2026-10-14
updated: 2026-10-14
goal: "Deck opens on the circular overview, a wheel with one sector per unfinished phase and one wedge per ticket. Every screen reached from it, including accepting a design, running an acceptance test and accepting a feature, shows status and progress as diagrams and images rather than lists of text."
features: ["[[FEAT-0025]]", "[[FEAT-0026]]", "[[FEAT-0027]]", "[[FEAT-0028]]", "[[FEAT-0029]]"]
requirements: []
tasks: ["[[TASK-0125]]", "[[TASK-0126]]", "[[TASK-0127]]", "[[TASK-0128]]", "[[TASK-0129]]", "[[TASK-0130]]", "[[TASK-0131]]", "[[TASK-0115]]", "[[TASK-0116]]", "[[TASK-0117]]", "[[TASK-0118]]", "[[TASK-0119]]", "[[TASK-0140]]", "[[TASK-0120]]", "[[TASK-0121]]", "[[TASK-0122]]", "[[TASK-0123]]"]
issues: []
depends: ["[[PHASE-0001-Deck]]"]
related: ["[[DES-0004-The-Phase-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]", "[[PHASE-0004-Parity]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]", "[[REFERENCE-COCKPIT-ADOPTION]]"]
tags: [phase, overview, glass, acceptance]
---

# Overview

## Goal

**Deck opens on one picture of the whole project: a wheel with a sector for each phase still to finish, and a wedge for every ticket in it.** From the wheel you open a phase, then a ticket, and from a ticket you accept it. Each of those screens shows where things stand with shapes, rings, colours and images. Text appears when you point at something, not before.

This phase replaces the Glass screens Edwin rejected on 2026-10-14 as "too text heavy" and not like Minority Report. Those screens were cards with titles on them (DES-0004, plates 6 and 7). Here the same tickets are drawn as marks, the way DES-0004's wheel already draws them.

The work is shared by two agents: Claude Opus in Claude Code, and GPT-6 Astra in OpenAI Codex. How they split it, and how they avoid colliding, is in [[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]. Both read this note first.

## The screens

There are seven screens. [[DES-0005-The-Overview-Is-Drawn-Not-Written]] draws each one; the table says what each must answer at a glance.

| # | Screen | What it answers at a glance | The main picture |
| --- | --- | --- | --- |
| S1 | **Wheel** (the overview) | How far is each phase, and where is the trouble? | DES-0004's RINGS wheel: a sector per unfinished phase, a ring per ticket type, a wedge per ticket coloured by state. Finished phases orbit below as discs on a shelf; the backlog is an arc tray; tickets with no phase sit in the core. |
| S2 | **Phase** | What does this phase still owe, and what kind of work is it? | The phase's web (one corner per ticket type, defined against closed), its exit criteria as a segmented ring, and its open tickets as a field of glyphs in depth bands: failed and owed-again in front, open in the middle, closed far back. |
| S3 | **Ticket** | Where is this ticket in its life, and what is it joined to? | A lifecycle track with the ticket's position on it, and its neighbours as a radial graph coloured by state. |
| S4 | **Re-phase** | Which tickets have no phase, and where would they go? | Tickets as particles in the core, with a line to the sector each is suggested for. Accepting a group moves its particles. |
| S5 | **Design acceptance** | What does this design propose, and has it been reviewed? | The design's plates as large images, a strip of its revisions, review comments as pins on the plate they name. Accept and Decline as two large controls. |
| S6 | **Acceptance test** | How far is this release's test, per platform, and what changed on screen? | One ring per platform, an arc per section, a bead per check coloured by result. A check opens as a before-and-after image pair with one Pass and one Fail control. |
| S7 | **Ticket acceptance** | Is this feature ready to accept? | A gate of lamps: requirements met, tasks done, automated tests passing, acceptance tests passed, independent reviews recorded. The feature can be accepted only when every lamp is lit, or sent back with a reason. |

## The look

These rules apply to every screen. Each one is a check a reviewer can run.

1. **A picture before words.** At rest, with nothing pointed at, a screen shows at most 60 visible words, not counting ticket ids. Titles, status words and explanations appear on hover, on keyboard focus or in the callout of a selected mark.
2. **Every number is also a mark.** A count on screen sits next to, or inside, a drawing of the same count: a ring, a bar, a set of beads. A number alone is a defect.
3. **State is colour and place, never only a word.** The states and their colours are DES-0004's: closed, in progress, failed, owed again, open, dropped. What needs a person stands in front or glows; what is finished recedes.
4. **The Glass look.** A dark field with depth. Lines and marks glow. Panels are translucent without blur (the DES-0002 review measured blur as the cost). Moving between screens animates the same marks to their new places, and honours reduced motion.
5. **Every screen has an address**, and a list twin. The address restores the screen. The list twin shows the same marks as rows for the keyboard and a screen reader, because a picture cannot be the only way in.
6. **Real data at real size.** Every screen is checked on Deck (4 phases, 333 tickets) and your-trainer (27 phases, 2,646 tickets). A screen that only works on the small one is not done.

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

## Out of scope

- **The card field of PHASE-0002.** Glass's bands, desks and scenes stay as they are; this phase does not repair or extend them. Its look (depth, glow, translucency) is what carries over.
- **New write paths.** Re-phasing (S4) shows suggestions and moves them on screen. Writing `phase:` into a note needs a sidecar action the cockpit does not have; asking for it is a task in FEAT-0028, building it is the cockpit's.
- **The tablet layout.** The served host shows the wheel read-only; the acceptance screens are desktop only.
- **Dates and forecasts.** The overview shows state, not time (DES-0004, Out of scope).

## Exit Criteria

- [ ] DES-0005 is accepted by Edwin, with one plate per screen S1 to S7, drawn from Deck's and your-trainer's real tickets.
- [ ] Deck opens on the wheel for both workspaces. Every ticket the overview model returns is drawn exactly once, and the counts on screen equal the model's counts (automated).
- [ ] Every screen S1 to S7 passes the look's checks 1, 2 and 5: at most 60 words at rest, no number without a mark, an address that restores it and a list twin (automated, on both workspaces).
- [ ] From the wheel, a phase, a ticket, a design, a release test check and a feature gate are each reached in at most two clicks, and by keyboard alone.
- [ ] Edwin accepts a design in S5, records a Pass and a Fail in S6 and accepts a feature in S7, and each verdict appears in the cockpit. The same verbs from an agent session are refused.
- [ ] Each feature has an independent review by the agent that did not build it, recorded on the feature.
- [ ] Edwin's acceptance tests for each feature pass, including whether the screens read as pictures rather than text.

## Notes

- **Order.** `order: 5` only because the field cannot repeat. Edwin set Glass aside on 2026-10-08 to get the overview right first (DES-0004), so this phase is worked next. He set it `active` on 2026-10-14. Moving it in [PHASES.md](../PHASES.md) is his call.
- **Open questions carried from DES-0004.** How a backlog phase is marked (an id ending in 999, or `kind: backlog`); whether an open risk is amber; whether accepting a re-phase suggestion should write. The design lane proposes an answer to each in DES-0005, and Edwin decides when he accepts it.
- **Depends on PHASE-0001** for the store, the addresses, the view provider and Deck's index. It does not depend on PHASE-0002's unfinished work.
