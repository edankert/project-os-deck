---
type: "[[change]]"
id: CHG-20261002-Glass-Collections-Documents-And-Arrangements
title: "In Glass the view's list stands on the desk as a collection, a note opens as a full document there, and documents can be arranged and put back"
status: merged
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["Edwin 2026-10-01: 'Fully implement the documented Glass / Minority Report interaction direction in project-os-deck, delivering a working, polished experience backed by real verification.'", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
commit: "81d4632..e86b2e4"
pr: ""
impacts: ["desktop/src/renderer/glass.ts", "desktop/src/renderer/renderer.ts", "desktop/src/renderer/collection-view.ts", "desktop/src/renderer/navigator.ts", "desktop/src/renderer/link-lines.ts", "desktop/src/renderer/deck.css", "desktop/src/renderer/index.html", "desktop/src/shared/collection.ts", "desktop/src/shared/arrange.ts", "desktop/src/shared/store-state.ts", "desktop/src/main/host.ts", "desktop/src/main/smoke-glass.ts", "desktop/demos/", "tools/scripts/walk-in-a-box.sh"]
issues: ["[[ISS-0070-One-Note-Is-Drawn-Twice-While-Another-Is-In-The-Middle]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]", "[[ISS-0072-Moving-The-Note-In-The-Middle-Throws-The-Arrangement-Away]]"]
features: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[ADR-0006-Collections-And-Documents-Occupy-The-Glass-Desk]]", "[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]", "[[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]", "[[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]", "[[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]", "[[PHASE-0002-Glass]]"]
---

# Glass: collections, documents and arrangements

## Summary

In Glass the list of the view's notes is no longer a column beside the field. It is a collection: an object on the desk that can be moved, resized and searched. A note opens as a full document on the same desk, with its whole text, the notes it is joined to and its actions. Several documents can be arranged for reading, for comparing or to show what a note is joined to, with a preview before anything moves and an undo after. Anyone using Glass sees all three.

## Impact

This repository has no survey notes, so each line names the screen in words.

- **Glass, the collection:** the view's rows, groups, count, search and filters stand on the desk in a box that can be dragged, resized and folded. It can be shown as a stack, a table or cards. It says how many notes it lists and how many of those have a place in the field. When notes change on disk it holds still and says a change is waiting; the rows do not move under the pointer.
- **Glass, a document:** pressing a row, a card or a link opens the note as a document with its full text. No reading column opens beside the field. The header has the related notes (R), details (D), keep on every view (V), show in the link graph (O), send (S), fill the field (W) and close. A document opens at the size the person last chose and keeps it when dragged.
- **Glass, a note in the middle of its neighbours:** a note is drawn once. An opened note has no second card and leaves no outline in the field. The notes it is joined to gather round it and move with it when it is dragged. The related list names how each is joined, in the frontmatter key its author wrote.
- **Glass, the bar above the field:** "Read", "Compare" and "Show related" arrange the open documents. Each shows outlines of where things will go and waits for "apply". "undo" puts everything back and says if something changed meanwhile. From 1500 px the bar is one row. Under 1500 px these buttons, "close all" and the counts have a row of their own, and under 1200 px the scene controls have one too, so no control is cut off in a narrow window. The bar's height depends only on the window's width.
- **A narrow window, and the page a tablet loads:** under 720 px the collection and one document take turns, with a bar to switch. The served page opens documents of its own and never changes the Mac's desk.
- **Spread and List:** unchanged.

## What changed underneath

- The collection's rules (what is counted, where a row is after a change, how cards are laid out) are in `desktop/src/shared/collection.ts`. An arrangement is planned in `desktop/src/shared/arrange.ts` before anything is drawn. Both are checked without a window.
- Glass draws a card only when its content or state changed, and moves the lines between notes with one transform. A turn with 217 notes gathered round a document costs less script work per frame than it did; the figures before and after are in commit `002fc33` and in TST-0072.
- The scripted walks are new: `tools/scripts/walk-in-a-box.sh <walk>` drives a route through the real application in the Linux container with real pointer and key events, records each claim with what was seen, and keeps pictures. A walk is not the smoke run and is not a person's walk.
- The smoke run's Glass section was rewritten for one object per note, the collection and the document.
- A second walk of the collection, `glass-collection`, drives its filters, its collapsed header, a folded group, the wheel at the list's ends, Escape during a drag, the keyboard's place on each control, a refused action and the chosen size in a second window. It found that collapsing the collection and opening it again moved the list by several hundred pixels while a note was open, because the rows for what the open note is joined to were sorted afresh at every redraw. Their order is now worked out when what it describes changes (`7103e3c`).

## What was decided and can be overturned

[[DES-0003-Collections-And-Documents-On-Glass]] is `proposed`. The routine details settled while building are in each feature note under Decisions. Three reverse an earlier rule on Edwin's word of 2026-09-12: the ghost outline is gone, a document keeps the size a person chose, and dragging the middle note moves its neighbourhood instead of leaving it.

## Evidence

The counts and what each run showed are in the test notes, not repeated here: [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] (the smoke run), [[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]], [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]], [[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]] and [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]].

Not done: the acceptance checks a person walks, [[TST-0052-A-Note-Opens-In-The-Middle-Of-Its-Neighbours-And-The-Wheel-Zooms]], [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] and [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]. Not done: any measurement on the Mac with Deck in the foreground. Everything timed was timed in the container, which draws in software.

## Documentation Coverage (All Types Considered)

- features: updated. FEAT-0017, FEAT-0020 and FEAT-0022.
- requirements: updated. REQ-0001, REQ-0002 and REQ-0003 list the evidence collected; no criterion is ticked.
- tasks: updated. TASK-0104, TASK-0095 to TASK-0099 and TASK-0101 to TASK-0103.
- issues: updated. ISS-0070, ISS-0071 and ISS-0072.
- tests: new and updated. TST-0065 to TST-0072 are new; TST-0045 and TST-0051 are updated.
- workflows: not-applicable.
- decisions: not-applicable. ADR-0006 was accepted before this work.
- risks: updated. RISK-0007.
- changes: new, this note.
- snapshot: updated.

## Risk scan

- A new external dependency or version constraint: none.
- A new required environment variable or configuration surface: none.
- A directory layout or artifact path change: `desktop/demos/` holds the walks, and `desktop/dist/walks/` their output, which is build output and is not committed.
- A runtime increase or new long-running step: a walk takes one to three minutes in the container and is run by hand.
- A security, credential or licence exposure: none. The served page still reads and writes nothing.

## Follow-ups

- [ ] Edwin walks TST-0052, TST-0063 and TST-0064.
- [ ] The Mac foreground measurement, on Edwin's go-ahead: it takes the keyboard while it runs.
