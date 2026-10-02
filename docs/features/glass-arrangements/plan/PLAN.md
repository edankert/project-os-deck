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
5. The independent review. Round one, on 2026-10-02, requested changes: five claims were refuted. The fixes are six commits merged in `199699f`, with the walk's `e158c73` and one item of `972ce73`. Round two, the same day, found every refuted claim fixed as far as a node suite can show, and approved. The feature note's Review section lists each finding and what was done. Everything was run again at `18f5405` and held: 645 node tests, the smoke run, and the walk `glass-arrangements` with 59 checks.

## Recovery rules

These are the rules as built, the review's fixes included. Where one differs from the plan written on 2026-10-01, the feature note's Decisions say what changed.

A preview is transient and changes no stored layout. When the desk, the window, the notes or a note's links change while a preview is shown, the application works the preview out again and says what changed, in the preview and in the status line; a preview about a note that has been closed is withdrawn. Apply applies only a plan that has been shown: when the plan changes at the very press, that press shows the new plan and the next one applies it. Apply records what it moves for one undo, kept in the window for that workspace and that view, then changes only the objects the preview named. A plan is made from the collection as the store holds it, and writes where the collection stands and whether it is folded, never its width or height.

When a document is moved, resized or closed by hand after an arrangement, or the collection is changed, the undo names each changed object first and puts back the rest only on a second press. When more has changed by the time of that press, it puts nothing back and asks again with the new list. A note opened since the arrangement keeps its place in the stack. An undo never opens a closed note again and never replaces a note's text. The record is not offered on another view, and it is forgotten when another workspace is opened.

Compare is about the two documents on top. With one note open it says it needs two and moves nothing. With more than two open it takes the top two, and the preview says the others stay where they are. Both keep their sizes; in a window too narrow for both they overlap, and the preview says by how many pixels and how the one underneath is reached. In a narrow field the bar reaches each by name. An undo also puts back the focus, the open list of related notes and the relationship that was picked out. The walk `glass-arrangements` checks the last of these on screen.

## Boundaries

Applied layout follows existing desk saving. Preview, undo and current relation emphasis remain per-window session state. No named presets, camera saving, independently filtered second collection or structured evidence payload is added here. FEAT-0023 and FEAT-0021 retain those later decisions.
