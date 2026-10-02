---
type: "[[test]]"
id: TST-0067
aliases: ["TST-0067"]
title: "A collection counts exactly the notes its view returns, keeps where it stands and never its rows, announces a changed result before applying it, and comes back to the same row"
status: active
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/collection.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh collection"
covers: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]"]
issues: []
tasks: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
---

# A collection counts exactly and keeps its place

## Purpose

The collection is the view's list as an object on the Glass desk. What it is allowed to remember and what it must derive every time is the whole of REQ-0001, and that rule lives in one pure module, `desktop/src/shared/collection.ts`, with the store's part in `desktop/src/shared/store-state.ts`. This suite checks the rule without a window.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh collection`.

## Expected results

- The count is the number of distinct notes in the groups the source returned, including notes held under another note, and a note the source repeats is counted once.
- A narrowed list says "N of M notes" and names what narrows it.
- The header says how many members have a place in the field and how many are in the list only.
- What the store keeps for a collection is six values: where it stands, its size, whether it is collapsed and how it is presented. No row, id or count is kept.
- A state file with no collection, or with half of one, opens with the default placement.
- A collection is drawn wholly inside the field it is in, so its resize corner is in reach.
- A changed result is described as added, removed and changed, and is not applied by being described.
- When the selected note leaves the result the text names it, and says its document stays open when one is.
- The scroll position is kept as a note and the heading it is under, so a list that gains rows above comes back to the same row, and a note listed under two headings comes back to the row that was meant.
- While the pointer rests on the list, the row under it stays where it is when rows arrive above it. When that row leaves, the row below it is the one held still.
- Rows that come from the desk keep their order while a person is on the list, and new ones are added after them.
- A tablet is told the layout of a workspace it can open, and cannot change it.

## Evidence

This test has a `command:`, so it records no verdict here; CI is the verdict.

**2026-10-02**, commit `9379a0c`: `npm test` in `desktop/` ran every suite and passed 586 of 586. Seventeen of those tests are this suite's. `9379a0c` is the last commit to change application code before the verification pass at `4243fc2`.

The suite began with 13 tests when the collection was built (commit `762bdfd`). Four came with defects the walks found: one about a note listed under two headings (`598ecc9`), and three about rows holding still under the pointer (`d91fc7e`). The last three Expected results above were added on 2026-10-02 to name what those tests check.

What the suite cannot show is the list on screen. That is [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]] and [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]], and the `collection` part of the smoke run, 17 checks of 17 at `4243fc2`.
