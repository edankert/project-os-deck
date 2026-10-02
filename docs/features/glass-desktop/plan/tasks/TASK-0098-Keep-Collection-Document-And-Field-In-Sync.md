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
- [x] Closing the document returns focus to the same row and scroll anchor; opening another note preserves both objects and their arrangement. Shown by the `keys` check that Delete on the header closes the document and returns the keyboard to the row it was opened from, 0 px from where that row stood, by the walk's check "Delete closes the document and the keyboard is back on the row it was opened from, at the same place in the list", and by the scale walks' check that closing the top document returns the keyboard to its row. Opening another: the walk's link check ends with both documents open, and the smoke run's `panes` check reads "opening two notes and moving their documents moved no card".
- [x] A note appears once while lifted, its chosen size stands and its neighbourhood moves with it, as the existing ISS-0070/71/72 decisions require. Shown by the smoke run's `focus` part, 47 checks of 47: "one note is one object" (no card for the open note, none drawn twice, no ghost), the document 560 by 520 "to the pixel when opened, while dragged, after the drag, out of focus and in focus again", and "every seated card keeps its place beside the document through the drag". The walk's checks say the same for one route.

- [x] Opening an already held note locates and raises it; one shared neighbour is one spatial card even when linked to multiple open subjects. Shown by the `keys` check "Enter on the row of a note that is already open goes to its document and opens no second one", by the walk's check "choosing the row of a note that is already open finds and raises its document; there is still one", by the `lift` check "a note joined to both documents is one card with a second line" (10 shared notes, 0 drawn twice), and by both scale walks' check "a note joined to more than one open note is one card, not one per document" (77 seated for 77 distinct on Your Trainer).
- [x] A missing initiating row after refresh has an explicit explanation and returns focus to the collection; "find" returns an off-screen document to reach. Shown by the `collection-refresh` walk: the collection reads "ISS-0070 is no longer in this list; its document stays open", and when that document is closed the keyboard is on the collection's header and the status line reads "ISS-0070 is closed; it is not in this list any more". The control the box called Find open note reads "find" and the note's id. The `focus` part shows it offered when the note is turned away from and bringing the desk back, and the walk's check reads "'find' brings the document back in front, at its size, with its neighbourhood still attached".
- [x] Relationship labels use reliable source fields only; generic links retain direction and a complete keyboard-accessible list. Shown by the `relations` suite, 6 tests ([[TST-0066-A-Relationship-Is-Named-Only-In-The-Words-The-Source-Wrote]]), by the walk's checks "every relationship word is a frontmatter key the source wrote for that pair, or 'link'; none is invented" and "every row keeps its direction", and by the `focus` checks that R on the header opens the list with the keyboard on its first row, 16 rows for 16 neighbours and 217 rows for 217.
- [x] Local Escape closes a menu or cancels a local operation before the established focus and desk sequence; one event triggers only one exit. Shown by the smoke run's `document` check that, with a document's related list and details both open, Escape ends one thing each time: the list, then the details, then the focus with the cards put back, then the desk. The `focus` check "Escape during a drag puts the document back where it was" keeps the focus and the desk.

## Steps

- [x] Define selection and focus handoff across row, card and document. Enter on a row puts the keyboard on the document's header, L goes back to the row and closes nothing, and Delete closes and returns to the row (the `keys` part, 12 checks; commit `2d3b77a`).
- [x] Reconcile the three existing continuity issues with FEAT-0017, then check pointer, keyboard and second-window routes. The repair is TASK-0104's, in commit `81d4632`, and the `focus` part checks it. A second window is driven by the smoke run's `served` part (a page with no bridge), its `desks` part (a desk window on another view) and its `throw` part. The three issue notes and TASK-0104 are closed out by FEAT-0017, not here.

## Notes

This task links the existing issues; it does not file replacements for them.

**Where the evidence is from.** Every smoke check and walk cited above ran on 2026-10-02 at commit `4243fc2`, in the Linux container (the `project-os-deck-smoke` image, Electron under Xvfb). The walks are [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]] (54 of 54), [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]] (10 of 10) and [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]] (8 of 8 on each of two workspaces). The node suites passed 586 of 586 the same day at `9379a0c`.

No check here was made by a person, on a second display or with a screen reader. The acceptance check [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] has not been walked.
