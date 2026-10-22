---
type: "[[task]]"
id: TASK-0208
aliases: ["TASK-0208"]
title: "A turn that ends while the session is being told it is at work again leaves the session idle, not stuck at working"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["TASK-0201's walk in the container, 2026-10-22: after Deny the pane offered Interrupt instead of Send"]
parent: "[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"
effort: S
due: ""
depends: []
blocks: ["[[TASK-0201]]"]
related: []
tests: ["[[TST-0104]]"]
---

# A turn that ends during an answer leaves the session idle

**After a request was denied in a real Deck window, the session stayed "working" though its turn had ended, so the pane offered Interrupt and never Send again.** The node suites could not show it; [[TASK-0201]]'s walk in the container did.

## Cause

Answering a request changed the session to working in two steps: it recorded the change and told every listener, then stored the new state. One listener sends the change to Deck's windows, and in Electron that send runs the promise callbacks waiting to run. The agent's next steps were among them: a denied agent says so and ends its turn at once, which set the session idle. Then the first step finished and stored working on top of idle.

The log of every change, in order, showed it: `permission denied`, `text`, `state idle`, `session idle`, then `state working`, `session working`.

## Definition of Done

- [x] A session's state is stored before any listener is told of it, and the change it tells carries the state the session has when it is sent.
- [x] Answering a request makes the session working before the agent is let go.
- [x] [[TST-0104]] has a check that ends the turn from inside a listener at that moment. It fails with the old order and passes with the new.

## What was built (2026-10-22)

`setState` in `desktop/src/main/agents/session.ts` stores the state and the last-active time, then tells the record, then tells the session. `answer` changes the state before it resolves the agent's wait. [[TST-0104]] has 32 checks.
