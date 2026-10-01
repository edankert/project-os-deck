---
type: "[[requirement]]"
id: REQ-0001
title: "Glass collections remain exact and interactive"
status: approved
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin 2026-10-01: This sounds great update the documents to support this fully.", "[[DES-0003-Collections-And-Documents-On-Glass]]", "Edwin 2026-10-01: 'Agree but I also want to see the actual note detailed/text view to be visible as part of the desktop and the derived lists should also be visible in the actual view to interact with not to the side like they currently are. Review and suggest how to handle this'", "[[REFERENCE-GLASS-AND-COCKPIT-LEVELS-REVIEW]]"]
priority: high
scope: "Glass in Deck's current seven project-os views"
acceptance: ["The current view's derived rows, groups, count, search, filters and keyboard operations are usable in a readable collection on the main Glass surface.", "A collection count identifies the exact rows counted, including rows whose field cards are out of sight or not placed.", "Collapsing, reopening and closing a selected document preserve collection size, selection and scroll anchor; changed results are announced before the person applies them, and removed selections are explained.", "Collection wheel input scrolls rows without moving the field at a boundary; keyboard focus and an explicit return remain usable with overlapping objects and a narrow window.", "Saved collection state holds query identity, filters and layout, then resolves current rows; an old desk without that state opens with safe defaults."]
implements: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
verifies: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
related: ["[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[ISS-0086-The-Outer-Field-Leaves-186-Notes-Unplaced-And-The-Features-Title-Says-Every-Note-Has-A-Place]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Glass collections remain exact and interactive

## Statement

The current view's derived list must be a readable, interactive object on the main Glass surface. The sidecar's current groups and Deck's view description remain authoritative for membership and presentation.

## Acceptance Criteria

- [ ] The current view's derived rows, groups, count, search, filters and keyboard operations are usable in a readable collection on the main Glass surface. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] A collection count identifies the exact rows counted, including rows whose field cards are out of sight or not placed. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] Collapsing, reopening and closing a selected document preserve collection size, selection and scroll anchor; changed results are announced before the person applies them, and removed selections are explained. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] Collection wheel input scrolls rows without moving the field at a boundary; keyboard focus and an explicit return remain usable with overlapping objects and a narrow window. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] Saved collection state holds query identity, filters and layout, then resolves current rows; an old desk without that state opens with safe defaults. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]

## Approval

Approved for building on 2026-10-01. Edwin asked for this direction to be implemented in full and named DES-0003 as the baseline: “Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

## Traceability

- Implements: [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]
- Verified by: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
