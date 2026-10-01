---
type: "[[plan]]"
title: "Add collection forms and reversible arrangements"
status: active
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
implements: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]"]
---

# Add collection forms and reversible arrangements

## Delivery sequence

1. Complete FEAT-0020's core collection and document path and TASK-0104's continuity repair. Approve REQ-0003 before implementation.
2. TASK-0101 adds one collection's stack/table/cards states, live membership and compatibility behavior.
3. TASK-0102 adds Read/Compare/Show related previews, apply/cancel, labelled undo and supported relationship emphasis. Compare explicitly shows both full documents rather than invoking the single-focus dock.
4. TASK-0103 walks every form and arrangement with real data, measures cost, and records mistakes and lost context alongside completion time.

## Recovery rules

Preview is transient and changes no persisted layout. Apply records the current arrangement for one per-window undo, then changes only the affected layout. A later manual move or incompatible object change invalidates that undo with an explanation. A live result update invalidates a preview whose membership changed; regenerate it from the accepted update. Undo never resurrects a deleted subject or replaces current note content with a snapshot.

Compare requires two selected notes. If fewer are selected, show how to choose the missing note without moving the desk. If more are selected, ask the person to choose the pair. Keep both readable and allow sequential navigation on narrow windows. Restoring the prior arrangement also restores its relation emphasis.

## Boundaries

Applied layout follows existing desk saving. Preview, undo and current relation emphasis remain per-window session state. No named presets, camera saving, independently filtered second collection or structured evidence payload is added here. FEAT-0023 and FEAT-0021 retain those later decisions.
