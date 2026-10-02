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

Everything in the middle column ran on 2026-10-02 at commit `4243fc2` in a Linux container that draws in software: the smoke run (389 checks, none failed) and the scripted walks [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]], [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]] and [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]. The node suites passed 586 of 586 the same day at `9379a0c`. A scripted walk sends real pointer and key events; it is not a person's walk. Nothing was tried on the Mac, on a second display, on a real tablet, by touch or with a screen reader.

| Criterion | What exists | Still owed |
| --- | --- | --- |
| 1. Rows, groups, count, search, filters and keyboard in a readable collection on the main surface | The smoke run's `collection` part, 17 checks: the list is inside the field and no column stands beside it, the header counts exactly, search narrows and says by what. Its `keys` part, 12 checks: arrows, Home, End, Enter, L and Delete. The `glass-desktop` walk's eleven checks on the collection and its five by keyboard alone. | No check chooses a status or a type in the two filter boxes while the list is in the collection, and none presses a group heading with the pointer. Whether it is readable is a person's judgement. The walk. |
| 2. The count identifies the exact rows, including notes out of sight or not placed | The `collection` suite ([[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]], 17 tests). The walk's check that every counted member has a row: 144 rows for 144 notes, none missing. On a copy of Your Trainer the collection counts 1393, of which 1260 are in the list only, and one of those opens from its row with its text. After a view is chosen the line that says how many have a place is counted against that view's field (commit `27df2fd`, with a smoke check). | The walk, step 1, on a workspace the person chose. |
| 3. Collapse, reopen and closing a document keep size, selection and scroll anchor; a changed result is announced before it is applied; a removed selection is explained | Collapse and reopen keep the size and the row the list was scrolled to (walk and smoke run). Closing a document returns the keyboard to the row it was opened from, 0 px from where it stood (smoke run, `keys`). [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]], 10 checks of 10: "3 notes changed: 1 added, 1 removed, 1 changed" with apply, no row moved before it, and "ISS-0070 is no longer in this list; its document stays open". | No check reads which row is marked after the collection is opened again. The walk, steps 2 and 6. |
| 4. The wheel scrolls rows without moving the field at a boundary; keyboard focus and an explicit return work with overlapping objects and a narrow window | The wheel over the list scrolls it and leaves the zoom alone (smoke run, `zoom`). "collection" is offered when the list is turned away from or under a document and brings it back (three `collection` checks). In a field 652 px wide a bar names the collection and each open note (smoke run and walk). | No check turns the wheel with the list already at its first or last row. No check reads whether the focus outline is drawn. The walk, steps 7, 9 and 10. |
| 5. Saved state holds query identity, filters and layout, then resolves current rows; an old desk opens with safe defaults | The store keeps six values per view for a collection and no row (suite, smoke run and walk). After a reload the count is read again from the source (walk). A state file with no collection loads with the default placement (suite). | The criterion's wording differs from the build in one respect: the search text and the filters are kept once for all windows, not per collection, and a view change clears the filters (ISS-0012). Edwin decides whether to amend the criterion. No state file from an older build was opened in the application. The walk, step 9. |

## Approval

Approved for building on 2026-10-01. Edwin asked for this direction to be implemented in full and named DES-0003 as the baseline: “Treat DES-0003 as the implementation baseline; resolve routine design details using its principles and record your decisions.” The acceptance criteria above are the ones the implementation is built against. They are ticked only with evidence, at the feature's close-out.

## Traceability

- Implements: [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]
- Verified by: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]]
