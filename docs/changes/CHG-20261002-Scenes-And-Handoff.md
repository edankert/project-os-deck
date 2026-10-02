---
type: "[[change]]"
id: CHG-20261002-Scenes-And-Handoff
title: "A Glass desk can be saved under a name and reopened, and a note handed to another window leaves this desk only when that window shows it"
status: merged
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["Edwin 2026-10-01: 'Scaffold FEAT-0023 into implementable requirements, tasks and tests, then deliver named scenes and reliable cross-screen handoff.'"]
commit: "b1bfa1d..b085ad7"
pr: ""
impacts: ["desktop/src/shared/scenes.ts", "desktop/src/shared/handoff.ts", "desktop/src/shared/store-state.ts", "desktop/src/shared/types.ts", "desktop/src/shared/throw.ts", "desktop/src/main/main.ts", "desktop/src/main/drive.ts", "desktop/src/preload.ts", "desktop/src/renderer/renderer.ts", "desktop/src/renderer/glass.ts", "desktop/src/renderer/host-bridge.ts", "desktop/src/renderer/index.html", "desktop/src/renderer/deck.css", "desktop/src/main/smoke-glass.ts", "tools/docker/smoke.Dockerfile"]
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

- **Glass, the bar above the field:** a list of saved scenes with "open", "save scene", "rename" and "delete". After a scene is opened the bar also has `Undo: back to the desk before "<name>"`, which returns to the desk as it was. After "save scene" the list shows the scene just saved. Saving under a name that is taken asks first. A scene saved by a newer Deck is listed with its version and cannot be chosen. The bar holds three groups of controls: what the field says, the scenes, and what is on the desk. It is one row from 1500 pixels wide, two rows under that and three under 1200. Which row a control is on depends only on the window's width, and text in the bar is cut with an ellipsis before a control is.
- **Glass, after a scene is opened:** one message says what is not as it was saved: a note that is gone, a passage that could not be found again, a field smaller than the one the scene was arranged in. It stays until it is dismissed. A note that is gone keeps a labelled document.
- **Glass, sending a document (S, or dragging it to an edge):** each place is named with its act, and each entry of the strip says under its name what the act does to this desk: "it leaves this desk" or "this desk keeps it". A desk is offered "Move to" and "Also show in". A reader window, an empty display and a tablet are offered "Also show in" only. A window showing this same desk is not offered a move. In the chooser the arrow keys move between the answers, each answer says what it does, and Escape closes it.
- **Glass, while a note is on its way:** the document is marked as being sent and the window says this desk keeps it until the other window shows it. It can still be read and scrolled.
- **The window a note arrives in:** a line of its own above the status line says where the note came from and offers "send back" and "dismiss". A Glass document that arrived is outlined, and the outline and the line stay until the person dismisses the line or presses in the document. A desk window, which draws cards, and a reader show the line and mark nothing. When the window the note came from closes, the line says so and "send back" is no longer offered. A document arrives at the size it was read at and at the place it was being read.
- **When a handoff fails:** the note stays where it was and the window says why: the other window did not answer within four seconds, it closed, its display was removed, or it could not show the note.
- **A popped-out window:** it no longer changes the main window's view or surface, and after a tick or a verb it lists its own view again.
- **Spread, and a desk window:** a note on the desk that the view does not list is drawn as a card marked "not in this view". Before, only a note kept on every view was drawn that way, and any other was counted and not shown.
- **The served page, as a tablet loads it:** `S` on a document says that a tablet follows the Mac and sends nothing back. Before, the key did nothing there. The page offers no scene control and no "send back".

## What changed underneath

- A scene is the saved desk Deck already had, marked version 2 (`desktop/src/shared/scenes.ts`). It keeps places, sizes, the search, the filters, the collection's form and reading positions by heading. It keeps nothing derived: no note text, no counts, no list of members. A desk saved before this opens as it always did.
- The rule for a handoff is in `desktop/src/shared/handoff.ts` and the main process carries it out. Nothing about a handoff is kept in the store: it belongs to the session. The main process keeps where a note came from only while the note can go back there.
- The container image for the smoke run carries git, so the run can check that the workspace is as it was. A scripted walk's record now says the workspace could not be checked when git cannot be asked, where it used to say unchanged (`desktop/src/main/drive.ts`).

## What was decided and can be overturned

[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]] is `proposed`, with three threads open for Edwin. One decision made while building changes a view outside the feature: Spread draws every note on its desk that the workspace has ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]], amended 2026-10-02). Without it a move to a desk window on another view could never arrive.

## How it got here after the first close-out

The first close-out of the feature's notes (commit `d99b9cd`, from a pass at `4243fc2`) found two defects and many boxes with no check behind them. What followed, in order:

- **Commit `9d94fa0`** fixed the two defects. "Send back" was offered to a window that had closed, and an empty display's entry read "the a new reader". It also built what boxes of TASK-0109 asked for and nothing drew: the consequence written on each strip entry, the mark on a document being sent, the arrow keys and Escape in the chooser, the arrival line and the mark that stays, the line saying the source window has closed, and `S` on the served page. In the same commit saving under a taken name always asks, an unreadable scene says its version in its own text, and the bar became two rows in a narrow window.
- **Commit `40a74e3`** extended the scenes walk to drive what its task asked for and no check showed. The walk found one defect, fixed in the same commit: after "save scene" the list kept the name chosen before, so "open", "rename" and "delete" were about another scene.
- **Commit `69301dd`** added tests for four rules that could be broken without any test failing. They were found by breaking each rule of the two models once.
- **Commit `f7bdd46`** made the scenes walk choose its search word from the workspace, so both walks run on a second workspace.
- **Commit `aa848b0`** kept the count of owed notes in its place. It had moved up when the bar gained its second row, which the smoke run caught at `f7bdd46`. The rows of the bar now started at its top.
- **Commits `3ff281c` and `b085ad7`** fixed one defect in two steps, and the scenes walk found it both times. In a window 900 pixels wide the bar needed a third row, which was cut off by the bar's lower edge once the rows started at the top. The walk's press on "close all" landed on the collection behind it, and one check failed at `aa848b0`. `3ff281c` added a third row and made a walk's press stop when the control meant is not what is drawn there. On a copy of `your-trainer` the bar held a longer line and needed a fourth row, so the walk stopped at the same press at `3ff281c`. `b085ad7` removed the cause: the bar had wrapped wherever a row was full, and each group of controls now has a row fixed by the window's width.

## Evidence

In the test notes: [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0075-A-Move-Is-Never-Half-Done]], [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]] and the smoke run, [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]. The smoke run and the walks are from 2026-10-02 at commit `e86b2e4`.

- `npm test` in `desktop/`: 589 of 589 at `e86b2e4`, reported by the session that built the feature. The scenes suite has ten tests and the handoff suite eighteen.
- Each rule of the two models was broken once: fourteen of fourteen and twenty of twenty now fail a test.
- The smoke run, in the Linux container, on loopback and on the network: exit 0.
- The scenes walk, 38 checks, and the handoff walk, 33 checks, in the same container: none failed, on this repository and on a copy of `your-trainer`.

One earlier report was wrong and is corrected in TST-0076. The handoff walk had shown a move to a desk window on another view arriving. It arrived only because of a defect fixed in `a37f8f2`. With that fixed the move stopped arriving, and `9379a0c` made it arrive properly.

Not done: the acceptance check a person walks, [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]. Not tried: a second display, a real tablet, and a display really unplugged during a handoff. For the last, the walk sent the main process the event Electron sends when a display is removed, and its check says no display was unplugged. Not measured: anything on the Mac, and the frame cadence while a scene is restored.

Where the tasks stand: TASK-0106 and TASK-0108 are `done`. TASK-0107, TASK-0109 and TASK-0110 are `doing`, with five boxes open between them. Two need a second display. The others are the route by keyboard alone, a visible focus on the scene controls, and the frame cadence with the Mac measurements.

Seen in the walks' pictures and asserted by no check: in the keyboard chooser the sentence saying what a move does is cut short in a window 1100 pixels wide, and a scene's message lies over the right half of a document's header.

## Documentation Coverage (All Types Considered)

- features: updated. FEAT-0023; FEAT-0015 carries a dated amendment.
- requirements: new. REQ-0004 and REQ-0005 list the evidence collected; no criterion is ticked.
- tasks: new. TASK-0106 to TASK-0110; two are done and three are doing.
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

- [ ] Edwin judges the two things the pictures show: the chooser's sentence cut short in a narrow window, and where a scene's message stands.
- [ ] Edwin walks TST-0073, with a second display if one is to hand.
- [ ] Edwin settles ADR-0007's three open threads.
- [ ] With a second display: the strip's entry for an empty display, and a display unplugged during a handoff ([[TASK-0109-Show-The-Destination-The-Arrival-And-The-Way-Back]]).
- [ ] On the Mac, when Edwin allows a window: the times and the frame cadence ([[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]]).
