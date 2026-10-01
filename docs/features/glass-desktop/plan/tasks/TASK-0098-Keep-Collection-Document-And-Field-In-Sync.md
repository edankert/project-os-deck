---
type: "[[task]]"
id: TASK-0098
title: "Keep collection, document and field in sync"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: ["[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]", "[[TASK-0096-Draw-And-Operate-The-Collection-In-Glass]]", "[[TASK-0097-Open-The-Full-Note-As-A-Glass-Document]]"]
blocks: ["[[TASK-0099-Walk-The-Glass-Desktop-At-Real-Scale]]"]
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Keep collection, document and field in sync

## Definition of Done

- [ ] Opening a row highlights the same note in the field and leaves the collection available; opening a field card reveals its row.
- [ ] Closing the document returns focus to the same row and scroll anchor; opening another note preserves both objects and their arrangement.
- [ ] A note appears once while lifted, its chosen size stands and its neighbourhood moves with it, as the existing ISS-0070/71/72 decisions require.

- [ ] Opening an already held note locates and raises it; one shared neighbour is one spatial card even when linked to multiple open subjects.
- [ ] A missing initiating row after refresh has an explicit explanation and returns focus to the collection; Find open note returns an off-screen document to reach.
- [ ] Relationship labels use reliable source fields only; generic links retain direction and a complete keyboard-accessible list.
- [ ] Local Escape closes a menu or cancels a local operation before the established focus and desk sequence; one event triggers only one exit.

## Steps

- [ ] Define selection and focus handoff across row, card and document.
- [ ] Reconcile the three existing continuity issues with FEAT-0017, then check pointer, keyboard and second-window routes.

## Notes

This task links the existing issues; it does not file replacements for them.
