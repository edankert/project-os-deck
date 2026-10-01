---
type: "[[test]]"
id: TST-0064
title: "Glass collections and arrangements stay exact"
status: active
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
scope: feature
level: acceptance
entrypoint: "Glass collection presentation and arrangement controls in Deck"
command: ""
last_verified: ""
covers: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
issues: []
tasks: ["[[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]]", "[[TASK-0102-Preview-Apply-And-Undo-Glass-Arrangements]]", "[[TASK-0103-Walk-Collection-Forms-And-Arrangements-At-Scale]]"]
artifacts: []
related: ["[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
area: glass-arrangements
after: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Glass collections and arrangements stay exact

## Setup

Use a disposable real workspace with more collection members than fit on screen. Choose two long documents with different stored sizes and reading positions, plus a neighbour linked to both. Record the current query, filters, complete member IDs and source revision. Keep an older saved desk and capture the workspace file state before starting. Record build, viewport, display and input settings. The core TST-0063 route must be usable first.

## Steps

1. Open the collection as a table, select a row halfway down and apply a filter. Change to stack, expand, change to cards and return to table. Compare count and membership against the recorded current query at every step.
2. Open a member document, then expand the collection as cards. Locate that subject and the shared neighbour. Reach a member outside the viewport using the complete table and return to the previous selection.
3. Preview Read, then cancel. Capture positions before and after. Preview again and apply it. Inspect chosen size, reading position and access to the collection.
4. Select two long notes, preview Compare and apply it. Read both full documents and follow a local link. Use Undo arrangement and compare the restored positions, sizes and emphasis with the pre-apply capture.
5. Try Compare with one selected note, then with three. Verify the control explains the required pair and changes no layout before the pair is chosen.
6. Apply Show related. Compare the complete neighbour list with the source. Emphasize a supported relation type, clear it, and inspect a generic link without that type. Count the shared neighbour's spatial representations.
7. While a preview is open, change the collection's source result and apply the announced refresh. Attempt to apply the old preview. Recompute it and apply. After an arrangement, move an affected object manually and inspect the undo explanation. Repeat after removing a subject in the disposable workspace.
8. Make an intentional checkbox edit through the existing guarded path. Apply and undo an arrangement. Verify the checkbox edit remains; revert that deliberate edit before the final source comparison.
9. Repeat preview, cancel, apply and undo using only keyboard and reduced motion. Press Escape during preview and confirm only the preview closes. Scroll each object to its boundary and confirm the field remains still.
10. Use a narrow window. Reach both Compare documents at their chosen reading size through the fallback. Reload the current desk and the older desk; verify safe defaults, current results and no copied stale members. Inspect the served host's read-only behavior.
11. Repeat on the full real collection while recording foreground frame cadence, script/render work, stalls, memory, interaction response and both reachable and drawn counts. Record completion time, mistaken selections and lost context for compare, source-following and return.

## Expect

- All three forms show the same exact count and membership. Filters, selected identity and table scroll anchor survive changes of form. No draw limit removes members from access.
- Open documents and expanded cards reuse one spatial identity. A table reference remains a reference, and a shared neighbour is one card connected to both subjects.
- Cancel leaves the layout unchanged. Apply and undo alter layout only. Text, document dimensions and reading positions remain as chosen.
- Compare exposes two full documents. A narrow screen retains readable dimensions with explicit navigation or off-screen reachability rather than shrinking text.
- A supported relation emphasis reports its subset while the full neighbour list remains available. Generic links are not assigned invented semantics.
- Stale previews require recomputation. An incompatible move or removal invalidates undo with a clear explanation; it never resurrects a removed note or overwrites current content.
- Source edits remain intact through layout undo. Arranging alone leaves source files unchanged, and the served host has no new write capability.
- Keyboard focus stays visible, local Escape performs one local exit, and reduced motion reaches the same layout without animated travel.
- Evidence reports platform limitations and performance costs honestly. A missing platform or unrecorded walk is not marked passed.

## Not this check

This procedure does not validate named scenes, camera persistence, multiple independent collections, enhanced cross-screen transfer, structured evidence panels, cockpit levels or native rendering. Those are separate features. This note defines a future acceptance walk and records no outcome by itself.
