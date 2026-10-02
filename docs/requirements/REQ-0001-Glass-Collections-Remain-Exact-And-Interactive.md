---
type: "[[requirement]]"
id: REQ-0001
title: "Glass collections remain exact and interactive"
status: approved
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["Edwin 2026-10-01: This sounds great update the documents to support this fully.", "[[DES-0003-Collections-And-Documents-On-Glass]]", "Edwin 2026-10-01: 'Agree but I also want to see the actual note detailed/text view to be visible as part of the desktop and the derived lists should also be visible in the actual view to interact with not to the side like they currently are. Review and suggest how to handle this'", "[[REFERENCE-GLASS-AND-COCKPIT-LEVELS-REVIEW]]"]
priority: high
scope: "Glass in Deck's current seven project-os views"
acceptance: ["The current view's derived rows, groups, count, search, filters and keyboard operations are usable in a readable collection on the main Glass surface.", "A collection count identifies the exact rows counted, including rows whose field cards are out of sight or not placed.", "Collapsing, reopening and closing a selected document preserve collection size, selection and scroll anchor; changed results are announced before the person applies them, and removed selections are explained.", "Collection wheel input scrolls rows without moving the field at a boundary; keyboard focus and an explicit return remain usable with overlapping objects and a narrow window.", "Saved collection state holds query identity, filters and layout, then resolves current rows; an old desk without that state opens with safe defaults."]
implements: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
verifies: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
related: ["[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[ISS-0086-The-Outer-Field-Leaves-186-Notes-Unplaced-And-The-Features-Title-Says-Every-Note-Has-A-Place]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Glass collections remain exact and interactive

## Statement

The current view's derived list must be a readable, interactive object on the main Glass surface. The sidecar's current groups and Deck's view description remain authoritative for membership and presentation.

## Acceptance Criteria

- [ ] The current view's derived rows, groups, count, search, filters and keyboard operations are usable in a readable collection on the main Glass surface. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] A collection count identifies the exact rows counted, including rows whose field cards are out of sight or not placed. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] Collapsing, reopening and closing a selected document preserve collection size, selection and scroll anchor; changed results are announced before the person applies them, and removed selections are explained. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] Collection wheel input scrolls rows without moving the field at a boundary; keyboard focus and an explicit return remain usable with overlapping objects and a narrow window. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
- [ ] Saved collection state holds query identity, filters and layout, then resolves current rows; an old desk without that state opens with safe defaults. — evidence to be collected: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]

## Evidence collected, 2026-10-02

No criterion above is ticked. Ticking them is a person's act, after [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] is walked, and that check has not been walked. This table says what a script or a suite has shown for each criterion and what is still owed.

Everything in the middle column ran on 2026-10-02 at commit `18f5405` in a Linux container that draws in software, after the independent review's fixes: the smoke run (389 checks, none failed) and the scripted walks [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]] (two scripts, `glass-desktop` with 55 checks and `glass-collection` with 17), [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]] and [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]. The node suites passed 645 of 645 the same day at the same commit. A scripted walk sends real pointer and key events; it is not a person's walk. Nothing was tried on the Mac, on a second display, on a real tablet, by touch or with a screen reader.

| Criterion | What exists | Still owed |
| --- | --- | --- |
| 1. Rows, groups, count, search, filters and keyboard in a readable collection on the main surface | The smoke run's `collection` part, 17 checks: the list is inside the field and no column stands beside it, the header counts exactly, search narrows and says by what. Its `keys` part, 12 checks: arrows, Home, End, Enter, L and Delete. The `glass-desktop` walk's eleven checks on the collection and its five by keyboard alone. The `glass-collection` walk: a status and a type chosen with the arrow keys leave the rows the list's own rule leaves, and a group heading folds by pointer and opens by Enter. | Whether it is readable is a person's judgement. The names a screen reader is given are in the page and nobody has listened to them. The walk. |
| 2. The count identifies the exact rows, including notes out of sight or not placed | The `collection` suite ([[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]], 30 tests). The walk's check that every counted member has a row: 144 rows for 144 notes, none missing. On a copy of Your Trainer the collection counts 1393, of which 1260 are in the list only, and one of those opens from its row with its text. After a view is chosen the line that says how many have a place is counted against that view's field (commit `27df2fd`, with a smoke check). | The walk, step 1, on a workspace the person chose. |
| 3. Collapse, reopen and closing a document keep size, selection and scroll anchor; a changed result is announced before it is applied; a removed selection is explained | Collapse and reopen keep the size, the marked row and the row the list was scrolled to, with a note open and the list narrowed (the `glass-collection` walk, whose check found the list moving and led to the fix in `7103e3c`). With nothing narrowed and no note open, the `glass-desktop` walk reads the same size and the same scrolled row, and the smoke run the same size. Closing a document returns the keyboard to the row it was opened from, 0 px from where it stood (smoke run, `keys`), and to the collection's header when the collection is collapsed (the `glass-collection` walk). [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]], 10 checks of 10: "3 notes changed: 1 added, 1 removed, 1 moved in the list" with apply, no row moved before it, and "ISS-0008 is no longer in this list; its document stays open". The smoke run reads "1 note changed: 1 changed what it shows" for a change of status. A result that differs only in its order, in a heading or in a property no face draws is announced too, by the `collection` suite alone. | No window showed an order-only change, and no check reads the chip for one. The walk, steps 2 and 6. |
| 4. The wheel scrolls rows without moving the field at a boundary; keyboard focus and an explicit return work with overlapping objects and a narrow window | The wheel at the list's first row and at its last stays in the list, and the field neither zooms nor turns (the `glass-collection` walk). "collection" is offered when the list is turned away from or under a document and brings it back (three `collection` checks). In a field 652 px wide a bar names the collection and each open note (smoke run and walk). Tab from the search box lands on six controls and each is drawn with an outline; so are the collection's header, its "table", "cards" and fold controls and the search box (the `glass-collection` walk). The outline is also read on four controls in the narrow window (`glass-desktop`) and on four on the served page in a window 760 px wide (`glass-collection`). Escape during a drag or a resize of the collection puts it back and stores nothing (`glass-collection`). | On the served page the fold control was pressed by script, and no real tablet or touch was tried. The walk, steps 7, 9 and 10. |
| 5. Saved state holds query identity, filters and layout, then resolves current rows; an old desk opens with safe defaults | The store keeps six values per view for a collection and no row (suite, smoke run and walk). After a reload the count is read again from the source (walk). A state file with no collection loads with the default placement (suite). | **Flagged for Edwin, and still so.** The criterion's wording differs from the build in one respect: the search text and the filters are kept once for all windows, not per collection, and a view change clears the filters (ISS-0012). Since commit `b1bfa1d` a saved scene does keep the search and the filters with its view (FEAT-0023), so a named scene holds what this criterion asks for and the desk a view comes back to does not. Edwin decides whether to amend the criterion. No state file from an older build was opened in the application. The walk, step 9. |

### After the independent review, 2026-10-02

Two reviewers read FEAT-0020 at `5e66f48`, ran node suites only, and requested changes. The changes were made, and in round two one reviewer approved the refuted claims, again on node suites only. The table above is the pass at `18f5405`, after the fixes. This is what the review found against these criteria and what is built now. The full record is in [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]] under Review.

- **Criterion 3, "changed results are announced before the person applies them": refuted by reviewer A, and fixed.** A refreshed result that changed only the order of its rows or headings, a note's progress or severity, or the note another is held under was announced as nothing and could not be applied. Built now (commit `3fdc530`): a result that differs in its order, or in anything a row shows, is announced and applied on request. "What a row shows" is everything the note's card carries, so an edit to a property no face draws is announced too. Five tests of the `collection` suite hold it ([[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]]). In a window it is shown for a note added, a note removed and a note counted as moved ([[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]]), and for a note that changed what it shows (the smoke run). The chip's words for a list that changed without any note changing are read by no check. Round two took each part of the comparison out and a test failed each time.
- **Criterion 3, closing a selected document.** Reviewer B read that the keyboard could be left nowhere when the row was not on screen. Built now (commit `fb79f05`): the keyboard goes to the row when the row takes it, otherwise to the collection's header, and when the collection itself is out of sight it is brought in front first.
- **Criterion 3, the scroll anchor.** The rule held, and one half of it was guarded by no test: the heading a row stands under. A test now fails without it (commit `798d0b9`).
- **Criterion 4, the narrow window and overlapping objects.** In a field narrower than 720 px the collection fills the field and is neither moved nor folded there, and its header's label for a screen reader names no key. When a document is closed while the collection stands behind another document, the collection is brought in front and the keyboard put on the row or the header. The walks now read where the keyboard is drawn on the collection's header, its three controls and the search box, in the narrow window, and on the served page in a window 760 px wide (commit `e3f1460`), and those checks held in the pass above.
- **Criterion 4, the tablet.** On the served page, which is what a tablet loads, a collection the Mac had collapsed could not be opened, and the list is that page's only way to a note with no card. Built now (commit `bad5a5c`): the fold there is the page's own. It changes what that page shows, tells the store nothing, and stands until the Mac folds or opens the list. The header's label there names Enter alone. The page still moves and resizes nothing. In the pass above the served page opened a collection the Mac had collapsed, 76 rows on screen, while the Mac's window and the store's layout stayed as they were.
- **Criterion 5, saved state.** The store kept any finite place, so a state file could hold 1e300. A stored place is now held between 0 and 100000 px (commit `1c2f523`). The fold a served page chose is not saved.
- **Also against criteria 3 and 4:** Escape during a drag of the collection left the drag live, and Escape during a resize was not used. Both now end the gesture and store nothing (commit `716ae82`).

Both reviewers marked every part of these criteria that needs a window *not checked*. Nothing here was tried on a real tablet or by touch.

## Approval

Approved for building on 2026-10-01. Edwin asked for this direction to be implemented in full and named DES-0003 as the baseline: “Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

## Traceability

- Implements: [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]
- Verified by: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
