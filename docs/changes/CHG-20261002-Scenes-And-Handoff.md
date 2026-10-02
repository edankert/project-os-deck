---
type: "[[change]]"
id: CHG-20261002-Scenes-And-Handoff
title: "A Glass desk can be saved under a name and reopened, and a note handed to another window leaves this desk only when that window shows it"
status: merged
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["Edwin 2026-10-01: 'Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff.'"]
commit: "b1bfa1d..4243fc2"
pr: ""
impacts: ["desktop/src/shared/scenes.ts", "desktop/src/shared/handoff.ts", "desktop/src/shared/store-state.ts", "desktop/src/shared/types.ts", "desktop/src/shared/throw.ts", "desktop/src/main/main.ts", "desktop/src/preload.ts", "desktop/src/renderer/renderer.ts", "desktop/src/renderer/glass.ts", "desktop/src/renderer/index.html", "desktop/src/renderer/deck.css", "desktop/src/main/smoke-glass.ts", "tools/docker/smoke.Dockerfile"]
issues: ["[[ISS-0091-A-Popped-Out-Window-Switches-The-Main-Windows-View]]"]
features: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]", "[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[PHASE-0002-Glass]]"]
---

# Scenes and handoff

## Summary

A person can save a Glass desk under a name and reopen it later: the same documents at the same places and sizes, read where they were being read, with the notes' current text. And a note sent to another Deck window is now one of two named acts. "Move to" takes it off this desk only after the other window says it is showing it. "Also show in" leaves it here as well. A handoff that is not confirmed is undone and says so.

## Impact

This repository has no survey notes, so each line names the screen in words.

- **Glass, the bar above the field:** a list of saved scenes with "open", "save scene", "rename", "delete" and "back". Opening a scene says in one message what is not as it was saved: a note that is gone, a passage that could not be found again, a field of another size. "back" returns to the desk as it was before the scene was opened.
- **Glass, sending a document (S, or dragging it to an edge):** each place is named with its act. A desk is offered "Move to" and "Also show in". A reader window and a tablet are offered "Also show in" only. A window showing this same desk is not offered a move.
- **The window a note arrives in:** it marks the document, says where it came from and offers "send back". A document arrives at the size it was read at and at the place it was being read.
- **When a handoff fails:** the note stays where it was and the window says why: the other window did not answer within four seconds, it closed, its display was removed, or it could not show the note.
- **A popped-out window:** it no longer changes the main window's view or surface, and after a tick or a verb it lists its own view again.
- **Spread, and a desk window:** a note on the desk that the view does not list is drawn as a card marked "not in this view". Before, only a note kept on every view was drawn that way, and any other was counted and not shown.

## What changed underneath

- A scene is the saved desk Deck already had, marked version 2 (`desktop/src/shared/scenes.ts`). It keeps places, sizes, the search, the filters, the collection's form and reading positions by heading. It keeps nothing derived: no note text, no counts, no list of members. A desk saved before this opens as it always did.
- The rule for a handoff is in `desktop/src/shared/handoff.ts` and the main process carries it out. Nothing about a handoff is kept in the store: it belongs to the session.
- The container image for the smoke run carries git, so the run can check that the workspace is as it was.

## What was decided and can be overturned

[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]] is `proposed`, with three threads open for Edwin. One decision made while building changes a view outside the feature: Spread draws every note on its desk that the workspace has ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], amended 2026-10-02). Without it a move to a desk window on another view could never arrive.

## Evidence

In the test notes: [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0075-A-Move-Is-Never-Half-Done]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]] and the smoke run, [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].

One earlier report was wrong and is corrected in TST-0076. The handoff walk had shown a move to a desk window on another view arriving. It arrived only because of a defect fixed in `a37f8f2`. With that fixed the move stopped arriving, and `9379a0c` made it arrive properly.

Not done: the acceptance check a person walks, [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]. Not tried: a second display, a display unplugged during a handoff, a real tablet.

## Documentation Coverage (All Types Considered)

- features: updated. FEAT-0023; FEAT-0015 carries a dated amendment.
- requirements: new. REQ-0004 and REQ-0005 list the evidence collected; no criterion is ticked.
- tasks: new. TASK-0106 to TASK-0110.
- issues: new. ISS-0091, fixed.
- tests: new. TST-0073 to TST-0076.
- workflows: not-applicable.
- decisions: new. ADR-0007, proposed.
- risks: updated. RISK-0007 covers a restored desk losing identity or layout.
- changes: new, this note.
- snapshot: updated.

## Risk scan

- A new external dependency or version constraint: none.
- A new required environment variable or configuration surface: none.
- A directory layout or artifact path change: none. The state file gains optional fields on a saved desk, and a file written before this loads unchanged.
- A runtime increase or new long-running step: a move waits up to four seconds for the destination before it gives up.
- A security, credential or licence exposure: none. A served page is never told of an arrival and offers no "send back".

## Follow-ups

- [ ] Edwin walks TST-0073, with a second display if one is to hand.
- [ ] Edwin settles ADR-0007's three open threads.
