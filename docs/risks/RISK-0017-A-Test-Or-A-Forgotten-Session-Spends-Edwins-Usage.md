---
type: "[[risk]]"
id: RISK-0017
aliases: ["RISK-0017"]
title: "A test that reaches a real model, or a session left working, could spend Edwin's Claude and Codex usage without him seeing it"
status: open
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"]
phase: "[[PHASE-0004-Parity]]"
likelihood: medium
impact: medium
mitigation: ["[[TASK-0191]]", "[[TASK-0192]]", "[[TASK-0193]]"]
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]"]
---

# A test or a forgotten session could spend Edwin's usage

## Description

A real session costs usage against Edwin's five-hour and weekly limits. A suite wired to the real SDK would spend it on every CI run and every local test. A session left working in a worktree goes on spending after the window closes.

## Mitigation

- Node suites inject fake providers and never start a real one
- Hand checks use prompts that only read and Stop after
- A working session is always visible on the ring and in the Agents list

## Triggers

- Usage rises during a test run; a session is working that nobody started today.
