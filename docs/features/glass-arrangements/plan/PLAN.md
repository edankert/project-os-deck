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

1. Complete FEAT-0020's core collection and document path and TASK-0104's continuity repair. Approve REQ-0003 before implementation. Done: REQ-0003 was approved on 2026-10-01.
2. TASK-0101 adds one collection's stack, table and cards forms, live membership and what an old saved desk opens as. Built in commit `b017807`. Done: every box is ticked, the last two from checks added to the walk `glass-arrangements` in commit `c5af79f`.
3. TASK-0102 adds the previews of Read, Compare and Show related, Apply and Cancel, the labelled undo and the picking out of one relationship. Compare stands both full documents side by side and does not use the single-focus dock. Built in the same commit. Done: every box is ticked, the last from the walk's check that an undo puts back the relationship that was picked out.
4. TASK-0103 walks every form and arrangement with real data, measures cost, and records mistakes and lost context alongside completion time. A script has driven the route and measured in the Linux box, including two documents that overlap, the wheel turned to the last row of cards, and a turn of the field after each arrangement. The person's walk and the measurement on the Mac have not happened, so the task is open and the feature stays `doing`.

## Recovery rules

These are the rules as built. Where one differs from the plan written on 2026-10-01, the feature note's Decisions say what changed.

A preview is transient and changes no stored layout. Apply records what it moves for one undo, kept in the window, then changes only the objects the preview named. When a document is moved, resized or closed by hand after that, or the collection is changed, the undo names each changed object first and puts back the rest only on a second press. When the desk, the window or the notes change while a preview is shown, the application works the preview out again and says so; a preview about a note that has been closed is withdrawn. An undo never opens a closed note again and never replaces a note's text.

Compare is about the two documents on top. With one note open it says it needs two and moves nothing. With more than two open it takes the top two, and the preview says the others stay where they are. Both keep their sizes; in a window too narrow for both they overlap and the preview says by how many pixels, and in a narrow field the bar reaches each by name. An undo also puts back the focus, the open list of related notes and the relationship that was picked out. The walk `glass-arrangements` checks the last of these on screen.

## Boundaries

Applied layout follows existing desk saving. Preview, undo and current relation emphasis remain per-window session state. No named presets, camera saving, independently filtered second collection or structured evidence payload is added here. FEAT-0023 and FEAT-0021 retain those later decisions.
