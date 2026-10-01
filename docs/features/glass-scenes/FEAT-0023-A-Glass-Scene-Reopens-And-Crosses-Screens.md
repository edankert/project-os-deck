---
type: "[[feature]]"
id: FEAT-0023
title: "A Glass scene reopens and crosses screens without losing its work"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin: This sounds great update the documents to support this fully.", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
goal: "A person can return to a named arrangement of live collections and documents and send a document between displays without losing identity or reading position."
requirements: []
tasks: []
release: ""
acceptance_exception: ""
related: ["[[DES-0003]]", "[[ADR-0006]]", "[[FEAT-0015]]", "[[FEAT-0014]]", "[[FEAT-0020]]", "[[FEAT-0022]]", "[[RISK-0007]]", "[[PHASE-0002]]"]
---

# Return to a Glass scene and carry work across screens

## Findings

Edwin endorsed named scenes and polished handoff as later steps after the readable desk and reversible arrangements. This feature records those steps without extending current persisted state implicitly.

A scene is a named arrangement of live collection queries and note identities, such as “Review Glass” or “Compare designs”. Reopening resolves current content and exact current memberships. A scene must never pass a saved result copy off as a live query.

The scene should restore useful positions, presentations, sizes and a meaningful reading anchor. Missing or inaccessible notes remain labelled so a reopened scene explains what changed. A smaller window or disconnected display keeps every object reachable and discloses any rearrangement.

The cross-screen handoff builds on the existing throw and named-window send routes. Preview the destination before release, indicate arrival, preserve the document's chosen size and reading position, and offer a return route. The destination must acknowledge the handoff before the source discards ownership. A cancelled or failed send leaves the source usable. Define move versus additional-window reference explicitly so handoff cannot create accidental duplicate objects in a desk.

Keyboard users get the same destination choice and return command. Reduced motion omits travel without omitting arrival feedback. The served tablet remains a read-only companion; remote arrangement and writes require a separate authority decision. Headset input is not part of this feature.

## Open questions before implementation

- Which values are part of a named scene versus ordinary per-view desk state or per-window session state? Decide whether camera yaw, zoom, active subject and scroll anchors persist, with defaults and migration from existing desks.
- How are scene IDs addressed, renamed, deleted and recovered? Which stored version identifies the schema, and what happens when it cannot be read?
- How do current query results reconcile with removed notes, changed permissions, moved files and independently rearranged objects?
- Which host owns cross-window placement and the handoff acknowledgement? How does cancellation, destination closure or display disconnection recover without duplication?
- How are scene undo and arrangement undo presented without implying that source edits can be reversed by either?

## Delivery boundary

Start after FEAT-0020 and FEAT-0022 establish object identity and reversible arrangements. Run feature scaffold, impact analysis and risk scan at adoption; author the persistence decision, requirements, tasks and one acceptance walk then. Revisit RISK-0007 at that point. This backlog note has no implementation tasks or prematurely owed acceptance check.
