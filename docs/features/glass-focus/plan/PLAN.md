---
type: "[[plan]]"
title: "Plan — an opened note stands in the middle of its neighbours"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-10-01
source: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]"]
implements: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[DES-0002-The-Glass-Cockpit]]"]
---

# Preserve the focused document and its neighbourhood

## Delivery sequence

The initial implementation tasks TASK-0067 through TASK-0071 are complete under the earlier contract. They are historical implementation evidence. The remaining repair is [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]], which resolves the coupled identity, size and movement defects in ISS-0070/71/72.

1. Establish one spatial object per note and reserve the source slot without drawing a ghost.
2. Feed chosen document dimensions into the layout. Move the existing related cards in a larger workspace and translate the group on a document drag.
3. Provide keyboard and named locate routes for off-screen members. Reuse held and shared neighbours.
4. Reconcile the old geometry and smoke assertions, walk TST-0052, and record performance and source-unchanged evidence before closing the issues.

## Dependencies

TASK-0104 precedes FEAT-0020's final integration and acceptance in TASK-0098/0099. The source remains the current context/graph routes; no new cockpit payload is needed. FEAT-0020 owns opening-motion calibration and the on-stage collection/document surface. FEAT-0022 owns explicit arrangement commands.

## Resolved choices and remaining calibration

The document's chosen size, removal of the ghost, movement of the existing cards and movement of the neighbourhood were already chosen by Edwin in the linked issues. They do not wait on another approval. A larger workspace replaces the former requirement to fit sixteen mini cards into the viewport. The repair chooses spacing and locate-control details against DES-0003 and records the result in TASK-0104. Full graph expansion is outside this task.
