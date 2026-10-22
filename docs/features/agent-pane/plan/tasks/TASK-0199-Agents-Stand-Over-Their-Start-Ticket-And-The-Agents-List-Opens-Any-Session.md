---
type: "[[task]]"
id: TASK-0199
aliases: ["TASK-0199"]
title: "Agents stand as markers over the ticket they were started on, on the towers ring, and the Agents list opens any session"
status: done
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

- [x] A marker stands over the start ticket's tower or tile in the 3D view and in the flat plan. Its colour is its state (working, waiting for you, idle), its ring its agent (Claude, Codex), and a working session breathes as the focus feature's tasks do.
- [x] Deck's sessions use their exact start ticket. The cockpit's sessions, read from `/api/cockpit/sessions` through the main process, use the first ticket whose status they changed, as DES-0006's page does (`startOf` in `desktop/scripts/agents-notes.mjs`, moved into shared code so the page and Deck use one copy).
- [x] A session on no ticket the workspace holds is in the Agents list but not on the ring.
- [x] The Agents list (left, middle) shows every session: agent, state, start ticket and how many more it moved, last active. Pressing a row or a marker opens the session in the pane, lights its tickets and joins them to it with curves, as a selected ticket does.
- [x] The open session is part of the overview's address, so a reload or a pop-out window opens on it.
- [x] The suite checks marker placement and the list on both overview fixtures plus scripted sessions.

## Notes

The cockpit's sessions can be opened in the pane but show only what the sidecar records (counts, tickets, times). Their conversation lives in the cockpit's terminal, and Deck cannot send to them.

## What was built (2026-10-22)

- `desktop/src/shared/agent-marks.ts`: every session on a workspace as one summary. Deck's sessions stand over their start ticket. The cockpit's stand over the first ticket whose status they changed, by the time the cockpit saw each change. `agentMarkers` places each marker over its tower's top or its tile, the core or the shelf, one above another when several share a place. `agentsPanel` makes the Agents list, waiting sessions first. `startOf` is the one copy; DES-0006's page script now reads it from Deck's build.
- The towers layout takes `agents` and `session`. An open session is drawn as a selection of its own (`layout.session`): curves from its marker to every ticket it worked on, with the rest faded. The flat plan draws each marker as a circle, its fill the state and its ring the agent. The 3D view lays the markers over the canvas as small buttons, a working one breathing; a press opens the session.
- The wheel has the Agents list at the left, between a selected ticket's card and the Next up board. While a session is open the right-hand panels make way for the session pane, and the ring moves left of it. The address carries `session=<id>`, on the wheel only. A reload opens the same session, and closing the pane, or Escape, goes to the address without it.
- **The cockpit's sessions come through the main process.** A new call, `deck:agents:cockpit`, reads `/api/cockpit/sessions` from the workspace's sidecar. It hands the window only ids, agent, state, times and the tickets changed, never prompts, files or costs. Deck's served host still forwards no session route. A cockpit session opens in the pane to read: who it is, how it stands, and the tickets it changed.
- `desktop/src/renderer/agent-state.ts` keeps both lists and reads the cockpit's again every 15 seconds. It draws the overview again only when a marker or the list would change.
- A page given no sessions has no marker and no list, so the served page shows neither.
- [[TST-0105]] has 15 checks, on both overview fixtures. Four guards were each broken in turn, and each break failed a check. The full node run passes 909. Nothing here has run in a window yet; that is [[TASK-0201]]'s, in the container.
