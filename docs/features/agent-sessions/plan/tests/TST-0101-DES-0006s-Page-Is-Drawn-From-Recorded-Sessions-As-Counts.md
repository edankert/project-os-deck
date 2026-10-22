---
type: "[[test]]"
id: TST-0101
aliases: ["TST-0101"]
title: "DES-0006's page is drawn from the sessions the cockpit recorded, keeping only ids, states, times, tickets and counts, and holds every recorded session of every workspace"
status: active
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[TASK-0178]]"]
phase: "[[PHASE-0004-Parity]]"
scope: feature
level: unit
entrypoint: "desktop/tests/agents-page.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh agents-page"
covers: ["[[FEAT-0030-Agent-Sessions-Needs-You-And-The-Overview-Panels-Are-Drawn-Before-They-Are-Built]]"]
issues: []
tasks: ["[[TASK-0178]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]]"]
---

# DES-0006's page is drawn from recorded sessions, as counts

## Purpose

**The agent sessions page must never carry what a person typed or an agent replied.** The cockpit's records hold prompts, commands and file paths; the page shows only ids, states, times, tickets and counts. This test holds that, and that every recorded session reaches the page.

## Checks

- A transcript is counted, never copied: tool calls by name and the prompts a person typed, for Claude and for Codex.
- A session reduced from records full of text keeps none of it: no prompt, reply, command, file path or title; the live state wins over the recorded one; tickets are only those the workspace holds.
- The committed fixtures hold no long string, path or spaced text.
- The page holds every recorded session of Deck, your-trainer and the cockpit, each session's tickets are tickets of its workspace, and nothing but three.js is loaded from outside.
