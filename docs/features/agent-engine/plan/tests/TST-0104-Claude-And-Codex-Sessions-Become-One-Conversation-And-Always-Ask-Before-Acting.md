---
type: "[[test]]"
id: TST-0104
aliases: ["TST-0104"]
title: "Claude and Codex sessions, played by fake providers, become one conversation, wait for every permission answer, are kept and resumed, report to a fake sidecar, and never ask to skip permissions"
status: active
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[TASK-0191]]"]
phase: "[[PHASE-0004-Parity]]"
scope: feature
level: unit
entrypoint: "desktop/tests/agent-sessions.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh agent-sessions"
covers: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"]
issues: []
tasks: ["[[TASK-0191]]", "[[TASK-0192]]", "[[TASK-0193]]", "[[TASK-0194]]", "[[TASK-0195]]", "[[TASK-0196]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
---

# Sessions become one conversation and always ask before acting

## Purpose

**This suite checks Deck's session engine without a real model: a fake query stream stands in for the Agent SDK and a fake script for `codex app-server`.** It does not exist yet; [[TASK-0191]] creates `desktop/tests/agent-sessions.test.mjs` and each later task of FEAT-0032 adds its checks in the same commit.

## Checks

- A scripted session gives every record kind in order, and a permission request holds the stream until it is answered. (TASK-0191)
- The Claude provider maps the SDK's messages to the model; the options it builds always set the permission mode and never carry `bypassPermissions` or `allowDangerouslySkipPermissions`; the child's environment has no `CLAUDE_CODE_PLUGIN_DIRS`. (TASK-0192)
- The Codex provider maps the app-server's notifications to the model, answers approval requests, and never sends the `never` policy or `danger-full-access`; a missing binary fails with a sentence. (TASK-0193)
- A session is kept with its start ticket, a worktree is made beside the repository, and a restarted session resumes by its provider id. (TASK-0194)
- Each lifecycle event reaches a recording fake sidecar in the shape `agent_hooks.py` reads, and a request is asked and handed back. (TASK-0195)
- The served host answers 404 or 405 on every agent, session and approval path, and its capability set says `agents: false`. (TASK-0196)
