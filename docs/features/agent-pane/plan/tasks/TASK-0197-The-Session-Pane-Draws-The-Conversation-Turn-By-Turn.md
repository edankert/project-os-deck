---
type: "[[task]]"
id: TASK-0197
aliases: ["TASK-0197"]
title: "The session pane draws a conversation turn by turn: prompts as bubbles, the agent's steps as chips, edits with lines added and removed, the plan, and permission requests at their turn"
status: doing
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]"
effort: L
due: ""
depends: ["[[TASK-0196]]"]
blocks: ["[[TASK-0198]]"]
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[RISK-0016]]"]
tests: ["[[TST-0105]]"]
---

# The session pane draws the conversation

**Opening a session shows it in the wide pane on the right, top to bottom, as DES-0006 draws it, but with the real words.** The design page draws counts because its data is public; Deck's pane is local and shows the prompts and replies themselves.

## Definition of Done

- [ ] A pure layout in `desktop/src/shared/agent-pane.ts` turns a session record and its conversation into the pane's rows: the head (agent, short id, state, times), context and usage bars and minutes (never a cost), the tickets it moved as cockpit rows, then the turns.
- [ ] Each turn draws the prompt as a bubble on the right with its text, then the agent's text, its steps as chips with counts (Bash 12, Edit 3), each edited file with lines added and removed and its diff behind a press, the plan as a checklist, and any permission request at the turn it was asked, with Approve and Deny while open and its outcome after.
- [ ] A session waiting for you ends with "Claude is waiting for you" or "Codex is waiting for you".
- [ ] The renderer (`desktop/src/renderer/agent-pane.ts`) draws the layout in the right pane, streams new records in as they arrive, and keeps the reader's place when they scroll up.
- [ ] Agent text is drawn as text, never as HTML.
- [ ] [[TST-0105]] (`desktop/tests/agent-pane.test.mjs`) exists and checks the layout on a scripted conversation: the order of turns, the counts, the request at its turn, the waiting line, and that no cost appears.

## Notes

Edwin chose the side pane and left it open for discussion (DES-0006). The layout is kept apart from where it is drawn, so a larger window over the ring would reuse it.
