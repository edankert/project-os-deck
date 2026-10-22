---
type: "[[feature]]"
id: FEAT-0031
aliases: ["FEAT-0031"]
title: "The towers in Deck show a ticket's links, search, next up, what needs you, ages, the weeks and the pictures at their tickets: the seven Rubric ideas built from DES-0005's page"
status: review
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Build the DES-0005 into the deck and for DES-0006: - I think side pane as suggested but open for discussion - The ones they started on (is this not the same?) - It should be possible to hide the overview panels - Think it would be good to do permission requests first?'"]
goal: "In Deck itself, a person selects a ticket on the towers ring and sees its links, text and pictures; searches and sees the matches glow; sees what comes next, what needs them, which towers have gone quiet and what closed each week; and can group the ring by feature."
requirements: []
tasks: ["[[TASK-0181]]", "[[TASK-0182]]", "[[TASK-0183]]", "[[TASK-0184]]", "[[TASK-0185]]", "[[TASK-0186]]", "[[TASK-0187]]", "[[TASK-0189]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]", "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]", "[[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]]", "[[TASK-0176]]", "[[TASK-0177]]", "[[TASK-0179]]", "[[RISK-0010]]", "[[RISK-0011]]"]
---

# The towers in Deck show links, search, next up, needs you, ages, weeks and pictures

## Goal

**Deck's towers ring gains the seven ideas taken from Rubric that so far exist only on DES-0005's design page.** Edwin asked on 2026-10-22 to "build the DES-0005 into the deck". That answers yes to DES-0005's two open questions about [[TASK-0176]] (links, search, next up) and [[TASK-0177]] (needs you, grouping by feature, ages, weeks, and the pictures that [[TASK-0179]] moved to their own tickets).

The page `docs/designs/DES-0005-towers.html` is the specification. Where this note and the page disagree, the page's behaviour wins, unless a line below says otherwise.

## Scope

In Deck's real towers view (`desktop/src/shared/overview-towers.ts`, `desktop/src/renderer/overview-towers-view.ts`, `desktop/src/renderer/overview.ts`), its model (`desktop/src/shared/overview-model.ts`) and its main process (`desktop/src/main/overview-service.ts`):

- **The model carries more of each note**: its first paragraph, its `owner:` and its `updated:` date. Deck also lists the pictures kept beside the notes, with each picture's last commit date and the ticket it belongs to. Both are read-only. The helpers come from `desktop/scripts/overview-towers-notes.mjs` (`leadOf`, `evidenceFrom`, `designFeature`, `weeksOf`, `lastDates`), moved into the shared code so the page and Deck use one copy.
- **A selected ticket's links are drawn as curves** in the 3D view and in the flat plan Deck draws when WebGL cannot start. The ticket's card and its pane (first paragraph, then linked tickets as cockpit rows) come with it.
- **Search lights the towers**, and **the next-up board** lists the focus feature's tasks.
- **The needs-you panel**, **age badges** on quiet towers, and **the year as weeks**.
- **A switch groups the ring by feature.** The ring still opens by phase. Edwin did not say which it should open in, so the page's behaviour is kept: by phase is the default, the switch changes it, and Deck remembers the choice on that machine.
- **Pictures stand at their own tickets**, larger the nearer they are to the work in hand, and a selected ticket's pane shows its pictures.

Out of scope:

- The Level 2 wheel, where height is time. That is still a separate decision of Edwin's in DES-0005.
- Searching the text of the notes. Search matches ids and titles, as on the page.
- Any write. Nothing here changes a note, a picture or the sidecar.
- Agent sessions on the ring ([[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]). They wait for [[PHASE-0004-Parity]].

## Decisions taken in planning

These are readings of the request, recorded so the next reader can dispute them.

- **By phase stays the default**, with the switch and a remembered choice, as on the page.
- **The grouping and the selected ticket are part of the overview's address**, like the colouring already is (`desktop/src/renderer/overview.ts`). An address that names a grouping wins over the remembered choice. Reason: every reachable Deck state has an address (the architecture note, Part 8). The search text is not in the address, the same way a half-typed draft is not.
- **Ages count to today in Deck**, not to the fixture's date. DES-0005 says so under "What it leaves open".
- **PHASE-0005's "Dates and forecasts" exclusion no longer covers ages and weeks.** Edwin's yes to TASK-0177 asked for both. The phase note's Out of scope bullet is amended to say forecasts stay out and these two dates are in.
- **Pictures reach the renderer through the route Deck's host already has for docs images** (`/deck/file/<workspace>/<path>`), which the page's content policy requires (`img-src 'self' data:`). No new path is added to the host. Dating the pictures from git is new work at every overview build, and that is [[RISK-0011]].

## Acceptance

- Selecting any ticket on the ring, in 3D and in the flat plan, draws one curve to every ticket it links to or that links to it, up to 240, on Deck and on your-trainer.
- The selected ticket's card names its type, id, title, status, feature, phase, owner and last update; its pane shows its first paragraph, its linked tickets as rows and its pictures.
- A search outlines exactly the tickets whose id or title has a word starting with each word typed, and says how many matched.
- The next-up board lists the focus feature's last two finished tasks, the next ticket and up to six more, as on the page.
- The needs-you panel's count equals the number of tickets in the model that need you, and its bar splits that count by the cockpit's reasons.
- A tower quiet for 14 days or more, counted to today, carries its age badge, and "◷ Ages" hides and shows the badges.
- The weeks panel counts every closed ticket once: in its week, or among the undated.
- By feature, every unfinished feature is one segment holding all its tickets, whatever their phase; the switch returns to by phase; the choice is remembered and the address can name it.
- Up to eighteen pictures stand at their tickets, at most three per ticket, sized by nearness to the work in hand, and each loads through Deck's host.
- Every overview screen still passes the look's checks 1, 2 and 5 on both workspaces (at most 60 words at rest, every number beside its mark, an address and a list twin).
- Edwin's acceptance test [[TST-0103]] passes.

## Verification

Built on 2026-10-22, [[TASK-0181]] to [[TASK-0187]] and [[TASK-0189]], each in its own commit.

- **The node suite** [[TST-0102]] (`bash tools/scripts/run-desktop-tests.sh overview-towers`) has 61 checks, on both fixtures, many pinned to the counts DES-0005's page showed. Each task's checks were shown to fail against deliberate breaks of the code (two to four per task). `cd desktop && npm test` passes: 860 checks.
- **The look's checks** (TST-0090's `checkScene`) now hold the new panels' numbers to their marks, and every wheel this feature draws passes them in both groupings and both colourings, plain, selected and on the busiest ticket.
- **The window run** [[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]] passed on both workspaces in the container, with no page error and Deck's workspace unchanged; its Results say what it found on the way.
- **The towers walk** (`desktop/demos/towers-rubric.cjs`, run by `bash tools/scripts/walk-in-a-box.sh towers-rubric`) drives every idea with the real pointer and keyboard: 36 of 36 checks on Deck, 33 of 33 on your-trainer.
- **Edwin's acceptance test** [[TST-0103]] is `active`, its steps checked against the build; its verdict is his.

## Links

- Design: [[DES-0005-The-Overview-Is-Drawn-Not-Written]], sections "Links, search and next up on the towers" and "Needs you, grouping by feature, ages and weeks".
- Tasks: [[TASK-0181]] to [[TASK-0187]], in order, one commit each.
- Risks: [[RISK-0010]] (three.js, already open; no new dependency here) and [[RISK-0011]] (the git read behind the pictures' dates).

## Review

<Two independent reviewers, from the packet `tools/scripts/review-packet.py` writes; their combined verdict is transcribed here, never anticipated.>
