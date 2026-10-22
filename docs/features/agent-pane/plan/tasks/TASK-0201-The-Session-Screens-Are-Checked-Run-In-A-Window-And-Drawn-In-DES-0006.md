---
type: "[[task]]"
id: TASK-0201
aliases: ["TASK-0201"]
title: "The session screens are checked, run in a window in the container, and drawn again in DES-0006 from Deck itself, with no prompt or reply text in any picture"
status: doing
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]"
effort: M
due: ""
depends: ["[[TASK-0200]]"]
blocks: []
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[TST-0108]]", "[[RISK-0016]]"]
tests: ["[[TST-0105]]"]
---

# The session screens are checked, run in a window and drawn in DES-0006

**One window run for the whole feature, in the Colima container first, and DES-0006 gains pictures of the real thing.**

## Definition of Done

- [ ] The overview's screen checks cover the pane, the composer, the markers, the Agents list and the Work on this dialog, with a scripted session from the fake provider.
- [ ] The window run is held until Edwin says, and run in the container first (`run-smoke.sh`), as his standing instructions ask.
- [ ] DES-0006 gains pictures from a real Deck window, made with a scripted session whose words are invented for the picture. No real prompt, reply or cost is in any picture or log committed ([[RISK-0016]]).
- [ ] [[TST-0108]]'s steps are checked against the build and the note goes from `draft` to `active`.
