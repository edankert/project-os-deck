---
type: "[[task]]"
id: TASK-0206
aliases: ["TASK-0206"]
title: "The shell drawer draws each shell with xterm.js in its own tab, labelled by workspace, and a session's Open its shell opens one in the session's folder"
status: backlog
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]"
effort: M
due: ""
depends: ["[[TASK-0205]]"]
blocks: []
related: ["[[RISK-0010-Three-Js-Is-A-New-Runtime-Dependency-Of-The-Renderer]]", "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
tests: ["[[TST-0107]]"]
---

# The shell drawer

**Shells in the header opens a drawer at the bottom; each shell is a tab, several are open at once, and each tab names its workspace.**

## Definition of Done

- [ ] xterm.js (`@xterm/xterm`, pinned exactly) and its fit addon are copied into `dist/renderer/vendor/` by `desktop/scripts/copy-assets.mjs`, the way three.js is (RISK-0010's pattern), with their stylesheet.
- [ ] The page's content policy is left as it is (`style-src 'self'`, no inline styles). If xterm.js needs inline styles or a `<style>` element under that policy, the task says which renderer works without them, or stops and records the conflict.
- [ ] The drawer opens and closes from the header, keeps its height, and holds tabs: New shell (in the current workspace's folder), switch, close.
- [ ] Open its shell in a session's pane opens a tab in that session's folder, its worktree when it has one.
- [ ] The drawer and its button are absent on the served page.
- [ ] The suite checks the drawer's tab state; the window run for FEAT-0035 is held until Edwin says, and run in the container first.
