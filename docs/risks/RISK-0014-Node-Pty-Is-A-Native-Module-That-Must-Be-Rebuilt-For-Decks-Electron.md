---
type: "[[risk]]"
id: RISK-0014
aliases: ["RISK-0014"]
title: "node-pty is a native module that must be rebuilt for Deck's Electron, so an install or an Electron update can leave the shell drawer unable to start"
status: open
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"]
phase: "[[PHASE-0004-Parity]]"
likelihood: high
impact: medium
mitigation: ["[[TASK-0205]]"]
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]"]
---

# node-pty is a native module that must be rebuilt for Deck's Electron

## Description

Deck has had no native module until now. node-pty compiles against one runtime; the build Electron needs does not load in plain node, which runs Deck's suites, and the reverse. CI installs with `ELECTRON_SKIP_BINARY_DOWNLOAD=1` and may lack a compiler. An Electron upgrade needs a rebuild.

## Mitigation

- Rebuild for Electron 32.3.3 in an install step that is written down
- Create ptys through an injected factory so node suites use a fake
- Check that CI's install still succeeds with node-pty listed

## Triggers

- The drawer opens with an error about a module version; `npm ci` fails in CI; a suite crashes loading node-pty.
