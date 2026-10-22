---
type: "[[risk]]"
id: RISK-0013
aliases: ["RISK-0013"]
title: "An agent Deck starts could run commands and edit files on Edwin's machine without asking, if a skip-permissions setting reaches it"
status: open
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"]
phase: "[[PHASE-0004-Parity]]"
likelihood: medium
impact: high
mitigation: ["[[TASK-0192]]", "[[TASK-0193]]", "[[TASK-0198]]"]
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]"]
---

# An agent Deck starts could run commands and edit files on Edwin's machine without asking

## Description

Edwin's shell aliases `claude` to `claude --dangerously-skip-permissions`, and his Claude user settings set `skipDangerousModePermissionPrompt`. A Deck session that inherited either would act without asking. The SDK ignores shell aliases, but it can read user settings, and a later option or default could change that. Codex has the same exposure through `approval_policy`, `sandbox_mode` and `approvals_reviewer` in `~/.codex/config.toml`: with `approvals_reviewer = "auto_review"`, a model would answer the approvals Deck should put to a person.

## Mitigation

- Set Claude's permission mode explicitly on every start
- Send Codex the untrusted or on-request policy, the workspace-write sandbox, and `approvalsReviewer: "user"` on every thread start and resume (TASK-0207)
- Offer no access level that skips permissions
- A check fails if a skip option appears in what either provider sends

## Triggers

- A Deck session runs a command with no request shown; the composer offers a level beyond Edit files without asking; a provider's options contain `bypassPermissions`, `never` or `danger-full-access`.
