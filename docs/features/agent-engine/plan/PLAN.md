---
type: "[[plan]]"
title: "Plan for FEAT-0032: the session engine in Deck's main process"
status: active
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"]
implements: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"]
related: ["[[PHASE-0004-Parity]]", "[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
---

# Plan for FEAT-0032

Six tasks, one commit each. [[TASK-0191]] creates the `agent-sessions` suite ([[TST-0104]]) and every later task adds its checks to it in the same commit. Every check runs on a fake provider: a fake query stream for Claude and a fake app-server script for Codex. No suite reaches a real model ([[RISK-0017]]).

## Delivery sequence

1. [[TASK-0191]] The conversation model and the provider interface, in shared code, with a fake provider that plays a scripted session. The suite starts here.
2. [[TASK-0192]] The Claude provider over the Agent SDK's `query()`: start, send, `canUseTool`, resume, interrupt. Adds the dependency ([[RISK-0012]]) and the permission defaults ([[RISK-0013]]).
3. [[TASK-0193]] The Codex provider over `codex app-server`: thread start and resume, turns, approval requests, interrupt. Tested against a fake app-server script.
4. [[TASK-0194]] Sessions kept in Deck's store with their start ticket; a new worktree or this checkout; a session record survives a restart and resumes.
5. [[TASK-0195]] Sessions reported to the sidecar: `/api/agent-hook` and the approvals ask. Tested against a recording fake sidecar, and once by hand against the real one.
6. [[TASK-0196]] The preload bridge and the `agents` capability; the served host has no route ([[RISK-0015]]).

## Dependencies

- **Hard:** TASK-0191 comes first; both providers implement its interface. TASK-0194 needs one provider (TASK-0192) to resume. TASK-0195 reads the session records TASK-0194 keeps. TASK-0196 comes before [[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]] starts drawing.
- **Soft:** TASK-0192 before TASK-0193, so the Claude shape (the better documented) settles the interface first.
- **Cockpit:** the sidecar is not changed. If `/api/agent-hook` drops a field Deck needs, such as the start ticket, file an issue in the cockpit repository and carry on without it.

## Open questions

- None block the build. Whether Deck answers the cockpit's permission requests is FEAT-0034's question, and its default is in that feature.
