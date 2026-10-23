---
type: "[[task]]"
id: TASK-0211
aliases: ["TASK-0211"]
title: "A test shows quitting ends every shell and its jobs, a reloaded window finds the shells still running, and a large paste arrives whole"
status: done
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

- [x] A test opens real shells through node-pty, starts a background job in one, runs `closeAll`, and finds neither the shells nor the job running. It is skipped, by name, where node-pty is not installed.
- [x] A test fails when `shutdown()` stops calling `closeAll`.
- [x] [[TST-0108]] expects no shell process left after a quit.
- [x] The notes and the code say what the frame can reach and what keeps it harmless.
- [x] A window that loads while shells run draws a tab for each, with what each printed most recently.
- [x] An exit before the frame is ready is shown once it is; a large paste is sent in pieces, in order.
- [x] A test fails when `Host.shells()` stops checking the capability.

## What was built (2026-10-23)

- **Quitting is tested.** A [[TST-0107]] check opens two real login shells through node-pty, starts `sleep 4242 &` in one and reads its pid, runs `closeAll`, and waits for both shells and the job to be gone. It is skipped, by name, where node-pty did not install. It kills every pty it made at its end whatever happens: the first version left live shells holding the suite open when `closeAll` was broken, so the suite hung for ten minutes instead of failing. Now it fails in 14 s. A second check reads `shutdown()` in `main.ts` for its `shells.closeAll()`, and that `will-quit` and both signals reach it; no suite runs Electron's main process.
- [[TST-0108]] step 8 starts a job in a shell and asks Edwin to run `pgrep -fl 'sleep 4242'` after quitting; it should print nothing.
- **What the frame can reach** is said in `shell-drawer.ts`, `terminal-frame.ts` and [[TASK-0206]], corrected in place.
- **A reloaded window finds its shells.** `ShellManager` keeps each shell's latest 100,000 characters, cut at a line's start (`keepRecent`). `deck:shells:list` with `recent` answers them, and the drawer makes a tab for each running shell with that output.
- An end that comes before a frame is ready is posted after the output, once the frame is ready.
- A paste is sent in pieces of 16,384 characters, in order, never between the halves of a character outside the basic plane (`piecesOf`).
- A check runs `Host.shells()` with the capability on, off, and on a served page.

[[TST-0107]] has 15 checks. Eight guards were each broken once on the committed code, and a check failed for each.

**After round two (2026-10-23).** One reviewer found that a window already open did not pick up a shell another window opened later; only a window that loaded afterwards did. The drawer now asks for the running shells again when an event names one it has no tab for, once however many events come. A [[TST-0107]] check fails without it; the suite has 16 checks.
