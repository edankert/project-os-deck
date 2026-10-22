---
type: "[[task]]"
id: TASK-0200
aliases: ["TASK-0200"]
title: "Work on this on a ticket's card opens a dialog that starts a session with the agent, model, effort and place chosen, and the ticket's own words as the first prompt"
status: backlog
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]"
effort: M
due: ""
depends: ["[[TASK-0198]]", "[[TASK-0199]]"]
blocks: []
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
tests: ["[[TST-0105]]"]
---

# Work on this starts a session from a ticket

**A ticket's card has Work on this; pressing it opens a dialog, and Start begins a session that stands over that ticket at once.**

## Definition of Done

- [ ] Work on this appears on a ticket's card in the shell only (the `agents` capability), never on the served page.
- [ ] The dialog offers Claude or Codex, the model, the effort, the access level (Ask before acting by default), and a new worktree or this checkout (this checkout by default).
- [ ] The first prompt is filled from the ticket, as DES-0006 says: what it asks of you when it needs you, else "Work on" and its id and title. The person can change it before Start.
- [ ] Start creates the session through [[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]], opens it in the pane, and its marker appears over the ticket.
- [ ] The suite checks the first prompt for a ticket that needs you and one that does not, and the dialog's defaults.
