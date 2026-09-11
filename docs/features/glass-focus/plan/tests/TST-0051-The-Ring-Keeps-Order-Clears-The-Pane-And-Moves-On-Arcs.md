---
type: "[[test]]"
id: TST-0051
aliases: ["TST-0051"]
title: "The ring around an opened note keeps its neighbours' order, never overlaps the pane, counts what it cannot hold, and moves them by angle and distance rather than through the middle"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[TASK-0067-The-Ring-Is-A-Pure-Layout]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/focus-ring.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh focus-ring"
covers: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
issues: []
tasks: ["[[TASK-0067-The-Ring-Is-A-Pure-Layout]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[DES-0002-The-Glass-Cockpit]]"]
---

# The ring keeps order, clears the pane and moves on arcs

## Purpose

The ring's layout is a pure module, so the four promises that make it usable are checked in node over many field sizes: no mini note lies over the pane or another mini note; neighbours keep the circular order they had; a neighbour that does not fit is counted, never dropped; and nothing moves through the middle of the field. DES-0002 rev 5 found a ring overlapping the open card, which is why the first promise is checked over a range of sizes rather than one.

**This note must be committed together with its suite.** `command:` names `focus-ring`, and [[TASK-0067-The-Ring-Is-A-Pure-Layout]] writes `desktop/tests/focus-ring.test.mjs`. Until that file exists, `python3 tools/scripts/run-tests.py` reports this test failing with exit 2, the failure [[ISS-0028-A-Test-Note-Names-A-Suite-That-Does-Not-Exist]] recorded. Written at planning time on 2026-09-11 and not committed then.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh focus-ring`.

## Expected results

- Over fields from 700 by 480 to 2560 by 1300 px, with and without a dock, and 1 to 16 neighbours: no overlap with the pane or between mini notes, all inside the field and outside the dock.
- 16 neighbours: 16 places; 17: 15 and "+2 more"; 40: 15 and "+25 more"; a small field: fewer places, and places plus N equal the neighbours.
- The priority order decides who is left out: the note the person came from, held, joined to another held note, owed, linked from before linking to, then id.
- The circular order by angle before equals the circular order on the ring.
- The note the person came from sits opposite the new focus's direction within half a place's spacing.
- Neighbours with only a bearing go on their side; neighbours from outside the view sit at the bottom by id; the output is deterministic.
- The path hits both ends exactly, goes the short way round, and never comes closer to the middle than the nearer end.
- The easing is symmetric and slow at both ends; the two stages add up to 1000 ms.

## Evidence

2026-09-11: `bash tools/scripts/run-desktop-tests.sh focus-ring`, 11 of 11; `npm test`, 428 of 428.

## Adequacy (who verifies this test?)

Measured 2026-09-11, one break per run; each failed a check: a circle sized from the pane's width only; the order taken by id instead of by angle; straight-line paths; the "+N more" card dropped with its notes uncounted.
