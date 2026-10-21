---
type: "[[reference]]"
id: REFERENCE-RUBRIC-AGENTIC-OS-REVIEW
title: "What Rubric's agentic OS dashboard shows, and seven of its ways of showing data that Deck's overview can use"
status: active
owner: user:edwin
created: 2026-10-21
updated: 2026-10-21
scope: "Ways of presenting a workspace's state taken from RoboNuggets' Rubric dashboard, for DES-0005's towers on the ring"
source:
  - "Edwin 2026-10-21: 'Review the solution defined here: it has some interesting ways to present the data: https://www.getrubric.app/ suggest how to incorporate some of those interesting new ways to present the data in the current solution.'"
  - "Edwin 2026-10-21: 'I don't think you have fully reviewed the actual capabilities, can you watch this https://www.youtube.com/watch?v=8NSyI-npJCU to find out what is in it and what could possibly be useful for our application?'"
  - "Edwin 2026-10-21: 'Document this and then go ahead with the 3 suggested options first (although I agree with all your suggestions)'"
  - "https://www.youtube.com/watch?v=8NSyI-npJCU (Jay E, RoboNuggets, 'The NEW Agentic OS standard for Claude 5 Models is here', 21 Aug 2026, 21:38): the transcript read in full and frames looked at from 0:50 to 20:38 on 2026-10-21"
  - "https://www.getrubric.app/ (the landing page; the dashboard itself is only available inside the paid RoboNuggets community, and no public repository holds it)"
related:
  - "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"
  - "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"
  - "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
  - "[[TASK-0176]]"
  - "[[TASK-0177]]"
  - "[[PHASE-0005-Overview]]"
---

# What Rubric's agentic OS dashboard shows, and what Deck can use

## Purpose

**Rubric is a dashboard for one person's AI agents, and seven of the ways it shows its data fit Deck's overview.** This note records what the dashboard shows, which of its ideas suit the towers on the ring (DES-0005), and which do not. Edwin agreed with all seven on 2026-10-21. The first three are drawn on the towers design page in [[TASK-0176]]; the other four wait in [[TASK-0177]].

Rubric's landing page shows none of the dashboard. A first review of the landing page alone missed most of it. The video named in `source:` shows the dashboard in use, and this note is written from it.

## What the dashboard shows

**The home screen** has a ring of round icons around a glowing cloud of particles. Each icon is a file Claude made for its owner, and a badge on it gives its age in days ("14D", "6D"). Typing in the search box dims the whole ring and lights only the matching icons, with a count ("3 matches"). Pressing an icon opens a small card: its title, date and path, with "Open file" and "Remove". Pressing the middle opens the second screen.

Small panels stand around the ring, and each is mostly numbers and bars:

- **Email.** A large count (47), the three messages "flagged, needs Jay", and one bar split into colours by kind of message.
- **Calendar.** The year as a grid of week squares with the current week lit, and a short "what's next" list.
- **Routines.** Timed jobs in a list. Jobs that already ran are greyed and say FIRED, the next one is lit orange and says NEXT, and the rest say QUEUED. Each row names the machine that runs it. The panel says "6/8 fired today", and its foot says when the data was read.
- **Skills deck.** Cards that run a skill from the dashboard, with the model and effort chosen per card.
- **Micro apps.** Links to small apps, such as a gallery of every generated image and video.

**The "second brain" screen** draws all 60,000 files of the workspace as one picture. The workspace's CLAUDE.md is in the centre. Around it are a ring of skills, a ring of memory files split into coloured wedges by department, a ring of routines and, outside, the connected applications. A folder is a larger bubble labelled with its count of files. A panel switches the layout (Force, Circle, Hex, Rings) and the grouping (Departments or Folders).

Selecting a file on that screen does three things:

- Its links fan out as bright curves to every file it is connected to, and everything else dims.
- A card shows its tags, size, age, connections and actions (View here, Open on device, Copy path, Fly to).
- Its full text opens in a pane on the right.

Searching lists the matches under the box. Choosing one flies the camera to it.

## Seven ways of showing data that Deck can use

In the order recommended. Each is drawn in the cockpit's type colours, fill marks and status words, as Deck draws everything ([[DES-0004-The-Phase-Overview]]), not in Rubric's orange.

1. **A selected ticket's links drawn as curves across the towers.** Curves run from the ticket to its feature, tasks, tests and linked issues, also in other phases, and the rest of the ring dims. A card beside it gives the id, title, status, owner and why it needs you, with buttons to fly to it or bring its phase close. The ticket's text opens in the right pane, with its linked tickets listed by id and title under it. This is Edwin's request of 2026-10-15 that a selected item show its id, title and text and the related items' ids and titles, drawn rather than listed. ([[TASK-0176]])
2. **Search that lights the towers.** Typing dims the ring and lights the matching tickets where they stand, with a count. The matches are listed under the box, and choosing one selects it and flies the camera to it. Home brings the camera back. ([[TASK-0176]])
3. **A "next up" board in the style of Rubric's routines.** The focus feature's tasks are listed: the last ones finished greyed, the next one lit, the rest queued. Each row names who has it (Claude, Codex or Edwin, from the note's `owner:`), and the foot says which commit the data was read from. This makes clear what will be worked on next, which Edwin asked for on 2026-10-16. ([[TASK-0176]])
4. **A needs-you panel in the style of Rubric's email panel.** A large count, then one bar split by reason (triage, review, a test never run or failing, waiting), then the first three tickets. ([[TASK-0177]])
5. **A switch between grouping by phase and grouping by feature.** Rubric's Departments or Folders switch is the choice Edwin said Deck will want ("we will want to implement either by phase or feature", 2026-10-16). ([[TASK-0177]])
6. **Age badges, and a ring of recent evidence.** A badge gives the days since a ticket last changed, so stalled work shows. Recent design pictures and acceptance-test evidence stand on a ring of their own, each opening its ticket. ([[TASK-0177]])
7. **The year as a grid of week squares**, each filled by the tickets closed that week, so the pace of work and its stalls show without words. ([[TASK-0177]])

The arrangement is worth taking as well: one large picture in the middle and five or six small panels around it, mostly numbers and bars. Deck would have the towers in the middle and these panels round them, in place of one list of text on the right.

## What Deck should not take

- **The flat Rings layout.** It is the flat disc Edwin moved away from when he chose towers on 2026-10-16.
- **The particle cloud and the pixel art.** They decorate and carry no data, and Deck keeps the cockpit's look.
- **The skills deck, which starts runs.** Starting a run from Deck would add a write path, and Deck has none: every verb goes through the cockpit's sidecar and its guards. That is a separate decision.
- **The force-directed graph.** Edwin found the phase screen's web, the same kind of picture, did not work.

## Maintenance

Update this note when one of the seven is drawn, built or dropped, with the task that did it.
