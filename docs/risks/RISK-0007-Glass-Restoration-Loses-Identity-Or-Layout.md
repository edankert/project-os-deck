---
type: "[[risk]]"
id: RISK-0007
title: "Glass restoration loses identity or layout"
status: open
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
likelihood: medium
impact: high
mitigation: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]", "[[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]]", "[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
related: ["[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]", "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
---

# Glass restoration loses identity or layout

## Description

Collection query and layout fields and a remembered reading size extend the saved desk contract. Old state may omit those fields. A copied result set may reopen with stale membership, or a removed note may leave an unreachable pane. Switching presentation may accidentally create a second spatial object for a note that is already open.

## Mitigation

- TASK-0095 resolves query identities against current data, supplies defaults for old state and reports missing queries or notes without silently changing the collection.
- TASK-0101 uses one note identity across all presentations, retains exact membership and restores saved presentation with current rows. It covers an old desk and a removed member.
- TASK-0104 reads missing size preferences safely and gives explicit stored note size precedence over the default. It verifies old desks, multiple windows and resize/drag continuity.
- TST-0063 and TST-0064 walk restore, changed membership and narrow-window reachability with source-file state recorded before and after.

## Triggers

- Reopening a collection shows the old count after the live source changed.
- Switching form duplicates an open note or changes a source note's status.
- An old saved desk fails to load, silently loses notes, or changes their chosen reading size.

## Closure evidence

Close only after the linked mitigation tasks supply compatibility and restore evidence and the corresponding walks record their outcomes. The later scenes feature must repeat the scan before adding camera or cross-display persistence.
