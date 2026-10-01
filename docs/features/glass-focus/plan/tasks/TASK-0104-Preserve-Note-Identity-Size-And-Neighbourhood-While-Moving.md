---
type: "[[task]]"
id: TASK-0104
title: "Preserve note identity, chosen size and neighbourhood while moving"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin: This sounds great update the documents to support this fully.", "[[ISS-0070]]", "[[ISS-0071]]", "[[ISS-0072]]", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
parent: "[[FEAT-0017]]"
effort: large
due: ""
depends: []
blocks: ["[[TASK-0098]]", "[[TASK-0099]]"]
related: ["[[DES-0003]]", "[[FEAT-0020]]", "[[ISS-0070]]", "[[ISS-0071]]", "[[ISS-0072]]", "[[RISK-0007]]"]
tests: ["[[TST-0052]]"]
---

# Keep one note and its neighbourhood intact

## Definition of Done

- [ ] A spatial note has one visible card or document per desk while focused. Related notes move from their actual cards; no duplicate or empty ghost remains. Reference rows may still identify the note.
- [ ] Opening respects the person's reading-size preference. Dragging a document never changes its size. Resizing remains available deliberately, and a saved note size wins over the persisted per-view reading-size preference, followed by the calibrated first-use default. Explicit resizing updates the note and view preference; moving or a temporary narrow layout never overwrites them. Older state without the preference loads safely, and windows on the same view read it through the existing store.
- [ ] Dragging the focused document preserves focus and moves its neighbourhood with its relative order intact. A larger-than-window arrangement keeps off-screen notes reachable through a named locate action and complete relationship list.
- [ ] Shared neighbours and already held notes reuse their existing spatial object. Closing or changing focus restores surviving objects without a full unexplained re-deal.
- [ ] Real pointer and keyboard checks cover repeated focus, interrupted drag, resize, view return and reduced motion in Glass and the shared Orbit focus behavior.
- [ ] Existing focus geometry, smoke and walk assertions that require a ghost, sixteen tiny copies or drag-to-exit are reconciled with the repaired contract. Record regression results and rendering cost before resolving ISS-0070/71/72.

## Steps

1. Read the three issue decisions and DES-0003. Reconcile shared identity, chosen size and group translation in the layout model together.
2. Implement the geometry and renderer changes with focused regression checks that fail on duplication, size jumps and dropped neighbours.
3. Update the executable checks behind TST-0051 and TST-0045 where their previous assumptions conflict. Retain coverage for unaffected zoom, keyboard, pointer and Orbit behavior.
4. Walk TST-0052 and retain before/after captures, counts and foreground measurements. Link evidence to each issue before changing its status.

## Boundaries

This task repairs the existing focus contract. TASK-0097 owns the new document presentation and opening calibration; TASK-0098 owns collection-to-document handoff. It adds no saved scenes, source writes or new cockpit payload. RISK-0007 tracks persisted identity and reading-size restoration; migration behavior must be tested if the stored shape changes.

## Verification

Not implemented or run. The revised acceptance walk describes the required result and records no pass.
