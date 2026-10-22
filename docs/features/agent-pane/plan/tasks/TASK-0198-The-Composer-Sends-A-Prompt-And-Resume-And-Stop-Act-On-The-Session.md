---
type: "[[task]]"
id: TASK-0198
aliases: ["TASK-0198"]
title: "The composer sends a prompt with a model, an effort and an access level, and Resume, Interrupt and Stop act on the open session"
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
related: ["[[RISK-0013]]"]
tests: ["[[TST-0105]]"]
---

# The composer sends a prompt, and Resume and Stop act on the session

**Below the conversation is the box to answer in, with the model, the effort, how much the agent may do without asking, and Send; Resume, Open its shell and Stop sit under it.**

## Definition of Done

- [ ] The composer sends a prompt to the open session; Send is disabled while the session is working, and Interrupt takes its place.
- [ ] The model and effort lists come from the provider (Claude's and Codex's own models), with the session's current choice selected.
- [ ] The access level offers "Ask before acting" (the default) and "Edit files without asking". No level skips permissions ([[RISK-0013]]).
- [ ] Resume continues an idle or restarted session; Stop ends it after a confirmation; Open its shell is drawn and calls FEAT-0035's drawer when that exists, and is absent until then.
- [ ] The suite checks the composer's state for working, waiting, idle and stopped sessions.
