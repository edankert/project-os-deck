---
type: "[[adr]]"
id: ADR-0006
title: "Collections and documents occupy the Glass desk"
status: accepted
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin 2026-10-01: 'Agree but I also want to see the actual note detailed/text view to be visible as part of the desktop and the derived lists should also be visible in the actual view to interact with not to the side like they currently are. Review and suggest how to handle this'", "[[REFERENCE-GLASS-AND-COCKPIT-LEVELS-REVIEW]]", "Edwin: This sounds great update the documents to support this fully."]
decision: "Option 3: in Glass, the current derived collection and a full-note document occupy the main desktop surface as arrangeable objects. Their source, note identity and legal actions remain the existing sidecar and view-description contracts."
decided_option: 3
context: "The fixed navigator is 264 pixels wide, and a widened reader moves into a separate column. Those placements keep the two most important work objects outside the main Glass surface."
alternatives: ["Keep the fixed navigator and separate reader column", "Put the list on the surface but keep full text in the reader column", "Put both the collection and full note on the surface"]
consequences: ["Amend PHASE-0002's navigator and reader scope statements", "Keep the collection's query identity and layout in the per-view desk, but derive rows from the live source", "Keep the sidecar's rendered HTML and legal actions in the document", "Leave cockpit DES-0015 and DES-0016 unadopted"]
supersedes: ""
superseded: ""
amends: ""
related: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[PHASE-0002-Glass]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[DES-0002-The-Glass-Cockpit]]", "[[DES-0003]]", "[[FEAT-0022]]", "[[FEAT-0023]]"]
---

# Collections and documents occupy the Glass desk

## Context

Edwin wants the derived list and full note text to be visible and interactive in Glass itself. The current navigator and reader are useful but occupy fixed side columns. The collection and document need a shared identity and arrangement model so a row, field card and open note remain one subject.

## Options

1. **Keep the side columns.** Existing code stays, but the requested desktop interaction is absent.
2. **Move only the collection.** The list becomes spatial furniture, but opening a note still takes the reader away from it.
3. **Place both on the Glass desk.** The collection and document can be moved, resized, stacked or tiled. This costs layout and keyboard work but meets the request.

## Decision

**Accepted: option 3.** Edwin endorsed the reviewed direction and asked for the documents to support it fully on 2026-10-01. The collection and full authored note are objects on the main Glass desk. The collection row remains a reference to the single spatial note object. Opening, moving and closing preserve identity, reading size and a route back to the selected row.

[[DES-0003-Collections-And-Documents-On-Glass]] specifies the interaction for [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]] and the separately planned [[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]. Its new illustrated details remain proposed and its timing values are calibration candidates. [[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]] records later scene persistence and handoff decisions. This ADR does not accept the cockpit's proposed four flows or seven levels, introduce a write route, or authorize a renderer migration.

## Alternatives

- Fixed list and separate reader.
- On-stage list with a side reader.

## Consequences

- PHASE-0002's fixed navigator and reader boundary need an explicit amendment.
- The source of list membership and note text remains unchanged. A saved desk records a collection query and arrangement, not a copied result.
- The acceptance walk must cover keyboard and screen-reader use as well as pointer layout.

## Decision record

> [!note] Accept — 2026-10-01 (user:edwin)
> This sounds great update the documents to support this fully.

This response endorses the preceding Glass interaction review and option 3's on-desk placement. Detailed calibration, saved-scene contracts and cockpit flow adoption retain their named owners above.
