---
type: "[[requirement]]"
id: REQ-0003
title: "Glass arrangements preserve membership and reading size"
status: approved
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin 2026-10-01: 'This sounds great update the documents to support this fully.'", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
priority: high
scope: "One current Glass collection and the documents arranged beside it"
acceptance: ["Changing a collection between stack, table and cards preserves its exact current membership, count, filters, selected note and table scroll anchor.", "Arranged cards, field cards and open documents share one spatial identity per note, including neighbours shared by two subjects.", "Read, Compare and Show related offer a visible keyboard-operable preview, apply and cancel; Compare exposes two full documents at their chosen dimensions and reading positions.", "Apply and Undo arrangement change layout only, preserve readable text and source content, and announce incompatible changed state before applying a stale preview or undo.", "Relationship emphasis uses supported source meanings and retains an exact accessible list of every neighbour.", "All collection members and arranged objects remain reachable at large populations and narrow sizes; visible rendering limits never silently limit membership, and served-host authority stays read-only."]
implements: "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"
verifies: ["[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
related: ["[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
tests: ["[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
---

# Glass arrangements preserve membership and reading size

## Statement

Collection presentations and deliberate arrangements must preserve exact membership, one note identity and the person's reading size. The person can preview, cancel and reverse an arrangement without changing source content.

## Acceptance Criteria

- [ ] Changing a collection between stack, table and cards preserves its exact current membership, count, filters, selected note and table scroll anchor. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- [ ] Arranged cards, field cards and open documents share one spatial identity per note, including neighbours shared by two subjects. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- [ ] Read, Compare and Show related offer a visible keyboard-operable preview, apply and cancel; Compare exposes two full documents at their chosen dimensions and reading positions. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- [ ] Apply and Undo arrangement change layout only, preserve readable text and source content, and announce incompatible changed state before applying a stale preview or undo. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- [ ] Relationship emphasis uses supported source meanings and retains an exact accessible list of every neighbour. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
- [ ] All collection members and arranged objects remain reachable at large populations and narrow sizes; visible rendering limits never silently limit membership, and served-host authority stays read-only. — evidence to be collected: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]

## Approval

Approved for building on 2026-10-01. Edwin asked for this direction to be implemented in full and named DES-0003 as the baseline: “Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

## Traceability

- Implements: [[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]
- Verified by: [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]
