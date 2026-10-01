---
type: "[[feature]]"
id: FEAT-0017
aliases: ["FEAT-0017"]
title: "An opened note stands in the middle of its neighbours: in Glass and in the orbit a lifted note moves to the middle of the field, and the notes it is joined to gather on a ring around it"
status: review
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-10-01
source: ["Edwin 2026-09-11: 'when selecting something in orbit the main item should open up and all the directly connected items show as mini notes'", "Edwin 2026-09-11: 'when selecting in glass, the opened up item should replace the note (possibly move to the center?? Review and research how this work fully online) and the associated notes should show their connections and should be shown around the opened note.'", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "[[DES-0002-The-Glass-Cockpit]]", "Edwin: This sounds great update the documents to support this fully."]
goal: "A selected note opens at the person's chosen reading size with its existing related cards around it. Moving the document preserves that size and carries its neighbourhood. A note has one spatial object, and off-screen neighbours remain reachable."
requirements: []
tasks: ["[[TASK-0067-The-Ring-Is-A-Pure-Layout]]", "[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]", "[[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]", "[[TASK-0070-The-Orbit-Opens-A-Note-The-Same-Way]]", "[[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]]", "[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
release: ""
acceptance_exception: ""
design: ["[[DES-0002]]", "[[DES-0003]]"]
related: ["[[PHASE-0002-Glass]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "[[DES-0002-The-Glass-Cockpit]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0056-Reach]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]]", "[[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]", "[[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[ISS-0070]]", "[[ISS-0071]]", "[[ISS-0072]]", "[[FEAT-0020]]", "[[DES-0003]]"]
---

# An opened note keeps its size and neighbourhood

## Goal

The selected note opens as one document with its related notes around it. The document keeps the reading size the person chose. Moving it carries the neighbourhood without duplicating cards or re-dealing the whole field.

The original focus implementation exists and remains under review. ISS-0070, ISS-0071 and ISS-0072 record defects against Edwin's subsequent choices. TASK-0104 owns their coupled repair. The rules below describe the intended repaired behavior, not a claim that it has shipped.

## Scope and ownership

- Move the actual related cards into the neighbourhood. Each spatial note is represented once; remove the empty field-card ghost.
- Respect the selected document's stored size and the person's preference for newly opened documents. Moving is not resizing.
- Preserve relative neighbourhood order while dragging the document. Permit a workspace larger than the viewport, with a complete linked list and a named route to off-screen work.
- Keep pointer, keyboard, reduced-motion and shared Orbit focus behavior consistent.
- Preserve the field's unrelated slots and restore surviving objects when leaving focus.

FEAT-0020 owns the new on-desk collection, full-document presentation, input handoff and opening calibration. FEAT-0022 owns optional presentations and arrangement commands. Saved scenes belong to FEAT-0023. This feature does not introduce source writes or cockpit information levels.

## Current interaction decisions

1. **One note has one spatial object per desk.** A focused document and its neighbours reuse the existing note objects. A collection reference row or accessible list entry can remain visible. The original slot is reserved without drawing an empty frame.
2. **Chosen size is authoritative.** Opening and focus use the person's reading-size preference. An explicit resize can update it; a drag cannot. Neighbour count never forces the document to shrink.
3. **The neighbourhood uses readable cards in a larger workspace.** Preserve circular order and avoid crossing through the document. The former sixteen-mini-card viewport limit is not the repaired contract. Count and expose all related notes through the linked list, with location controls for off-screen cards.
4. **Movement preserves the group.** Dragging the focused header translates the document and neighbourhood together. It neither leaves focus nor re-deals unrelated cards. The resize control remains available deliberately.
5. **Shared objects are reused.** A held neighbour remains its document rather than gaining another ring card. A neighbour shared by two held subjects has one spatial representation and the appropriate connections.
6. **Connections state their source.** Keep incoming/outgoing direction and the source sentence where available. FEAT-0020 adds clear semantic labels only when supported by the source; FEAT-0022 may emphasize relation types without altering membership.
7. **The rest of the field retains context.** It can dim and step back, but it retains its unrelated slots. A person can select another note without losing already opened documents.
8. **Opening remains continuous and interruptible.** The initial implementation used a 300 ms grow followed by a 700 ms gather. DES-0003 and TASK-0097 now own calibration of a shorter opening for the new Glass desktop. No new timing claim is satisfied by the old measurement.
9. **Glass can retain several readable documents.** FEAT-0020 replaces the forced header-only dock rule for the on-desk collection/document surface. Collapsing a document is deliberate and reversible. Orbit retains its arrangement-specific presentation except for the shared continuity repairs.
10. **Escape consumes one state change.** A local menu, drag or preview consumes Escape first. Otherwise Escape leaves focus and keeps held documents; a subsequent deliberate Escape outside focus retains the existing sweep. Closing one document returns to its initiating reference when it survives.
11. **Input belongs to the object under it.** Scrolling text does not zoom the field, and dragging text selects text. Header drag moves the group. Keyboard users can perform the same movement, resize, locate and return operations.
12. **Reduced motion changes no outcome.** The same state appears directly with a static indication. Orbit drift stops while its note is focused, and its stable background arrangement returns when focus is left.
13. **Session and saved state stay distinct.** Existing desk positions and chosen sizes persist according to their contract. Focus and camera orientation remain session state until FEAT-0023 decides otherwise. The served tablet remains read-only.

## Acceptance

- A lifted note and each related spatial note are drawn once, at usable size, without a duplicate card or ghost.
- Resizing the document, moving it, opening another note and returning never causes an unexplained size jump. New notes use the chosen preference.
- Moving the document moves its neighbourhood with relative order intact; off-screen members can be located and reached through the complete relationship list.
- Existing unrelated cards do not re-deal because the focused document moved.
- An already held or shared neighbour is reused, with clear link direction and supported source context.
- Local Escape actions do not also sweep the desk. Closing a document preserves other documents and restores focus appropriately.
- Field zoom retains its pointer anchor; document scrolling and text selection do not drive the camera.
- The shared focus repairs work in Glass and Orbit, with keyboard and reduced motion.
- Arranging and navigating leave the source workspace unchanged. Any source write is outside this feature.

## Impact and decision provenance

Edwin's September 12 decisions in ISS-0070/71/72 supersede the original ghost, forced-size and drag-to-exit rules. His October 1 endorsement adds the FEAT-0020 document model and the direction in DES-0003. The earlier feature decisions are preserved in version history and completed task evidence; they are no longer competing instructions for the repair.

Checked FEAT-0010, FEAT-0014, FEAT-0015, FEAT-0016, the existing focus geometry and the current collection/document requirements REQ-0001/0002. The repair preserves their identity, scrolling, desk and write-boundary constraints. FEAT-0020 depends on TASK-0104 before its final walk. TST-0052 is updated to the intended repaired contract. TASK-0104 must reconcile the old executable assertions in TST-0051/TST-0045 during implementation, without claiming their historical passes verify the new behavior.

## Risk scan

No new external dependency, environment variable or authority is introduced. Persisted reading-size and restoration changes are covered by RISK-0007. TASK-0104 must check any stored-shape migration and measure the larger neighbourhood before resolving the three issues.

## Verification and current state

The September 11 implementation had passing automated checks under its original contract. That evidence remains in TASK-0067 through TASK-0071; it does not verify the revised acceptance above. The continuity issues remain open, TASK-0104 is backlog, and the revised TST-0052 has not been walked. This feature remains under review until its outstanding repairs and acceptance are resolved.

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Repair: [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]
- Acceptance: [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]]
- Existing geometry and smoke records: [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]], [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]
- Interaction specification: [[DES-0003-Collections-And-Documents-On-Glass]]
