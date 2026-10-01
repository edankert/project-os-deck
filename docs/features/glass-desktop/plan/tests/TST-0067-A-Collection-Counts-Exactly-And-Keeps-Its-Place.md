---
type: "[[test]]"
id: TST-0067
aliases: ["TST-0067"]
title: "A collection counts exactly the notes its view returns, keeps where it stands and never its rows, announces a changed result before applying it, and comes back to the same row"
status: active
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
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
