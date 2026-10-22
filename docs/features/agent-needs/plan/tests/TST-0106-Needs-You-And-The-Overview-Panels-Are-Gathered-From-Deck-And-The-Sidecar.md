---
type: "[[test]]"
id: TST-0106
aliases: ["TST-0106"]
title: "Needs you gathers permission requests first, then waiting agents, tickets and unpushed work, and the cockpit's overview panels are filled from the sidecar, on both workspaces"
status: active
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[TASK-0202]]"]
phase: "[[PHASE-0004-Parity]]"
scope: feature
level: unit
entrypoint: "desktop/tests/agent-needs.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh agent-needs"
covers: ["[[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]"]
issues: []
tasks: ["[[TASK-0202]]", "[[TASK-0203]]", "[[TASK-0204]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
---

# Needs you and the overview panels are gathered from Deck and the sidecar

## Purpose

**This suite checks what Needs you and the four overview panels list, against fake sessions and a fake sidecar.** It does not exist yet; [[TASK-0202]] creates `desktop/tests/agent-needs.test.mjs`.

## Checks

- Needs you's sections come in Edwin's order and its count adds them up; the served page lists tickets only. (TASK-0202)
- Each panel's numbers match the fixtures; Caught up posts the digest's time; hidden panels give the Agents list their place. (TASK-0203)
- With Deck's own sidecar a cockpit request is answered with the secret; with a borrowed one it has no buttons; the secret is in no payload sent to a renderer. (TASK-0204)
