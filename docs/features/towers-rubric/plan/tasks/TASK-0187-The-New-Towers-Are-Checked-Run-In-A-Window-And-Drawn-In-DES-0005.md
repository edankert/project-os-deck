---
type: "[[task]]"
id: TASK-0187
title: "The towers' new panels pass the screen checks, the window run is repeated on both workspaces, and DES-0005 shows them in a real Deck window"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Build the DES-0005 into the deck'"]
parent: "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"
effort: M
due: ""
depends: ["[[TASK-0181]]", "[[TASK-0182]]", "[[TASK-0183]]", "[[TASK-0184]]", "[[TASK-0185]]", "[[TASK-0186]]"]
blocks: []
related: ["[[TASK-0169]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]", "[[TST-0102]]", "[[TST-0103]]"]
---

# The new towers are checked, run in a window and drawn in DES-0005

**The last task holds the new panels to the overview's look, runs them in a real Deck window on both workspaces, and replaces DES-0005's page-only pictures of them with pictures from Deck.**

## Definition of Done

- [x] TST-0090's screen checks cover the ring with the new panels: at most 60 words at rest (ticket rows exempt), every number beside its mark (the needs-you count, the board's done count, the undated weeks, the age badges), and a list twin holding the same tickets in both groupings.
- [x] The window run TST-0093 (`desktop/scripts/overview-drive.cjs`) selects a ticket, searches, groups by feature and back, and loads a picture, on Deck and on your-trainer, with no page errors and the workspace unchanged. It runs in the container first (`run-smoke.sh`), and in a window on Edwin's screen only when he says.
- [x] DES-0005's two Rubric sections say these ideas are built into Deck, with pictures taken from a real Deck window, and their two "What is Edwin's to decide" bullets are struck through with his answer of 2026-10-22.
- [x] [[TST-0103]] moves from `draft` to `active` with its steps checked against the build.
- [x] `cd desktop && npm test` passes, with the count recorded in FEAT-0031's Verification.

## What was done (2026-10-22)

- **The look's checks** (`desktop/src/shared/overview-checks.ts`): the numbers rule now checks the new panels' data, since they draw their counts as pictures. The needs-you count must be its bar's parts, and its rows among them; the year must be 52 weeks with no ticket in two; a board's done count must be within its total. The needs-you panel's rows join the list twin. [[TST-0102]] shows each of these failing on a broken panel, and every wheel of the feature passing in both groupings and colourings.
- **The window run** [[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]] (`desktop/scripts/overview-drive.cjs`) now selects a ticket and opens it from its card, searches, groups by feature and back, loads the pictures, and fails on any page error. `desktop/demos/overview-drive.cjs` runs it in the container. It passed on Deck and on your-trainer; four defects it found on the way are fixed and listed in TST-0093's Results. One of them was older than this feature and has its own task, [[TASK-0189]].
- **DES-0005** has a section "Built into Deck" with six pictures from a real Deck window, says where Deck differs from the page and why, strikes through the two decisions with Edwin's answer, and has a revision entry. Your-trainer's window pictures are kept out of it: there its pictures stand on the ring as thumbnails of its own app screens, and Deck's repository is public. Edwin is asked whether those may be published.
- [[TST-0103]] is `active`.
- `cd desktop && npm test`: 860 passing, recorded in FEAT-0031's Verification.
