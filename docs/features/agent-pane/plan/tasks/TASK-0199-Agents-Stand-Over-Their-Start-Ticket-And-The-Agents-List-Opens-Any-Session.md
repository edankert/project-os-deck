---
type: "[[task]]"
id: TASK-0199
aliases: ["TASK-0199"]
title: "Agents stand as markers over the ticket they were started on, on the towers ring, and the Agents list opens any session"
status: backlog
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]"
effort: M
due: ""
depends: ["[[TASK-0197]]"]
blocks: []
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"]
tests: ["[[TST-0105]]"]
---

# Agents stand over their start ticket, and the Agents list opens any session

**Every session, Deck's and the cockpit's, stands as a marker over the tower of the ticket it was started on, and a list on the left names them all.**

## Definition of Done

- [ ] A marker stands over the start ticket's tower or tile in the 3D view and in the flat plan. Its colour is its state (working, waiting for you, idle), its ring its agent (Claude, Codex), and a working session breathes as the focus feature's tasks do.
- [ ] Deck's sessions use their exact start ticket. The cockpit's sessions, read from `/api/cockpit/sessions` through the main process, use the first ticket whose status they changed, as DES-0006's page does (`startOf` in `desktop/scripts/agents-notes.mjs`, moved into shared code so the page and Deck use one copy).
- [ ] A session on no ticket the workspace holds is in the Agents list but not on the ring.
- [ ] The Agents list (left, middle) shows every session: agent, state, start ticket and how many more it moved, last active. Pressing a row or a marker opens the session in the pane, lights its tickets and joins them to it with curves, as a selected ticket does.
- [ ] The open session is part of the overview's address, so a reload or a pop-out window opens on it.
- [ ] The suite checks marker placement and the list on both overview fixtures plus scripted sessions.

## Notes

The cockpit's sessions can be opened in the pane but show only what the sidecar records (counts, tickets, times). Their conversation lives in the cockpit's terminal, and Deck cannot send to them.
