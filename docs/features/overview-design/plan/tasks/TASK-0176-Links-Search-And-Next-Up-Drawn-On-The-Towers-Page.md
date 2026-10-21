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

- [x] `desktop/scripts/overview-towers.mjs` adds to each workspace on the page: each ticket's links in both directions, and each note's first paragraph, owner and last update, read from the notes at the fixture's commit as the feature of each ticket already is. Nothing is entered by hand.
- [x] `desktop/scripts/overview-towers-notes.mjs` reads the first paragraph, `owner:` and `updated:`, and TST-0094's suite checks each on small notes of its own.
- [x] The page draws the curves, the card, the text pane, the search and the next-up board as described above, with no errors in a hidden window.
- [x] TST-0094 checks that the links on the page agree with the fixture in both directions, and that the next-up board holds the focus feature's tasks.
- [x] Pictures under `docs/designs/__attachments__/DES-0005/`: a ticket selected with its curves, a search lit, and the next-up board, on each workspace.
- [x] DES-0005 shows the pictures under a heading of their own, says what building each into Deck would cost, and asks Edwin whether to build them.
- [ ] `cd desktop && npm test` passes. Two independent Claude reviewers review it.

## Verification

`desktop/scripts/overview-towers.mjs` writes the page with each ticket's links both ways round (from the fixture's `links`), each note's first paragraph, owner and last update (read by `overview-towers-notes.mjs` from the notes at the fixture's commit, past headings, quoted callouts, comments, pictures and code), and the next-up board. Deck: FEAT-0028, 5 of 7 tasks done, TASK-0147 and TASK-0148 done, TASK-0154 next, TASK-0158 queued. your-trainer: FEAT-0136, 0 of 17 done, TASK-1057 next, six in progress, nine more queued. The page grew from 554 KB to 1.66 MB; most of it is your-trainer's 2,743 paragraphs, each cut at 280 characters.

TST-0094's suite checks that every link of the fixture is on the page both ways and no other, that nearly every note has a paragraph, that dates are days, that the board is the focus feature's tasks with the next one lit and done ones closed, and the paragraph reader on small notes of its own. Each new guard was broken once to see it fail: links one way only, a done task shown as queued, a callout read as prose. `cd desktop && npm test`: 793 tests, 793 passed.

In a hidden window (`desktop/scripts/towers-capture.cjs`, no page errors) the pictures were taken, and the page was driven with real presses and keys: pressing a ticket on the ring selects it with its card and pane; a row of the pane selects that ticket; the card brings its phase close; the pane goes back to the phase's list; Escape clears the selection, then closes the phase; `/` and typing light 16 matches for "wheel", arrow and Enter choose one, which is selected; Escape in the box empties it; a row of the board selects its ticket; a red cap still brings its phase close with the first ticket that needs you selected and the list kept. One defect found that way was fixed: a selection left the cursor in the search box, so Escape only left the box.

## Acceptance checks reopened

None. Deck is not changed; only the design page is.
