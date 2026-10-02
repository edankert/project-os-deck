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

1. With the collection as a table, scroll it to a row halfway down and press that row, which opens the note and marks its row as the selected one. Close its document; the row stays marked. Narrow the list by typing in its search box, with words that keep that note in it. Press ▾ on its header to collapse it to the header (the stack) and ▸ to open it again. Press `cards`, then `table`. Compare count and membership against the recorded current query at every step. Check that the same note is the one marked, as a card and then as a row, and that the table is back on the row it was on.
2. Open a member document, then press `cards`. Find that note among the cards, where it is a reference that says "open as a document", and find the shared neighbour. Reach a member outside the window with Page Down, the wheel or End over the cards, or through the table, and come back to the note that is open.
3. Press Read, then Cancel. Capture positions before and after. Press Read again and Apply. Inspect chosen size, reading position and access to the collection.
4. Open two long notes. Compare is about the two documents on top, and pressing a document brings it to the top. Press Compare and Apply. Read both full documents and follow a local link. Use Undo arrangement and compare the restored positions, sizes and picked-out relationship with the pre-apply capture.
5. Press Compare with one note open, then with three. With one, verify the control says it needs two open notes, shows no preview and moves nothing. With three, verify the preview names the top two and says the other stays where it is.
6. Press Show related and Apply. Compare the document's complete list of related notes with the source. Under "pick out" in that list, press one of the relationships offered, then `clear`, and inspect a row marked as a plain link, which no pick should pick out. Count the shared neighbour's cards.
7. While a preview is shown, change a note in the collection's result on disk. Verify the preview says what changed and that it was worked out again before Apply is pressed, then apply it. After an arrangement, move one of its documents by hand and press Undo arrangement: inspect what it names, then try "Undo the rest" and "Keep as it is". Repeat after closing one of its documents, and after removing a subject's file in the disposable workspace.
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

A script has driven the same route with real pointer and key events in a Linux container: [[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]. It is not this check. It says nothing about whether a person finds the commands useful, how long a comparison takes them, or how often they pick the wrong note. Step 11's frame cadence in a foreground window on the Mac has not been measured. [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]] holds the container's figures, among them a turn of the field after each of Read, Compare and Show related. The container draws in software, so its time between frames says nothing about the Mac.

Steps 1, 2, 4, 5, 6, 7 and 10 were corrected on 2026-10-02 to name the controls the built application has. What changed:

- **The commands take no selection.** Compare has no pair to choose: it is always about the two documents on top. Steps 4 and 5 open notes. The collection does mark one note as selected, the note last opened, on its row in the table and on its card. Step 1 selects a note that way and follows the mark through the three forms. The close-out of 2026-10-02 had taken the selection out of step 1, on the mistaken reading that the list has no selected row; it was put back the same day, after the review.
- **The stack is the collapsed collection.** ▾ on the header collapses it and ▸ opens it; `table` and `cards` are two buttons on the same header.
- **A preview is never left stale to be applied.** When the desk, the window, the notes or a note's links change under a preview, the application works it out again. The preview then says what changed, and the status line says the same sentence. Apply applies only a plan that has been shown: when the plan changes at the very press, that press shows the new plan and the next one applies it. Step 7 does not ask the walker to apply an old preview, because there is none to apply.
- **An undo is not thrown away after a manual move.** It names what was moved, resized or closed since, and offers "Undo the rest" or "Keep as it is". When more has changed by the time "Undo the rest" is pressed, it puts nothing back and asks again with the new list. A note opened since the arrangement is not named and keeps its place in the stack.
- **Relationship emphasis is called "pick out".** It is in the document's list of related notes and offers the frontmatter keys the files join the note by, each with its count. `clear` returns to nothing picked out, not to an earlier pick.

Two lines under Expect are left as written and are narrower than the build. "Stale previews require recomputation": the application recomputes without being asked. "An incompatible move or removal invalidates undo": the application keeps the undo for the objects that have not changed. Whether to reword those two lines is Edwin's.

What REQ-0003 asks is that changed state is announced before a stale preview or undo is applied. The independent review of 2026-10-02 refuted that for the preview as the build then stood: a reworked preview said "The desk changed while this was shown, so it was worked out again" whatever had changed, named no object, and was not announced to a screen reader. It is fixed. A reworked preview now says what changed under it, naming each document that was opened, closed, moved, resized or brought to the front. For a change on disk it says "notes changed on disk" and does not name the note. The sentence is also said in the status line, and the preview's text is a part of the page a screen reader reads out when it changes (FEAT-0022, Review, row 5c). The review also found that Undo arrangement did not put the collection back in a window shorter than it, and put a note opened since at the bottom of the stack. Both are fixed (rows 5a and 5d). Round two of the review, the same day, found each of these fixed as far as a node suite can show. The scripted walk checked the status line and the short window on screen in the pass at `18f5405`, and both held. Nobody has listened with a screen reader.

The first line under Expect says "selected identity". In the build that is the note last opened, and step 1 checks it.
