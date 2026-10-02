---
type: "[[test]]"
id: TST-0064
title: "Glass collections and arrangements stay exact"
status: active
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
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

1. With the collection as a table, scroll it to a row halfway down and narrow it by typing in its search box. Press ▾ on its header to collapse it to the header (the stack) and ▸ to open it again. Press `cards`, then `table`. Compare count and membership against the recorded current query at every step, and check the table is back on the row it was on.
2. Open a member document, then press `cards`. Find that note among the cards, where it is a reference that says "open as a document", and find the shared neighbour. Reach a member outside the window with Page Down, the wheel or End over the cards, or through the table, and come back to the note that is open.
3. Press Read, then Cancel. Capture positions before and after. Press Read again and Apply. Inspect chosen size, reading position and access to the collection.
4. Open two long notes. Compare is about the two documents on top, and pressing a document brings it to the top. Press Compare and Apply. Read both full documents and follow a local link. Use Undo arrangement and compare the restored positions, sizes and picked-out relationship with the pre-apply capture.
5. Press Compare with one note open, then with three. With one, verify the control says it needs two open notes, shows no preview and moves nothing. With three, verify the preview names the top two and says the other stays where it is.
6. Press Show related and Apply. Compare the document's complete list of related notes with the source. Under "pick out" in that list, press one of the relationships offered, then `clear`, and inspect a row marked as a plain link, which no pick should pick out. Count the shared neighbour's cards.
7. While a preview is shown, change a note in the collection's result on disk. Verify the preview says it was worked out again before Apply is pressed, then apply it. After an arrangement, move one of its documents by hand and press Undo arrangement: inspect what it names, then try "Undo the rest" and "Keep as it is". Repeat after closing one of its documents, and after removing a subject's file in the disposable workspace.
8. Make an intentional checkbox edit through the existing guarded path. Apply and undo an arrangement. Verify the checkbox edit remains; revert that deliberate edit before the final source comparison.
9. Repeat preview, cancel, apply and undo using only keyboard and reduced motion. Press Escape during preview and confirm only the preview closes. Scroll each object to its boundary and confirm the field remains still.
10. Use a narrow window. Reach the collection and both Compare documents by name in the bar the narrow window shows, one at a time, each at its chosen reading size. Reload the current desk and the older desk; verify safe defaults, current results and no copied stale members. Inspect the served host's read-only behavior: it should offer no Read, Compare or Show related and no `table` or `cards` button.
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

## This check has not been walked

As of 2026-10-02 nobody has walked this check. The release ledger holds no verdict for it, and this note records none.

A script has driven the same route with real pointer and key events in a Linux container: [[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]. It is not this check. It says nothing about whether a person finds the commands useful, how long a comparison takes them, or how often they pick the wrong note. Step 11's frame cadence in a foreground window on the Mac has not been measured; [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]] holds the container's figures.

Steps 1, 2, 4, 5, 6, 7 and 10 were corrected on 2026-10-02 to name the controls the built application has. What changed:

- **No selection apart from which notes are open.** The list has no selected row, and Compare has no pair to choose. Step 1 scrolls to a row, and steps 4 and 5 open notes. Compare is always about the two documents on top.
- **The stack is the collapsed collection.** ▾ on the header collapses it and ▸ opens it; `table` and `cards` are two buttons on the same header.
- **A preview is never left stale to be applied.** When the desk, the window or the notes change under a preview, the application works it out again and says so. Step 7 no longer asks the walker to apply an old preview, because there is none to apply.
- **An undo is not thrown away after a manual move.** It names what was moved, resized or closed since, and offers "Undo the rest" or "Keep as it is".
- **Relationship emphasis is called "pick out".** It is in the document's list of related notes and offers the frontmatter keys the files join the note by, each with its count.

Two lines under Expect were left as written and are narrower than the build. "Stale previews require recomputation": the application recomputes without being asked. "An incompatible move or removal invalidates undo": the application keeps the undo for the objects that have not changed. REQ-0003 asks only that the changed state is announced before anything is applied, and the build does that. Whether to reword those two lines is Edwin's.
