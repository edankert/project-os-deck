---
type: "[[feature]]"
id: FEAT-0032
aliases: ["FEAT-0032"]
title: "Deck starts and owns Claude and Codex sessions, each tied to the ticket it was started on, and reports them to the sidecar so the cockpit sees them too"
status: review
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
goal: "Deck's main process can start, resume, interrupt and stop a Claude session and a Codex session in this checkout or a new worktree, turns what each agent does into one conversation, asks Edwin before an agent acts, and tells the cockpit's sidecar about every session so the cockpit sees Deck's agents."
requirements: []
tasks: ["[[TASK-0191]]", "[[TASK-0192]]", "[[TASK-0193]]", "[[TASK-0194]]", "[[TASK-0195]]", "[[TASK-0196]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[FEAT-0030-Agent-Sessions-Needs-You-And-The-Overview-Panels-Are-Drawn-Before-They-Are-Built]]", "[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]", "[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]", "[[RISK-0012]]", "[[RISK-0013]]", "[[RISK-0015]]", "[[RISK-0016]]", "[[RISK-0017]]", "[[REFERENCE-COCKPIT-ADOPTION]]"]
---

# Deck starts and owns Claude and Codex sessions

## Goal

**Deck's main process can run a Claude or a Codex session itself, and every session belongs to the ticket it was started on.** This is the engine under [[DES-0006-Agent-Sessions-Stand-Beside-The-Work]], as [[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]] decided (option B). Nothing here draws a session; [[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]] does.

## Scope

In Deck's main process (new modules under `desktop/src/main/agents/`) and shared types (`desktop/src/shared/agent-*.ts`):

- **A provider interface** with two providers. A provider starts a session, sends a prompt, resumes, interrupts and stops. It emits events, and it raises a permission request that Deck answers.
  - **Claude** runs through the Agent SDK's `query()` (npm `@anthropic-ai/claude-agent-sdk`, pinned to an exact version). Permission requests come through `canUseTool`. Resume uses the SDK's session id.
  - **Codex** runs through `codex app-server`, JSON-RPC over the child's standard input and output, using the `codex` on Edwin's PATH (codex-cli 0.162.1 on 2026-10-22). Approval requests come from the server as requests Deck answers.
- **One conversation model.** Both providers' events become the same records: a prompt; the agent's steps as tool calls with their names and outcomes; file edits with lines added and removed and the diff; the plan; a permission request and how it was answered; the agent's text; and the session's state (working, waiting for you, idle, stopped, failed).
- **Sessions are kept in Deck's store**, in the main process's state file under Electron's user-data folder, never in the repository. Each record holds the provider, the provider's own session or thread id, the workspace, the start ticket, the folder it runs in, the model, the effort, the access level, its times and its state. The conversation itself is kept in the same user-data folder, one file per session.
- **Starting in a new worktree or in this checkout.** A new worktree is made with `git worktree add` on a new branch named after the ticket and the session, in a folder beside the repository (`<repo>-worktrees/<ticket>-<short id>`), so the validator and Deck's index never walk it. Deck never removes a worktree on its own.
- **Reporting to the sidecar**, so the cockpit sees Deck's sessions: lifecycle events to `POST /api/agent-hook` in the shape the cockpit's hooks already send, and each permission request to `POST /api/cockpit/approvals/ask`, withdrawn with `/approvals/handed-back` once Deck has its answer.
- **Only the shell reaches a session.** The renderer reaches sessions through the preload bridge. A new capability, `agents`, is true in the shell and false on the served page. Deck's served host gets no route to any of it.

Out of scope:

- Drawing anything (FEAT-0033, FEAT-0034).
- Handing a prompt to one of the cockpit's own sessions (the sidecar's deliveries). Deck's sessions and the cockpit's terminals stay separate processes (ADR-0009).
- Removing worktrees, merging their branches, or pushing.
- Showing a session's dollar cost anywhere. Context and usage percentages may be shown; cost may not (FEAT-0030, Edwin 2026-10-22).

## Decisions taken in planning

Readings of the request, recorded so the next reader can dispute them.

- **A session always asks before it acts, by default.** Claude starts with `permissionMode: 'default'` set explicitly, and Codex with `approvalPolicy: 'on-request'` and the `workspace-write` sandbox. The access levels offered are "Ask before acting" (the default) and "Edit files without asking" (Claude's `acceptEdits`; Codex's matching policy). Nothing Deck offers skips permissions: no `bypassPermissions`, no `allowDangerouslySkipPermissions`, no Codex `never` policy, no `danger-full-access`. Reason: Edwin's shell aliases `claude` to `--dangerously-skip-permissions` and his user settings set `skipDangerousModePermissionPrompt`; neither may reach a session Deck starts ([[RISK-0013]]).
- **Deck answers its own sessions' permission requests in its main process, so they need no shell secret.** The SDK's `canUseTool` and the app-server's approval request are answered by Deck directly. ADR-0009's consequence said Deck must start its own sidecar with `--secret-stdin`; that secret is only needed to answer the *cockpit's* requests, which is [[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]'s [[TASK-0204]]. Deck keeps borrowing a running sidecar, as [[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]'s mitigation requires.
- **A session's environment is cleaned.** `CLAUDE_CODE_PLUGIN_DIRS` and the cockpit's own variables are removed from the child's environment, so the cockpit's plugin does not also report a Deck session and count it twice. The Agent SDK loads the project's settings and `CLAUDE.md` (`settingSources` includes `project`), so project-os rules apply in a Deck session as in a terminal.
- **The start ticket is exact for a session Deck starts.** The cockpit records no start ticket ([[DES-0006-Agent-Sessions-Stand-Beside-The-Work]], Edwin's answers); for the cockpit's own sessions FEAT-0033 uses the first ticket each one moved, as the design page does.

## Acceptance

- A Claude session and a Codex session each start from a ticket, in this checkout or a new worktree, and each produces conversation records of every kind listed under Scope from the same model.
- A tool call that needs permission waits until Deck answers it, and the answer reaches the agent; no option Deck passes to either provider skips permissions.
- A session survives a Deck restart as a record, and Resume continues the same Claude session or Codex thread.
- The sidecar lists each Deck session in `/api/cockpit/sessions` and `/api/cockpit/agent-state`, and an open permission request appears in `/api/cockpit/approvals`.
- The served host answers 404 or 405 to every path that would reach a session, and its capability set says `agents: false`.
- Every check in [[TST-0104]] runs on fake providers; no suite reaches a real model.

## Verification

Built on 2026-10-22, [[TASK-0191]] to [[TASK-0196]], one commit each. [[TST-0104]] (`bash tools/scripts/run-desktop-tests.sh agent-sessions`) has 25 checks on fake providers, a fake app-server and a recording fake sidecar; each task's checks were shown to fail against a deliberate break. `cd desktop && npm test` passes 888.

Checked for real, by hand: one Claude session through the Agent SDK, read-only (Edwin allowed one); the real `codex app-server`'s handshake and a thread, with no turn; and a session reported to the cockpit's real sidecar with a fake agent. What is not yet shown with a real agent: that a tool which writes is asked about (the fakes show Deck's side), and a real Codex turn.

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Design: [[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]; decision: [[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]
- Adoption rows this moves: `api.write.agents` and `shell.agents.codex` in part ([[REFERENCE-COCKPIT-ADOPTION]]), updated at close-out.

## Review

<Two independent reviewers, from the packet `tools/scripts/review-packet.py` writes; their combined verdict is transcribed here, never anticipated.>
