---
type: "[[plan]]"
title: "Plan for FEAT-0033: the session pane, the agents on the towers and Work on this"
status: draft
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]"]
implements: ["[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]"]
related: ["[[PHASE-0004-Parity]]", "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
---

# Plan for FEAT-0033

Five tasks, one commit each. [[TASK-0197]] creates the `agent-pane` suite ([[TST-0105]]). The layouts are pure and shared, so the suite checks them without a window; [[TASK-0201]] is the one window run for the feature.

## Delivery sequence

1. [[TASK-0197]] The session pane draws the conversation turn by turn.
2. [[TASK-0198]] The composer, Interrupt, Resume and Stop.
3. [[TASK-0199]] Markers over each session's start ticket, and the Agents list.
4. [[TASK-0200]] Work on this and its dialog.
5. [[TASK-0201]] Screen checks, the window run in the container, DES-0006's pictures from Deck, and [[TST-0108]] set `active`.

## Dependencies

- **Hard:** all of [[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]], and its [[TASK-0196]] (the bridge) in particular. TASK-0197 before TASK-0198 and TASK-0199. TASK-0200 needs the composer's choices and a marker to land on.
- **Window runs.** Held until Edwin says, and run in the Colima container first. Node suites run freely.

## Open questions

- Side pane or a larger window over the ring: Edwin chose the pane and left it open (DES-0006). The pane is built; nothing waits on the answer.
