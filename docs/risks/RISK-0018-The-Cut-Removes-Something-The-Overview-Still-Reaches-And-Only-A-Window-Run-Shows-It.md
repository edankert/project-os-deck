---
type: "[[risk]]"
id: RISK-0018
aliases: ["RISK-0018"]
title: "Removing the original Deck takes out an element, a style or a channel the overview still reaches, and only a run in a real window shows it"
status: open
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["Risk scan for [[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]], 2026-10-23: a directory layout change"]
phase: "[[PHASE-0005-Overview]]"
likelihood: medium
impact: medium
mitigation: ["[[TASK-0216]]"]
related: ["[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]"]
---

# The cut removes something the overview still reaches

## Description

**The overview could lose a piece it needs, and no node suite would notice.** The TypeScript compiler catches a removed module that is still imported. It does not catch an element the overview looks up by id in `index.html`, a rule in `deck.css` it relies on, or an IPC channel name it calls. Those fail only when a real window runs, and today the only such runs are the container smoke and the overview's run in the box (TST-0093).

## Mitigation

- Remove the page before the main process ([[TASK-0214]] before [[TASK-0215]]), so a channel is dropped only after nothing calls it.
- Run the container smoke on loopback and on the network after each code task, and the overview's run in the box once before pushing ([[TASK-0216]]).
- Keep the smoke failing on any page error.

## Triggers

- A page error in the smoke log, or an overview screen that opens empty.
- A button on the rail, the agent pane or the shell drawer that does nothing.
