---
type: "[[task]]"
id: TASK-0205
aliases: ["TASK-0205"]
title: "Plain shells run in Deck's main process through node-pty, several at once, each in its workspace's folder, and end when Deck quits"
status: done
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

- [x] `node-pty` is a dependency of `desktop/`, pinned exactly (1.1.0 or the latest on the day), with its licence recorded in [[RISK-0014]].
- [x] It needs no rebuild for Electron: node-pty 1.1.0 is built on Node-API. The install step that does matter is written down in `desktop/README.md`, with what to run when it fails.
- [x] `desktop/src/main/shells.ts` opens a shell with the user's login shell in a given folder, resizes it, writes input to it, streams its output, and closes it. Every shell is killed when Deck quits, by the pid Deck holds.
- [x] The pty is created through an injected factory, so the node suites run on a fake pty and never load the Electron-built module.
- [x] Shells are reached through the preload bridge only; the served host has no route to them ([[RISK-0015]]).
- [x] [[TST-0107]] (`desktop/tests/shell-drawer.test.mjs`) exists and checks open, several at once, input, resize, close and quit, on the fake pty.
- [x] CI's node install still succeeds with node-pty in the dependencies: it is optional, so an install with no compiler goes on without it, and the container image now has one.

## Notes

A shell does not survive a Deck restart. PHASE-0004's console criterion asks for that, the way the cockpit's tmux sessions do; whether it is still wanted with a drawer is Edwin's question (PHASE-0004, Open questions).

## What was built (2026-10-22)

- `node-pty` 1.1.0 (MIT) is an optional dependency of `desktop/`, pinned exactly. It ships Node-API binaries for macOS and Windows, which load in plain node and in Electron alike, so Deck needs no rebuild step and an Electron upgrade needs none either. Linux compiles it, so `tools/docker/smoke.Dockerfile` gains `make` and `g++`.
- **Found while installing:** its macOS `spawn-helper` arrives without the execute bit, and every shell then fails with "posix_spawnp failed". `desktop/scripts/pty-helper.mjs` sets the bit after every install, as `postinstall`.
- `desktop/src/main/shells.ts`: `ShellManager` opens the person's login shell (`$SHELL -l`) in a folder, streams its output, writes input, resizes within bounds, and closes by killing the process Deck holds. Every shell is closed when Deck quits. A plain shell gets the cockpit's variables left out, as an agent does. Where node-pty did not install, shells are off and opening one says why.
- `registerShellCalls` opens a shell only in a folder Deck knows: a workspace's repository or an agent session's folder, named by id. A path from the window is never used. The preload bridge has a `shells` namespace; the capability set has `shells`, true in the shell and false when served; and the host has no route to any of it.
- [[TST-0107]] (`desktop/tests/shell-drawer.test.mjs`) has 5 checks on a fake pty. A real login shell ran through node-pty in plain node. In Electron, the drawer's walk will show it ([[TASK-0206]]).
