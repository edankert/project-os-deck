---
type: "[[task]]"
id: TASK-0192
aliases: ["TASK-0192"]
title: "The Claude provider runs a session through the Agent SDK's query(), raises each permission request for Deck to answer, and never skips permissions"
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

# The Claude provider runs a session through the Agent SDK

**Deck can run a Claude session itself, and Claude asks Deck before it acts.** The provider wraps `query()` from `@anthropic-ai/claude-agent-sdk` and turns its messages into the conversation model from [[TASK-0191]].

## Definition of Done

- [ ] `@anthropic-ai/claude-agent-sdk` is a dependency of `desktop/`, pinned to an exact version (0.3.308 or the latest on the day), with its licence checked and recorded in [[RISK-0012]].
- [ ] `desktop/src/main/agents/claude-provider.ts` starts a session with the prompt, the folder, the model and the effort; streams the SDK's messages as conversation records; and maps tool uses to tool calls, Edit and Write results to file edits with lines added and removed, and TodoWrite to the plan.
- [ ] Every permission request arrives through `canUseTool` and waits for Deck's answer; Approve and Deny reach the SDK.
- [ ] `permissionMode` is set explicitly to `default`, or `acceptEdits` when the session's access level says so. The options never carry `bypassPermissions` or `allowDangerouslySkipPermissions`, whatever the user's settings say. A check in the suite reads the options the provider builds and fails if either appears ([[RISK-0013]]).
- [ ] The child's environment has `CLAUDE_CODE_PLUGIN_DIRS` and the cockpit's own variables removed, so the cockpit's plugin does not also report this session.
- [ ] `settingSources` includes `project`, so the repository's `CLAUDE.md` and project settings apply.
- [ ] Resume continues the session by its SDK session id; Interrupt stops the current turn; Stop ends the session.
- [ ] The suite drives the provider with a fake query stream injected in place of the SDK. No check reaches a real model ([[RISK-0017]]).

## Steps

- [ ] Read the SDK's own types for `query()`, `canUseTool`, `permissionMode`, `settingSources`, `resume` and interrupt in the installed package before writing the wrapper; do not rely on memory.
- [ ] Inject the query function, so the suite can pass a fake.
- [ ] Run one real session by hand on this repository, with a prompt that only reads, to confirm the message shapes. Record what was checked in Notes, without the prompt or reply text ([[RISK-0016]]).

## Notes

Edwin's shell aliases `claude` to `--dangerously-skip-permissions`. The SDK does not read shell aliases, but it can read user settings; that is why the mode is set explicitly rather than left to the default.
