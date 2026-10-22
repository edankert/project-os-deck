---
type: "[[task]]"
id: TASK-0200
aliases: ["TASK-0200"]
title: "Work on this on a ticket's card opens a dialog that starts a session with the agent, model, effort and place chosen, and the ticket's own words as the first prompt"
status: done
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

- [x] Work on this appears on a ticket's card in the shell only (the `agents` capability), never on the served page.
- [x] The dialog offers Claude or Codex, the model, the effort, the access level (Ask before acting by default), and a new worktree or this checkout (this checkout by default).
- [x] The first prompt is filled from the ticket, as DES-0006 says: what it asks of you when it needs you, else "Work on" and its id and title. The person can change it before Start.
- [x] Start creates the session through [[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]], opens it in the pane, and its marker appears over the ticket.
- [x] The suite checks the first prompt for a ticket that needs you and one that does not, and the dialog's defaults.

## What was built (2026-10-22)

- A selected ticket's card has ▶ Work on this, on the wheel and with a phase brought close, and in the keyboard list. It appears only on a screen given agents, which only the shell gives; the served page has none.
- `desktop/src/renderer/agent-start.ts` is the dialog. It offers Claude or Codex, each with its own models and efforts, the two access levels, and this checkout or a new worktree. The first prompt is filled in and can be changed. Start sends the request through the session calls; on success the dialog closes and the wheel opens on the new session. Escape, Cancel or a press outside closes it without starting anything.
- `firstPrompt` and `startDefaults` in `desktop/src/shared/agent-marks.ts`. When the ticket needs you, the first prompt is its id, title and what it asks of you; otherwise it is "Work on" with its id and title. The dialog starts on Claude, Opus 5.5, high effort, Ask before acting, this checkout.
- [[TST-0105]] has 20 checks. They cover both first prompts, the defaults, the button on both fixtures and both screens, that the served page lacks it, and that every request the dialog can send passes the main process's own check. The full node run passes 914. The dialog in a window is [[TASK-0201]]'s.
