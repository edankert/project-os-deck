---
type: "[[task]]"
id: TASK-0157
title: "A real 3D wheel where height is time, drawn as a design plate for Edwin to judge before any WebGL enters Deck"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'If we use 3d we could maybe capture even more information, suggest options?'", "Edwin 2026-10-15, approving: 'go ahead with all the recommendations as suggested'", "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"]
parent: "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"
effort: M
due: ""
depends: []
blocks: ["[[TASK-0161]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0155]]", "[[TASK-0156]]"]
tests: ["[[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]]"]
---

# A 3D wheel where height is time, drawn as a plate to judge

**This task draws a real 3D version of the wheel as a design page, so Edwin can judge it before any WebGL code goes into Deck.** It is "Level 2" 3D. In it, each phase is a column standing on its segment of the ring. A phase's tickets are stacked up the column by the date they were created, like the rings of a tree. So height shows when the work arrived, which the flat wheel cannot show.

## Definition of Done
- [ ] A prototype page, `docs/designs/DES-0005-time-columns.html`, draws the columns in WebGL with three.js, from Deck's and your-trainer's real tickets. Each ticket is the cockpit's mark in its type colour and state fill. The page can be turned with the mouse and switches between the two workspaces.
- [ ] three.js is loaded on that page only, from cdnjs at an exact pinned version. Nothing is added to `desktop/package.json`, and no Deck code imports it.
- [ ] The page's ticket data is written by `desktop/scripts/overview-plates.mjs` from the same fixtures as the other plates, so nothing on it is entered by hand. TST-0094 checks the page is written and holds every ticket of both fixtures.
- [ ] Captured pictures of the page (at least two angles on each workspace) are saved under `docs/designs/__attachments__/DES-0005/`, so the plate can be judged without a network connection.
- [ ] DES-0005 shows the pictures under a "Level 2: height is time" heading, says what the picture adds, what it costs (a WebGL dependency in Deck, text drawn as textures, a second renderer to keep the list twin and the checks working), and asks Edwin whether to build it.
- [ ] `cd desktop && npm test` passes. Codex reviews the page and the text, in two rounds at most.

## Steps
- [ ] Export both fixtures' tickets with their phase, type, fill and created date into the page.
- [ ] Draw the columns, the ring and the camera; take the pictures in a browser.
- [ ] Write the DES-0005 section and its question.

## Notes

Claude lane. Starts at once: it reads the fixtures, not the constellation's code.

The page needs the network to load three.js. The pictures are the durable record; the page is for turning the model by hand. Building it into Deck would be a new dependency, which needs a risk note and Edwin's decision first.

Assumption: a ticket with no `created:` date sits at the bottom of its column and is counted in the callout as "no date". If many tickets lack one, the page says how many.
