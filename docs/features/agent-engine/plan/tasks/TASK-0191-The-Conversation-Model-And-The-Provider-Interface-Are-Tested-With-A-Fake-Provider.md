---
type: "[[task]]"
id: TASK-0191
aliases: ["TASK-0191"]
title: "One conversation model for Claude and Codex sessions, and a provider interface tested with a fake provider that plays a scripted session"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"
effort: M
due: ""
depends: []
blocks: ["[[TASK-0192]]", "[[TASK-0193]]", "[[TASK-0194]]"]
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[RISK-0017]]"]
tests: ["[[TST-0104]]"]
---

# One conversation model, and a provider interface with a fake provider

**Deck gets the types every later task builds on: what a session is, what happens in it, and what a provider must do.** No real agent runs yet. A fake provider plays a scripted session, so the suite can check the model from the first commit.

## Definition of Done

- [x] `desktop/src/shared/agent-types.ts` defines a session record (id, provider `claude` or `codex`, the provider's own id, workspace, start ticket, folder, worktree or checkout, model, effort, access level, created, last active, state) and the conversation records: prompt, agent text, tool call (name, a short summary, outcome), file edit (path, lines added, lines removed, diff), plan (steps with done or not), permission request (tool, a summary of what it asks, outcome: approved, denied or open), and state change (working, waiting for you, idle, stopped, failed).
- [x] `desktop/src/main/agents/provider.ts` defines the provider interface: start, send, resume, interrupt, stop, an event stream of conversation records, and a permission request that waits for Deck's answer.
- [x] A fake provider in `desktop/tests/` plays a session from a script: two prompts, tool calls, an edit, a plan, one permission request answered and one denied, then idle.
- [x] `desktop/tests/agent-sessions.test.mjs` exists and checks that the fake session produces each record kind in order, that a permission request blocks the stream until answered, and that the state goes working, waiting for you, working, idle.
- [x] The scripted session's prompt and reply text is invented for the test, not taken from a real session ([[RISK-0016]]).

## Steps

- [x] Read DES-0006's page code (`desktop/scripts/agents-page.mjs`, `desktop/scripts/agents-fixture.mjs`) for the shapes already drawn, and keep their names where they fit.
- [x] Write the types, then the fake, then the suite.

## Notes

The model is shared code because the renderer draws it (FEAT-0033) and the main process fills it. The provider interface stays in the main process: the renderer never holds a provider.

## What was built (2026-10-22)

- `desktop/src/shared/agent-types.ts`: the session record, the seven kinds of conversation record (prompt, text, tool, edit, plan, permission, state), `latest` (a tool call or request at its latest outcome, where it first stood), `turnsOf` and `openRequests`.
- `desktop/src/main/agents/provider.ts`: the provider interface. A provider starts or resumes a session and reports through hooks: records, its own id, a permission request that waits for Deck's answer, the end of a turn, the end of the session.
- `desktop/src/main/agents/session.ts`: `AgentSession`, where Deck's rules hold whatever the provider. A permission request blocks the agent and puts the session at "waiting" until `answer`; stopping or interrupting denies whatever is open, so an agent never waits on nobody; every change goes to listeners.
- `desktop/tests/fake-agent.mjs` plays an invented script; [[TST-0104]] (`desktop/tests/agent-sessions.test.mjs`) has 5 checks. Making a request resolve without waiting fails 3 of them.
