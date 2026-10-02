---
type: "[[plan]]"
title: "Put the collection and full note on Glass"
status: active
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
implements: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
related: ["[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]"]
---

# Put the collection and full note on Glass

## Delivery sequence

1. Complete [[TASK-0100-Document-The-Glass-Interaction-Direction]] and use [[DES-0003-Collections-And-Documents-On-Glass]] as the detailed design proposal. Approve the refined requirements before implementation begins.
2. Repair the coupled identity, chosen-size and group movement defects under FEAT-0017 in [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]. Model per-view collection identity and compatible saved state in TASK-0095.
3. Build a readable collection with header collapse/restore and protected input in TASK-0096. Build continuous full-note opening, readable materials and full content without an animation gate in TASK-0097.
4. Integrate row/card/document identity, honest relationship labels and reliable return in TASK-0098 after the continuity prerequisite.
5. Run the core demonstration: select a collection row, read the issue, reveal its linked feature and tests, move the neighbourhood without resizing, then return to that row. TASK-0099 and TST-0063 own the walk, observations and full-corpus measurements.
6. Deliver [[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]] next: stack/table/cards, Read/Compare/Show related with preview and undo, and relationship emphasis.
7. Keep named scenes and enhanced screen handoff in [[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]. Keep structured evidence beside claims in [[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]], after its Parity source contracts are decided.

## Dependencies

TASK-0104 is a hard dependency of TASK-0098. TASK-0095 and TASK-0097 may proceed with a settled design while that repair is being built. New layouts preserve the existing cylinder and flat readable documents. No Glass task depends on a native rewrite or the proposed cockpit levels.

[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]] is mitigated by TASK-0095 and the continuity task before saved state is considered compatible. Exact collection access does not close ISS-0086's placement question.

## State ownership and bounded decisions

As built, the store keeps a collection's place, size, collapse state and presentation per view, and one search text and one set of filters for all windows; a view change clears the filters. Selection and scroll anchor are window interaction state. Rows are derived afresh on restore. Camera yaw, zoom and current focus remain session state until the scenes feature adopts a new contract. The proposed reading-size precedence and per-view persistence are defined in DES-0003 and implemented by TASK-0104; old state defaults safely and temporary narrow layouts do not overwrite saved sizes.

Supported header fields come from each current view's existing data. Missing progress or relationship semantics are omitted or labelled generically. Motion duration and layout dimensions are trial values and need recorded evaluation before implementation is accepted. The opening was built at 300 ms and measured in the container; no person has evaluated it.

## Where the sequence stands, 2026-10-02

Steps 1 to 4 are built, and TASK-0095, TASK-0096, TASK-0097, TASK-0098 and TASK-0100 are `done`. Step 5's demonstration was driven by scripted walks at commit `e86b2e4` and is still owed by a person: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] has not been walked, and nothing was measured on the Mac, so TASK-0099 stays `doing`. Steps 6 and 7 are other features' and are closed out in their own notes. The plan stays `active` while the feature is `doing`.
