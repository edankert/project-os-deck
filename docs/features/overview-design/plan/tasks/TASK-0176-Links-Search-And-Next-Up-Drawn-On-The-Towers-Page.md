---
type: "[[task]]"
id: TASK-0176
title: "Three of Rubric's ideas drawn on the towers page to judge: a selected ticket's links as curves with its card and text, search that lights the towers, and a next-up board"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-21
updated: 2026-10-21
source: ["Edwin 2026-10-21: 'Document this and then go ahead with the 3 suggested options first (although I agree with all your suggestions)'"]
parent: "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"
effort: M
due: ""
depends: []
blocks: []
related: ["[[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0163]]", "[[TASK-0177]]", "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"]
tests: ["[[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]]"]
---

# Links, search and next-up drawn on the towers page

**This task draws three of the ideas taken from Rubric ([[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]]) on the towers design page, `docs/designs/DES-0005-towers.html`, so Edwin can try them before any goes into Deck.** As with the towers themselves ([[TASK-0163]]), the page comes first and Deck is changed only when Edwin asks for it.

## What the page draws

- **Selecting a ticket draws its links as curves.** Pressing a floor or a tile, or a row in a list, selects that ticket. Curves rise from it and land on every ticket it links to or that links to it, in the linked ticket's type colour, also in other phases and on the shelf. The rest of the ring dims, and each linked ticket gets an outline and its id. The links are the ones the fixture already records for each note (`links`), read in both directions, without phases and references, which are not drawn as tickets.
- **A card for the selected ticket**, where the legend stands: its type mark, id, title, status in the cockpit's words, feature, phase, owner, last update, and what to do when it needs you. Its buttons fly the camera to the ticket and its links, bring its phase close, or clear the selection.
- **The ticket's text in the right pane**: the first paragraph of its note, then its linked tickets as cockpit rows grouped by type, each one selecting that ticket when pressed. With a phase brought close, a "back to the phase" line returns to the phase's list.
- **Search that lights the towers.** A box in the header (`/` puts the cursor in it) matches ids and title words. Every other ticket dims, the matches glow where they stand, and the box says how many matched. Up to twelve matches are listed under it; choosing one selects it and flies the camera to it. Escape empties the box.
- **A next-up board**, bottom left: the focus feature's tasks in the style of Rubric's routines. The last two finished are greyed with their dates, the next ticket is lit and marked "next", the rest are queued, those in progress first. Each row names its owner (Claude, Codex or Edwin). A count says how many of the feature's tasks are done, and the foot names the commit the data was read from. Pressing a row selects that ticket.
- Escape steps back one thing at a time: the search, then the selection, then the phase, then home.

## Definition of Done

- [ ] `desktop/scripts/overview-towers.mjs` adds to each workspace on the page: each ticket's links in both directions, and each note's first paragraph, owner and last update, read from the notes at the fixture's commit as the feature of each ticket already is. Nothing is entered by hand.
- [ ] `desktop/scripts/overview-towers-notes.mjs` reads the first paragraph, `owner:` and `updated:`, and TST-0094's suite checks each on small notes of its own.
- [ ] The page draws the curves, the card, the text pane, the search and the next-up board as described above, with no errors in a hidden window.
- [ ] TST-0094 checks that the links on the page agree with the fixture in both directions, and that the next-up board holds the focus feature's tasks.
- [ ] Pictures under `docs/designs/__attachments__/DES-0005/`: a ticket selected with its curves, a search lit, and the next-up board, on each workspace.
- [ ] DES-0005 shows the pictures under a heading of their own, says what building each into Deck would cost, and asks Edwin whether to build them.
- [ ] `cd desktop && npm test` passes. Two independent Claude reviewers review it.

## Acceptance checks reopened

None. Deck is not changed; only the design page is.
