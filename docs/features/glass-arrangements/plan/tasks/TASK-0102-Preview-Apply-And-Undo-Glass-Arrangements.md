---
type: "[[task]]"
id: TASK-0102
title: "Preview, apply and undo Glass arrangements"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
parent: "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"
effort: medium
due: ""
depends: ["[[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]]", "[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
blocks: []
related: ["[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
tests: ["[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
---

# Preview, apply and undo Glass arrangements

## Definition of Done

- [ ] Read, Compare and Show related provide keyboard-operable preview, apply and cancel with named affected objects.
- [ ] Compare keeps two full documents readable, preserves dimensions and reading positions, and has an explicit route back to the previous arrangement.
- [ ] Apply never shrinks chosen text or pane size; narrow windows use navigation or the wider workspace and keep the collection reachable.
- [ ] Undo arrangement restores only layout and emphasis, leaves note edits intact, and is invalidated with explanation after an incompatible manual move or object change.
- [ ] A changed result invalidates an affected preview before apply; recomputing uses the accepted current result rather than a copied member list.
- [ ] Relation emphasis uses supported types, reports the emphasized subset and retains the complete accessible neighbour list with one card per shared identity.
- [ ] Reduced motion applies directly, local Escape cancels preview without sweeping the desk, and pure geometry/state plus real-pointer checks exercise these transitions.

## Steps

- [ ] Read the feature, requirement and design, including state ownership and recovery rules.
- [ ] Implement this task's behavior and meaningful checks against its definition of done.
- [ ] Record evidence and reconcile affected documentation before closing.

## Notes

This is planned implementation. No code or application verification is claimed by creating this note.
