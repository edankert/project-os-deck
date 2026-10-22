---
type: "[[test]]"
id: TST-0107
aliases: ["TST-0107"]
title: "Shells open several at once in their folders, take input and resize, and all end when Deck quits, on a fake pty"
status: active
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[TASK-0205]]"]
phase: "[[PHASE-0004-Parity]]"
scope: feature
level: unit
entrypoint: "desktop/tests/shell-drawer.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh shell-drawer"
covers: ["[[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]"]
issues: []
tasks: ["[[TASK-0205]]", "[[TASK-0206]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
---

# Shells open several at once and end with Deck

## Purpose

**This suite checks the shell manager and the drawer's tabs on a fake pty, so it never loads the node-pty build made for Electron.** It does not exist yet; [[TASK-0205]] creates `desktop/tests/shell-drawer.test.mjs`.

## Checks

- Open, several at once, input, resize, close, and every shell killed at quit. (TASK-0205)
- The drawer's tabs: new, switch, close, Open its shell in a session's folder; no drawer on the served page. (TASK-0206)
