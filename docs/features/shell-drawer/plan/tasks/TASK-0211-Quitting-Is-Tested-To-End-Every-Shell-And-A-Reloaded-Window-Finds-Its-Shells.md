---
type: "[[task]]"
id: TASK-0211
aliases: ["TASK-0211"]
title: "A test shows quitting ends every shell and its jobs, a reloaded window finds the shells still running, and a large paste arrives whole"
status: doing
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["FEAT-0035 independent review, round one, 2026-10-22: both reviewers asked for changes"]
parent: "[[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[RISK-0015]]"]
tests: ["[[TST-0107]]", "[[TST-0108]]"]
---

# Quitting is tested to end every shell, and a reloaded window finds its shells

**Nothing failed when the line that ends every shell on quit was deleted.** Both reviewers found that, and that [[TST-0108]] never looks for a shell left running after Deck quits.

## What the reviewers found

- **No test checks that quitting ends the shells**, and TST-0107 only ever ran `closeAll` on a fake pty.
- **No test checks the served page's capability guard** in `Host.shells()`.
- **The terminal frame is not without a bridge.** It loads from Deck's own origin, so code in it could reach the parent page's bridge. What keeps it harmless is that it runs only Deck's own script files. The notes said otherwise.
- **A reloaded window loses its shells.** They keep running with no tab to reach or close them until Deck quits.
- **An exit that arrives before a frame is ready is lost**, and **a paste over 65,536 characters is dropped** without a word.

## Definition of Done

- [ ] A test opens real shells through node-pty, starts a background job in one, runs `closeAll`, and finds neither the shells nor the job running. It is skipped, by name, where node-pty is not installed.
- [ ] A test fails when `shutdown()` stops calling `closeAll`.
- [ ] [[TST-0108]] expects no shell process left after a quit.
- [ ] The notes and the code say what the frame can reach and what keeps it harmless.
- [ ] A window that loads while shells run draws a tab for each, with what each printed most recently.
- [ ] An exit before the frame is ready is shown once it is; a large paste is sent in pieces, in order.
- [ ] A test fails when `Host.shells()` stops checking the capability.
