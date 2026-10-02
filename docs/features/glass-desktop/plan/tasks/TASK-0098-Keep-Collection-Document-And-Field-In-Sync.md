---
type: "[[task]]"
id: TASK-0098
title: "Keep collection, document and field in sync"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: ["[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]", "[[TASK-0096-Draw-And-Operate-The-Collection-In-Glass]]", "[[TASK-0097-Open-The-Full-Note-As-A-Glass-Document]]"]
blocks: ["[[TASK-0099-Walk-The-Glass-Desktop-At-Real-Scale]]"]
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Keep collection, document and field in sync

## Definition of Done

- [x] Choosing a row turns the field to that note's card; opening the row makes the note a document and leaves the collection available; opening a field card shows and marks its row. The box first said that opening a row highlights the same note in the field. Since [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]] an open note is one object, its document, and has no card left to highlight. Shown by the smoke run's `keys` checks "under reduced motion, choosing a row highlights it" and "the field cut to it rather than flying", by its `lift` check "the lifted note is drawn once, as its document: the field draws no card for it", and by the `glass-desktop` walk's check "opening a card shows its row in the collection, marked as the open note".
- [x] Closing the document returns focus to the same row and scroll anchor; opening another note preserves both objects and their arrangement. Shown by the `keys` check that Delete on the header closes the document and returns the keyboard to the row it was opened from, 0 px from where that row stood, by the walk's check "Delete closes the document and the keyboard is back on the row it was opened from, at the same place in the list", and by the scale walks' check that closing the top document returns the keyboard to its row. When the row is not on screen the keyboard goes to the collection's header: the `glass-collection` walk closed FEAT-0002 with the list on screen and the keyboard was on its row, then closed it with the collection collapsed and the keyboard was on the collection's header. Opening another: the walk's link check ends with both documents open, and the smoke run's `panes` check reads "opening two notes and moving their documents moved no card".
- [x] A note appears once while lifted, its chosen size stands and its neighbourhood moves with it, as the existing ISS-0070/71/72 decisions require. Shown by the smoke run's `focus` part, 47 checks of 47: "one note is one object" (no card for the open note, none drawn twice, no ghost), the document 560 by 520 "to the pixel when opened, while dragged, after the drag, out of focus and in focus again", and "every seated card keeps its place beside the document through the drag". The walk's checks say the same for one route.

- [x] Opening an already held note locates and raises it; one shared neighbour is one spatial card even when linked to multiple open subjects. Shown by the `keys` check "Enter on the row of a note that is already open goes to its document and opens no second one", by the walk's check "choosing the row of a note that is already open finds and raises its document; there is still one", by the `lift` check "a note joined to both documents is one card with a second line" (6 shared notes, 0 drawn twice), and by both scale walks' check "a note joined to more than one open note is one card, not one per document" (25 seated for 25 distinct on Your Trainer, 165 for 165 on this repository).
- [x] A missing initiating row after refresh has an explicit explanation and returns focus to the collection; "find" returns an off-screen document to reach. Shown by the `collection-refresh` walk: the collection reads "ISS-0008 is no longer in this list; its document stays open", and when that document is closed the keyboard is on the collection's header and the status line reads "ISS-0008 is closed; it is not in this list any more". The control the box called Find open note reads "find" and the note's id. The `focus` part shows it offered when the note is turned away from and bringing the desk back, and the walk's check reads "'find' brings the document back in front, at its size, with its neighbourhood still attached".
- [x] Relationship labels use reliable source fields only; generic links retain direction and a complete keyboard-accessible list. Shown by the `relations` suite, 7 tests, and three tests of the `graph` suite ([[TST-0066-A-Relationship-Is-Named-Only-In-The-Words-The-Source-Wrote]]), by the walk's checks "every relationship word is a frontmatter key the source wrote for that pair, or 'link'; none is invented" and "every row keeps its direction", by the `focus` check that R on the header opens the list with the keyboard on its first row, 15 rows for 15 neighbours, and by the scale walk on Your Trainer, where the note joined to 217 others has 217 seated cards and a list headed "217 related".
- [x] Local Escape closes a menu or cancels a local operation before the established focus and desk sequence; one event triggers only one exit. Shown by the smoke run's `document` check that, with a document's related list and details both open, Escape ends one thing each time: the list, then the details, then the focus with the cards put back, then the desk. The `focus` check "Escape during a drag puts the document back where it was" keeps the focus and the desk. The `glass-collection` walk shows the same for the collection: Escape during a drag of it and during a resize of it puts it back, with the open note still open and the focus where it was.

## Steps

- [x] Define selection and focus handoff across row, card and document. Enter on a row puts the keyboard on the document's header, L goes back to the row and closes nothing, and Delete closes and returns to the row (the `keys` part, 12 checks; commit `2d3b77a`).
- [x] Reconcile the three existing continuity issues with FEAT-0017, then check pointer, keyboard and second-window routes. The repair is TASK-0104's, in commit `81d4632`, and the `focus` part checks it. A second window is driven by the smoke run's `served` part (a page with no bridge), its `desks` part (a desk window on another view) and its `throw` part. The three issue notes and TASK-0104 are closed out by FEAT-0017, not here.

## Notes

This task links the existing issues; it does not file replacements for them.

**Where the evidence is from.** Every smoke check and walk cited above ran on 2026-10-02 at commit `18f5405`, in the Linux container (the `project-os-deck-smoke` image, Electron under Xvfb), after the independent review's fixes. The walks are [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]] (55 of 55 in `glass-desktop`, 17 of 17 in `glass-collection`), [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]] (10 of 10) and [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]] (8 of 8 on each of two workspaces). The node suites passed 645 of 645 the same day at the same commit.

**What the independent review found in this task's boxes, 2026-10-02.** Each is fixed in the commit named. No tick was changed. The second, sixth and seventh boxes now also cite what the pass at `18f5405` showed after the fixes.

- The second box, closing a document. Reviewer B read, and did not run, that the keyboard could be left nowhere when the row was not on screen: with the collection collapsed, or behind another document in a narrow field. The fix found the same with the collection shown as cards. The row was asked whether it exists, not whether it took the keyboard, so the header was never tried. Closing now puts the keyboard on the row when the row takes it and otherwise on the collection's header. When the header cannot take it either, the collection is brought in front as the L key does and the row is tried again (commit `fb79f05`). A row folded away under its heading ends on the header too; before, that was only said. The `collection` suite's test "the keyboard is on a row or on the header only when that element took it" holds the two answers. What `documentClosed` does with them is in `desktop/src/renderer/renderer.ts`, which no node suite loads; the `glass-collection` walk has a step for it, which held in the pass at `18f5405`.
- The first step. The L key no longer says "not in this list" of a row that is in the list and not on screen (the same commit).
- The sixth box, relationship labels. A link in a list written at the margin (`tasks:` and then `- "[[TASK-0001]]"` with no indent), or under a key that holds a space (`verified by:`), was shown as a plain "link". Nothing was invented, and a label the source wrote was dropped. Both are now shown with their key as written (commit `01f0fc1`, with a test in the `graph` suite named in [[TST-0066-A-Relationship-Is-Named-Only-In-The-Words-The-Source-Wrote]]).
- The seventh box, one Escape and one exit. Escape while the collection was being resized by its corner was not used by the collection. The key reached Glass's own Escape, which left the focus or closed every note. It now puts the size back and goes no further (commit `716ae82`). One case is kept as it was: Escape with the collection's header pressed and not yet dragged 5 px still goes to Glass.

The rules are decisions 6, 9 and 11 in [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]], under "Settled while fixing what the review found".

No check here was made by a person, on a second display or with a screen reader. The acceptance check [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] has not been walked.
