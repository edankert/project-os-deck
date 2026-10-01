---
type: "[[task]]"
id: TASK-0095
title: "Model an exact derived collection on the desk"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: []
blocks: ["[[TASK-0096-Draw-And-Operate-The-Collection-In-Glass]]"]
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Model an exact derived collection on the desk

## Definition of Done

- [ ] A collection identifies its view/query, filters, selected note and layout without storing a copy of the result rows.
- [ ] A count resolves to the exact member ids from the current source, including notes outside the visible field; a changed result is announced before reordering under a pointer.
- [ ] Per-view desk and window state obey the existing save, reload and address rules; automated checks cover those boundaries.

- [ ] Old saved desks without collection fields reopen with safe defaults; persisted state holds current query identity, filters and layout rather than rows.
- [ ] Refresh offers an explicit apply step without reordering under the pointer; if a selected subject leaves the result, its document stays usable and the collection explains why.
- [ ] Selection and scroll anchor are tracked by note identity so collapse/expand and document close restore context.

## Steps

- [ ] Trace current `NavigatorList` rows, view descriptions and desk serialization.
- [ ] Define collection identity and state ownership, then implement exact membership and restoration.

## Notes

This task uses existing sidecar groups. It does not create the cockpit's proposed four-flow payloads.
