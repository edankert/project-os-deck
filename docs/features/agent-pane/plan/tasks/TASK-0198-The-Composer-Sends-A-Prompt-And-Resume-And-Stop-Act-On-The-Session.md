---
type: "[[task]]"
id: TASK-0198
aliases: ["TASK-0198"]
title: "The composer sends a prompt with a model, an effort and an access level, and Resume, Interrupt and Stop act on the open session"
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
related: ["[[RISK-0013]]"]
tests: ["[[TST-0105]]"]
---

# The composer sends a prompt, and Resume and Stop act on the session

**Below the conversation is the box to answer in, with the model, the effort, how much the agent may do without asking, and Send; Resume, Open its shell and Stop sit under it.**

## Definition of Done

- [x] The composer sends a prompt to the open session; Send is disabled while the session is working, and Interrupt takes its place.
- [x] The model and effort lists come from the provider (Claude's and Codex's own models), with the session's current choice selected.
- [x] The access level offers "Ask before acting" (the default) and "Edit files without asking". No level skips permissions ([[RISK-0013]]).
- [x] Resume continues an idle or restarted session; Stop ends it after a confirmation; Open its shell is drawn and calls FEAT-0035's drawer when that exists, and is absent until then.
- [x] The suite checks the composer's state for working, waiting, idle and stopped sessions.

## What was built (2026-10-22)

- The composer in `desktop/src/renderer/agent-pane.ts`: the prompt (⌘↩ sends), the session's model, effort and access level, then Send, or Interrupt while it works; Resume for a session that is not running (with "Carry on." when the box is empty); Stop, which asks once more by turning into "Stop? Press again". It is made again only when what it offers changes, so a record arriving never takes the cursor out of the box.
- `composerOf` in `desktop/src/shared/agent-pane.ts` says what is offered in each state; `MODELS` and `EFFORTS` hold each agent's own lists (Claude's Claude 5 models and the SDK's effort levels; GPT-6 Astra or Codex's default, and Codex's reasoning efforts).
- **A reading recorded:** the model, effort and access level are shown, with the session's choice selected, but chosen when the session starts (Work on this, [[TASK-0200]]), not changed mid-session; changing them would need the provider to switch under a running session. Open its shell is not drawn until [[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]] exists.
- [[TST-0105]] has 6 checks.
