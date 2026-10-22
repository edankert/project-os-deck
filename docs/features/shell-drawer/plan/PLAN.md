---
type: "[[plan]]"
title: "Plan for FEAT-0035: the shell drawer"
status: active
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]"]
implements: ["[[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]"]
related: ["[[PHASE-0004-Parity]]", "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
---

# Plan for FEAT-0035

Two tasks, one commit each. [[TASK-0205]] creates the `shell-drawer` suite ([[TST-0107]]), on a fake pty so the node suites never load the Electron-built module.

## Delivery sequence

1. [[TASK-0205]] Shells in the main process through node-pty, rebuilt for Electron ([[RISK-0014]]).
2. [[TASK-0206]] The drawer with xterm.js, its tabs, and Open its shell from a session's pane.

## Dependencies

- **Hard:** TASK-0205 before TASK-0206.
- **Soft:** independent of FEAT-0032 to FEAT-0034 except Open its shell, which needs a session's folder. It can be built beside them.

## Open questions

- Whether a shell must survive a Deck restart, as PHASE-0004's console criterion still says. The default is no.
- Whether xterm.js runs under the page's content policy without inline styles; TASK-0206 finds out first.
