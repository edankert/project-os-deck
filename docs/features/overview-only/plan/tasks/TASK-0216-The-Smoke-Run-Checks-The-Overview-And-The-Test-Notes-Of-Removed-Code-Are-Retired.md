---
type: "[[task]]"
id: TASK-0216
aliases: ["TASK-0216"]
title: "The smoke run checks the overview, and the test notes of removed code are retired"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["Edwin 2026-10-23: 'tag and remove; park Vault too'"]
parent: "[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"
effort: M
due: ""
depends: ["[[TASK-0215]]"]
blocks: []
related: ["[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]"]
tests: ["[[TST-0109]]"]
---

# The smoke run checks the overview, and dead test notes are retired

**After this task CI's `deck-smoke` job opens the overview in a real window, and no test note describes code that is gone.**

## Definition of Done
- [ ] The smoke run's checks are about the overview, the agent pane and the shell drawer. It still fails on a page error.
- [ ] The container smoke passes on loopback and on the network (`tools/scripts/run-smoke.sh both`), and the `deck-smoke` job passes in CI.
- [ ] Every test note in the retire list below is `retired`, with one line naming ADR-0010 and the tag.
- [ ] Test notes that stay but name removed code in `covers:` or their procedure are rewritten.
- [ ] RISK-0007 and RISK-0008 are `closed`: the code they watched has left main.

## Retire list (from the preflight)
- Spread, desks and windows: TST-0004, TST-0008, TST-0009, TST-0014, TST-0016, TST-0017, TST-0018, TST-0019, TST-0020.
- Views and descriptions: TST-0006, TST-0027, TST-0030, TST-0031, TST-0032.
- Glass, hands, zoom, focus, bands: TST-0023, TST-0024, TST-0038, TST-0040, TST-0041, TST-0042, TST-0043, TST-0044, TST-0045, TST-0048, TST-0049, TST-0050, TST-0051, TST-0052, TST-0053, TST-0054, TST-0055, TST-0056, TST-0057, TST-0065.
- The orbit: TST-0025, TST-0046, TST-0047.
- Collections, arrangements, scenes, handoff, evidence: TST-0063, TST-0064, TST-0066, TST-0067, TST-0068, TST-0069, TST-0070, TST-0071, TST-0072, TST-0073, TST-0074, TST-0075, TST-0076, TST-0077, TST-0078, TST-0079.
- Left over from cancelled FEAT-0019: TST-0059 (`ready`).
- Passing ones among them: TST-0045, TST-0068, TST-0069, TST-0071, TST-0072, TST-0076, TST-0079.

## To read before deciding
- TST-0003 (window placement), TST-0012 (two windows), TST-0039 (served state), TST-0037 (a note cannot run script in the window that writes; `passing`): retire or rewrite, depending on what TASK-0214 and TASK-0215 kept.
- TST-0005 and TST-0034 (addresses), TST-0036 (smoke support), TST-0007 (host; drop FEAT-0024 and REQ-0006 from `covers:`), TST-0015 (Parity's acceptance test, which covers FEAT-0005): rewrite, not retire.

## Notes
`tools/scripts/run-smoke.sh`, `smoke-in-a-box.sh` and `walk-in-a-box.sh` are Deck's own scripts; upstream project-os has none of them, so they may be edited here.
