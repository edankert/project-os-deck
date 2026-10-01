---
type: "[[task]]"
id: TASK-0101
title: "Change a collection between stack, table and cards"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
parent: "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"
effort: medium
due: ""
depends: ["[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]"]
blocks: []
related: ["[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
tests: ["[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
---

# Change a collection between stack, table and cards

## Definition of Done

- [ ] One collection switches among compact stack, complete table and cards while preserving exact membership, filters, selected identity and table scroll anchor.
- [ ] The stack header exposes query, exact count and filters; expanding restores the selected expanded presentation.
- [ ] Cards reuse existing note identities and do not duplicate held documents or shared neighbours; the exact table can reach every member.
- [ ] Old saved desks gain safe presentation defaults, and reloaded collections resolve current members with explicit missing-query or missing-note messages.
- [ ] Drawing and animation are bounded by visible work while all members remain reachable; meaningful checks cover membership equality, identity and old-state restore.

## Steps

- [ ] Read the feature, requirement and design, including state ownership and recovery rules.
- [ ] Implement this task's behavior and meaningful checks against its definition of done.
- [ ] Record evidence and reconcile affected documentation before closing.

## Notes

This is planned implementation. No code or application verification is claimed by creating this note.
