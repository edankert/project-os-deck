---
type: "[[task]]"
id: TASK-0193
aliases: ["TASK-0193"]
title: "The Codex provider runs a session through codex app-server over JSON-RPC, raises each approval request for Deck to answer, and never runs without approval"
status: doing
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"
effort: L
due: ""
depends: ["[[TASK-0191]]"]
blocks: ["[[TASK-0194]]"]
related: ["[[RISK-0012]]", "[[RISK-0013]]", "[[RISK-0017]]"]
tests: ["[[TST-0104]]"]
---

# The Codex provider runs a session through codex app-server

**Deck can run a Codex session itself, and Codex asks Deck before it acts.** The provider starts `codex app-server` as a child of Deck's main process and speaks JSON-RPC with it over standard input and output.

## Definition of Done

- [ ] `desktop/src/main/agents/codex-provider.ts` starts `codex app-server` from the `codex` on the PATH, starts or resumes a thread, starts a turn with the prompt, and maps the server's notifications to conversation records: agent messages, command runs and tool calls, file changes with lines added and removed, the plan, and turn completion.
- [ ] The server's approval requests (commands and file changes) wait for Deck's answer, and Approve and Deny are sent back as the response to that request.
- [ ] A thread starts with the `on-request` approval policy and the `workspace-write` sandbox, or the policy that lets edits through when the session's access level says so. Neither `never` nor `danger-full-access` is ever sent; a check reads what the provider sends and fails if either appears ([[RISK-0013]]).
- [ ] Resume continues the thread by its id; Interrupt stops the current turn; Stop ends the child process, and a child is never left running after Deck quits.
- [ ] A missing `codex` binary, or a version whose protocol Deck does not know, gives a session that fails with a sentence saying so, not a crash.
- [ ] The suite runs the provider against a fake app-server script in `desktop/tests/` that speaks the same JSON-RPC. No check starts the real `codex` ([[RISK-0017]]).

## Steps

- [ ] Generate the protocol's types from the installed binary (`codex app-server generate-ts`, if 0.162.1 has it) or read its schema, and pin the method names Deck uses in one place.
- [ ] Write the fake server from those messages, then the provider.
- [ ] Run one real thread by hand that only reads, to confirm the shapes. Record what was checked in Notes, without prompt or reply text ([[RISK-0016]]).

## Notes

The app-server protocol is marked experimental by OpenAI and has changed between releases ([[RISK-0012]]). Keeping the method names in one module limits what a new release breaks.
