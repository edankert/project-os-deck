---
type: "[[task]]"
id: TASK-0216
aliases: ["TASK-0216"]
title: "The smoke run checks the overview, and the test notes of removed code are retired"
status: done
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
- [x] The smoke run's checks are about the overview, the agent pane and the shell drawer. It still fails on a page error.
- [x] The container smoke passes on loopback and on the network (`tools/scripts/run-smoke.sh both`), and the `deck-smoke` job passes in CI.
- [x] Every test note in the retire list below is `retired`, with one line naming ADR-0010 and the tag, except seven passing walks, which are parked (see Verification).
- [x] Test notes that stay but name removed code in `covers:` or their procedure are rewritten.
- [x] RISK-0007 and RISK-0008 are `closed`: the code they watched has left main.

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

## Verification

- 2026-10-23, `bash tools/scripts/run-smoke.sh both` in the container: both halves `ok`, nothing failed and nothing skipped. With every check printed, the loopback half made 30 checks: the workspace and Deck's index (7), the overview in the window (6: it opens on the wheel, the wheel draws 405 tickets and a list twin of 485 rows, nothing of Spread or Glass is in the page, the rail offers the shell drawer, and an address naming the Spread surface opens the wheel and says so), the capabilities (4), the navigation guard (4), the served page (5), a script in a note (2) and the quit (2). The network half adds the tablet's routes over the machine's own address.
- The old-address check was shown to bite: with the sentence changed to say "gone", the loopback smoke failed on exactly that check, 29 passed and 1 failed, and passed again once the sentence was restored.
- `tools/scripts/run-smoke.sh` now prints every check line when `DECK_SMOKE_DEBUG=1`, whatever the verdict, so a passing run can say what it made.
- The overview's walks in the container, on a copy of the notes: the overview drive (TST-0093) passes, after [[TASK-0218]] fixed its count of the cockpit panel's rows and its served-page step now expects the wheel at once; towers-rubric 35 checks, agent-sessions 24, agent-needs 12 and shell-drawer 9, all holding. The nine Glass and Spread walks are removed, and the shared walk helpers keep only what the overview's walks use.
- Retired with one line naming ADR-0010 and the tag: 46 test notes in all across TASK-0214 to TASK-0216, 17 of them here (TST-0008, 0009, 0012, 0020, 0023, 0024, 0025, 0027, 0028, 0038, 0048, 0052, 0056, 0063, 0064, 0073, 0077). Its suite, `panels.test.mjs`, went with TST-0020. TST-0059 stays at `ready`: it was never run, and a retired manual test must say when it last was.
- **Seven walks that were `passing` are parked, not retired:** TST-0045, 0068, 0069, 0071, 0072, 0076 and 0079. Finished tasks and fixed issues rest on them, and a fresh clone (as CI makes, with no tag to hide older findings) refused 25 of those once the tests were retired. Each now carries a Parked callout and stays `passing` as the record of what it verified at the tag. TST-0076 and TST-0079 stay on the review grandfather list.
- Kept and rewritten: TST-0015 (Parity's day in Deck, now in the overview), TST-0037 (one guard of four is left, the script guard). TST-0003, TST-0005, TST-0010, TST-0011, TST-0013, TST-0026, TST-0036 and TST-0046 still describe code on main and are unchanged.
- RISK-0007 and RISK-0008 are closed.
