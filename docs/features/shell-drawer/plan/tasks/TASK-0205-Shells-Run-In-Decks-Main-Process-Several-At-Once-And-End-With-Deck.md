---
type: "[[task]]"
id: TASK-0205
aliases: ["TASK-0205"]
title: "Plain shells run in Deck's main process through node-pty, several at once, each in its workspace's folder, and end when Deck quits"
status: doing
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]"
effort: M
due: ""
depends: []
blocks: ["[[TASK-0206]]"]
related: ["[[RISK-0014]]", "[[RISK-0015]]"]
tests: ["[[TST-0107]]"]
---

# Shells run in Deck's main process

**Deck's main process can open plain login shells, several at once, each in a workspace's folder, and closes them all when Deck quits.**

## Definition of Done

- [ ] `node-pty` is a dependency of `desktop/`, pinned exactly (1.1.0 or the latest on the day), with its licence recorded in [[RISK-0014]].
- [ ] It is rebuilt for Deck's Electron (32.3.3) by an install step, and the step is written down in `desktop/README` or the repository's README with what to run when it fails.
- [ ] `desktop/src/main/shells.ts` opens a shell with the user's login shell in a given folder, resizes it, writes input to it, streams its output, and closes it. Every shell is killed when Deck quits, by the pid Deck holds.
- [ ] The pty is created through an injected factory, so the node suites run on a fake pty and never load the Electron-built module.
- [ ] Shells are reached through the preload bridge only; the served host has no route to them ([[RISK-0015]]).
- [ ] [[TST-0107]] (`desktop/tests/shell-drawer.test.mjs`) exists and checks open, several at once, input, resize, close and quit, on the fake pty.
- [ ] CI's node install (`ELECTRON_SKIP_BINARY_DOWNLOAD=1`) still succeeds with node-pty in the dependencies; if its install script fails without a compiler, the check says so and the fix is recorded.

## Notes

A shell does not survive a Deck restart. PHASE-0004's console criterion asks for that, the way the cockpit's tmux sessions do; whether it is still wanted with a drawer is Edwin's question (PHASE-0004, Open questions).
