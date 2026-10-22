---
type: "[[task]]"
id: TASK-0193
aliases: ["TASK-0193"]
title: "The Codex provider runs a session through codex app-server over JSON-RPC, raises each approval request for Deck to answer, and never runs without approval"
status: done
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

- [x] `desktop/src/main/agents/codex-provider.ts` starts `codex app-server` from the `codex` on the PATH, starts or resumes a thread, starts a turn with the prompt, and maps the server's notifications to conversation records: agent messages, command runs and tool calls, file changes with lines added and removed, the plan, and turn completion.
- [x] The server's approval requests (commands and file changes) wait for Deck's answer, and Approve and Deny are sent back as the response to that request.
- [x] A thread starts with the `on-request` approval policy and the `workspace-write` sandbox, or the policy that lets edits through when the session's access level says so. Neither `never` nor `danger-full-access` is ever sent; a check reads what the provider sends and fails if either appears ([[RISK-0013]]).
- [x] Resume continues the thread by its id; Interrupt stops the current turn; Stop ends the child process, and a child is never left running after Deck quits.
- [x] A missing `codex` binary, or a version whose protocol Deck does not know, gives a session that fails with a sentence saying so, not a crash.
- [x] The suite runs the provider against a fake app-server script in `desktop/tests/` that speaks the same JSON-RPC. No check starts the real `codex` ([[RISK-0017]]).

## Steps

- [x] Generate the protocol's types from the installed binary (`codex app-server generate-ts`, if 0.162.1 has it) or read its schema, and pin the method names Deck uses in one place.
- [x] Write the fake server from those messages, then the provider.
- [x] Run one real thread by hand that only reads, to confirm the shapes. Record what was checked in Notes, without prompt or reply text ([[RISK-0016]]).

## Notes

The app-server protocol is marked experimental by OpenAI and has changed between releases ([[RISK-0012]]). Keeping the method names in one module limits what a new release breaks.

## What was built (2026-10-22)

- `desktop/src/main/agents/codex-provider.ts`. One `codex app-server` child holds one thread: `initialize`, `initialized`, then `thread/start` or `thread/resume` by the thread's id, and a `turn/start` per prompt with its effort. Notifications become records: an agent message as text, a command as a Bash tool call, a file change as an Edit tool call and, once applied, an edit per file with lines added and removed from its diff, `turn/plan/updated` as the plan, `turn/completed` as the turn's end.
- **Every approval is a server request that waits for Deck**: a command and a file change (`accept` or `decline`), and the older `execCommandApproval` and `applyPatchApproval` (`approved` or `denied`). A request Deck does not know, such as a request for the person's input, is refused with an error, never granted.
- **The policy** (`codexPolicy`): "ask before acting" is `untrusted` and "edit files without asking" is `on-request`, both with the `workspace-write` sandbox. The planner's note said `on-request` for both; `untrusted` was chosen for "ask" because it asks before any command Codex does not already know to be safe, which matches Claude's default mode. Deck never passes `never` or `danger-full-access`.
- The child is spawned through an injectable function with the same cleaned environment as Claude's. [[TST-0104]] drives the provider with `desktop/tests/fake-codex-app-server.mjs`, which plays invented turns and logs every request Deck sends; 12 checks pass. Giving "ask" the `never` policy fails 2.
- **The real app-server, by hand, with no turn and so no model:** `initialize` answered with its user agent and home; `thread/start` with this policy answered with a thread id, then `thread/started` and the MCP servers' start-up notices. Messages are one JSON object per line, without a `jsonrpc` field, as the provider assumes.
