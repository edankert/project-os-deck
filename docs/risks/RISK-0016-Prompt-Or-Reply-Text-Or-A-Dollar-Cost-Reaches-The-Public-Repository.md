---
type: "[[risk]]"
id: RISK-0016
aliases: ["RISK-0016"]
title: "Prompt or reply text, or a session's dollar cost, could reach Deck's public repository through a fixture, a picture or a log"
status: open
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"]
phase: "[[PHASE-0004-Parity]]"
likelihood: medium
impact: high
mitigation: ["[[TASK-0191]]", "[[TASK-0194]]", "[[TASK-0201]]"]
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]"]
---

# Prompt or reply text, or a dollar cost, could reach the public repository

## Description

Deck's repository is public; your-trainer is private. Until now DES-0006 drew sessions as counts for exactly that reason. Real sessions now produce text and costs on Edwin's machine, and a window run, a fixture refresh or a debug log could copy them into a commit.

## Mitigation

- Keep conversations under Electron's user-data folder, never in a repository
- Send the cockpit's sidecar the prompt text but never a reply. The sidecar keeps prompts in the repository's `.cockpit/sessions.json`, as it does for its own sessions; `.cockpit/` is gitignored, so they stay out of commits (FEAT-0032 review, round one)
- Write fixtures and pictures from scripted sessions with invented words
- Draw no cost anywhere
- Check committed fixtures for cost fields as DES-0006's page check does

## Triggers

- A committed file holds a real prompt, a reply, a path from your-trainer's private work, or a dollar amount.
