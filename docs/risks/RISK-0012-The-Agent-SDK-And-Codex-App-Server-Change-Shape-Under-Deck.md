---
type: "[[risk]]"
id: RISK-0012
aliases: ["RISK-0012"]
title: "The Agent SDK and codex app-server are young and change shape between releases, so an update could stop Deck's sessions from starting or misread what they do"
status: open
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"]
phase: "[[PHASE-0004-Parity]]"
likelihood: high
impact: medium
mitigation: ["[[TASK-0192]]", "[[TASK-0193]]"]
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]"]
---

# The Agent SDK and codex app-server are young and change shape between releases

## Description

Deck now depends on two moving interfaces. `@anthropic-ai/claude-agent-sdk` is at 0.3.x and releases often. `codex app-server` is the protocol of whatever `codex` is on Edwin's PATH (0.162.1 on 2026-10-22); OpenAI marks it experimental, and it updates when Edwin updates Codex, not when Deck does. A renamed event would leave a session drawn as idle while it works, or drop a permission request.

## Mitigation

- Pin `@anthropic-ai/claude-agent-sdk` to an exact version
- Keep every app-server method name in one module
- Map unknown events to nothing rather than failing
- A missing or unknown `codex` fails the session with a sentence

**Installed 2026-10-22 (TASK-0192).** `@anthropic-ai/claude-agent-sdk` 0.3.308, pinned exactly in `desktop/package.json`. Its licence is Anthropic's own: "All rights reserved. Use is subject to the Legal Agreements" at code.claude.com, not an open-source licence; Deck uses it as a dependency on Edwin's machine and does not redistribute it. It brings Claude Code's own binary for the platform as an optional dependency, 272 MB on this Mac, so `npm ci` in CI and in the smoke container downloads the Linux one. It is ESM only; Deck's main process loads it with a dynamic import.

## Triggers

- A Deck session shows no steps while the agent clearly works; a permission request in the agent's own log never reaches Deck; the suite passes while a real session fails.
