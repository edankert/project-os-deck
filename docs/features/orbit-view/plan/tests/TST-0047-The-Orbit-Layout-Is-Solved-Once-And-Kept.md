---
type: "[[test]]"
id: TST-0047
aliases: ["TST-0047"]
title: "The orbit’s layout is solved once and kept, fills the cylinder, moves nothing already placed when a note arrives, and marks an orphan and a cluster held on by one link"
status: active
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[TASK-0002-The-Layout-Is-Computed-Once-And-Kept]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/orbit.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh orbit"
covers: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
issues: []
tasks: ["[[TASK-0002-The-Layout-Is-Computed-Once-And-Kept]]", "[[TASK-0003-The-Field-Renders-And-Flies]]"]
artifacts: []
adequacy: "Measured 2026-09-10 against the built modules, six mutations and six killed. Putting orphans in the crowd fails 1. Relaxing pinned notes when one arrives fails 1. Leaving out the spread fails 1 (the hub-dominated corpus). Counting leaves as bridges fails 1. A depth that ignores inbound links fails 1. Never solving again after a material change fails 1."
mutation_score: "6 mutations, 6 killed (2026-09-10)"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0025-A-Planted-Orphan-And-A-Single-Edge-Cluster-Are-Visible]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---
# The orbit's layout is solved once and kept

## Purpose

A force layout over thousands of links cannot run on every open, and a field that settles differently each time cannot be learned. [[TASK-0002-The-Layout-Is-Computed-Once-And-Kept]] solves it once, keeps it, and places a new note without moving anything already placed. This suite checks that, and the automated half of [[TST-0025-A-Planted-Orphan-And-A-Single-Edge-Cluster-Are-Visible]]: a planted orphan and a planted cluster held on by one link are found and marked.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh orbit`.

## Expected results

- A random corpus and a corpus dominated by three hubs both fill the cylinder: more than half its height and most of the way round.
- Two solves of the same corpus give identical positions.
- A planted orphan stands in the orphan band along the top, and no other note does.
- The link joining a planted four-note cluster to the rest is found as a bridge, and a leaf is not.
- The planted cluster stands apart from the main one.
- A note added and linked moves no existing note, and lands near its links; a material change solves again and says so.
- Nearer means more linked-to.
- A corpus of 1600 notes and 16000 links is solved in well under twenty seconds.

## Evidence

2026-09-10: 10 of 10 pass; the 1600-note corpus solved in 537 ms.

## Adequacy (who verifies this test?)

See `adequacy:` above.
