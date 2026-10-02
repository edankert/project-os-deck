---
type: "[[test]]"
id: TST-0068
aliases: ["TST-0068"]
title: "The Glass desktop is walked with a real pointer and keyboard: the collection on the field, a full note opened from a card, a row and a link, read, moved, found again and closed back to its row, in a narrow window and on the served page"
status: passing
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[TASK-0096-Draw-And-Operate-The-Collection-In-Glass]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: integration
kind: manual
entrypoint: "desktop/demos/glass-desktop.cjs"
command: ""
last_verified: 2026-10-02
automation: "two commands, run by hand: bash tools/scripts/walk-in-a-box.sh glass-desktop, then bash tools/scripts/walk-in-a-box.sh glass-collection. Not run by run-tests.py or by CI, which have no Docker."
covers: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
issues: []
tasks: ["[[TASK-0096-Draw-And-Operate-The-Collection-In-Glass]]", "[[TASK-0097-Open-The-Full-Note-As-A-Glass-Document]]", "[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]", "[[TASK-0099-Walk-The-Glass-Desktop-At-Real-Scale]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]]"]
---

# The Glass desktop is walked with a real pointer

## Purpose

`node --test` cannot load the renderer, and the smoke run answers one question, whether every check still holds. This is a different kind of evidence. Two scripts drive the real application with `webContents.sendInputEvent`, so the browser hit-tests every press as it does a person's. The first, `glass-desktop` (`desktop/demos/glass-desktop.cjs`), takes the route TST-0063 asks a person to take. The second, `glass-collection` (`desktop/demos/glass-collection.cjs`), drives what the feature's tasks ask for and the first script does not reach. Each claim is recorded with what was seen, and pictures are kept. The nine defects listed under Evidence were found this way.

It is not TST-0063. That check is a person's, and no verdict is recorded for it here.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh glass-desktop`.
3. `bash tools/scripts/walk-in-a-box.sh glass-collection`. This is the second script: the two filters, the collapsed header, a group heading, the wheel at both ends of the list, Escape during a drag and during a resize of the collection, keyboard focus that can be seen, a verb that is refused, a document's panels, where the keyboard goes when a document is closed, the size the next note opens at, and on the served page the collection's fold, its label and the keyboard's place in a narrow window.
4. For each, read the lines beginning `drive: ok` and `drive: FAIL`, and look at the pictures in `desktop/dist/walks/glass-desktop/` and `desktop/dist/walks/glass-collection/`. The same lines are in `drive.json` there.

Both scripts run on this repository's own notes and write nothing: `git status` in the workspace is compared before and after. The first stays on the Features view. The second also opens the Intent view, to find a decision that has verbs.

## What the first script, `glass-desktop`, covers

- **The collection.** It is inside the field and the column beside the field is gone. Its count is the number of notes the sidecar returns for the view, and every counted note has a row once every heading is opened. It says how many members the field has a place for. Search narrows it and says by what; a search with no match names the query, shows zero and offers Clear filters. It is resized by its corner, moved by its header, collapsed to a header that still carries the name and the exact count, and opened again at the same size on the same row. The store holds six values for it and none of its rows.
- **Opening.** A click on a card in the field: the document is on screen, named, on the first frame, and grows from the card. Its text is the full note. No card is drawn for the open note and no neighbour is drawn twice. Its row is shown and marked in the collection. The path is under Details and not in the heading.
- **Leaving the focus.** Escape puts every card back exactly where it stood and closes nothing. Enter on the header gathers the neighbourhood again.
- **Reading.** The wheel scrolls the document to its end and, at the end and at the top, does not zoom or turn the field. Dragging across text selects it and moves nothing. Dragging the header moves the document with its neighbourhood, at the same size. The corner resizes it, and that becomes the size the next note opens at.
- **Turning away.** The desk goes with the field, dimmed and not see-through. "find" and "collection" are offered by name and bring it back.
- **Links and relationships.** A link inside the note opens the note it names as a second document. The related list has a row for every neighbour the sidecar reports; every relationship word is checked against Deck's own index of the files; every row keeps its direction. A row opens a third document.
- **Escape, in order.** With a list open, one Escape closes the list and nothing else; the next puts the cards back; "close all" closes the documents.
- **The keyboard alone.** Arrows move down the list; Enter opens a note and the keyboard goes to the document; R opens the related list and Escape closes it; arrows move the document and Alt with an arrow resizes it; Delete closes it and the keyboard is back on the same row at the same place.
- **A note already open.** Choosing its row again finds and raises the one document.
- **A read that fails.** With the note request refused at the network layer, the document opens, named, says it could not be read and offers retry and close. Retry reads it.
- **Reduced motion.** With `prefers-reduced-motion: reduce` emulated, the document is at its place and size on its first frame and nothing is animated.
- **Reload.** The collection is where it was, the documents are open at their sizes with their text, and the count is read again.
- **A narrow window.** Under 720 px of field one object is in front and fills it, a bar names the collection and each open note, nothing overflows sideways, and a note opened there is stored at a reading size. Since commit `e3f1460` the Tab key is also moved to four controls there, and each must show where the keyboard is.
- **The served page.** With the bridge absent, as a tablet loads it: "collection" brings the list in front of the Mac's documents, a row opens the full note in a document with no tick and no verb, and the desk the application keeps is unchanged.

## Expected results of the second script, `glass-collection`

- **The status filter and the type filter.** Each is chosen with the arrow keys. The list is left with the notes that match, everything each of them holds, and each note that holds a match, so that the match has a place to stand. That is the list's own rule (`narrowGroups` in `desktop/src/shared/search.ts`), and the script works out the expected rows for itself from the sidecar's answer. The header counts those rows against the whole view and names the filter.
- **The collapsed header.** With a search, a status and a type all set and a note open, the collapsed header alone says the search, the count against the whole view and both filters. Opened again, the collection has its size, the row that was marked is marked, and the list is scrolled to the same row. With the search and both filters cleared, the list is the whole view again and names no filter.
- **A group heading.** A press on it folds its rows away and its `aria-expanded` says so. Enter on it opens them again. The view's count does not change.
- **The wheel at both ends of the list.** Turned up at the first row and turned down at the last row, the wheel stays in the list: the field's zoom and bearing are what they were.
- **Escape during a drag of the collection.** The collection goes back where it was. It stays there while the pointer moves on with the button still down, and when the button is let go. The store's layout for the view is what it was before the drag, and the open note stays open.
- **Escape during a resize of the collection.** With the corner held and dragged, Escape puts the size back. A hand still on the button resizes nothing more, the store's layout is unchanged, every open note is still open and the focus is where it was. When the corner is not drawn, or something lies over it, the script writes a `NOT RUN` line instead.
- **Keyboard focus that can be seen.** Tab is pressed six times from the search box, and each control the keyboard lands on is drawn with an outline or a ring. The collection's header, its "table", "cards" and fold controls and the search box are reached with Shift-Tab and Tab from the fold control, and each must show the same. The two filters carry a name for a screen reader, the list and a row carry a role, and the fold control says whether the list is open.
- **A verb that is refused.** It is drawn inside the document, disabled, with the reason in words beside it. Pressing it asks nothing and sends nothing. The other verbs are as the sidecar gave them.
- **A document's panels.** A document whose related list and details were open comes back with every panel closed, after "close all" and after it is closed by itself.
- **Where the keyboard goes when a document is closed.** Closed with the list on screen, the keyboard is on the row the note was opened from. Closed with the collection collapsed, where that row is not on screen, the keyboard is on the collection's header and not nowhere.
- **The size the next note opens at.** A note resized with the keyboard sets the size the next note opens at on this view. The served page is opened in a window 1440 by 900, so that its field has room. A note opened there on the same view is measured once its opening has ended and must be the same size.
- **The collection's fold on the served page.** The Mac collapses the collection, and the served page draws it collapsed. The fold control on that page opens it there, folds it and opens it again. Through all three the Mac's window still shows it collapsed and the store's layout is unchanged.
- **The header's label on the served page.** It names Enter, the one key that works there, and says nothing of moving or resizing.
- **The served page in a narrow window.** In a window 760 px wide the bar between the collection and the open note is shown, and each of four controls the Tab key is moved to shows where the keyboard is.

**The refusal in the eighth result is the script's own.** No note in this workspace has a verb the sidecar refuses. So the script replaces the sidecar's answer for one note, through the debugger, with one whose first verb is disabled with a reason. What is shown is how Deck draws a refusal inside a document. It is not shown on a refusal the sidecar itself made.

## What it does not cover

- Whether a person finds the route obvious or the motion helpful. That is TST-0063.
- A screen reader. The names and roles are in the page and the second script reads them; nobody has listened to them.
- A refusal the sidecar itself made, as said above.
- A list that changed without any note changing, and the words the chip in the bar above the field then shows ("the list changed — show it"). Neither script changes a note.
- Enter and a double-click on the collection's header on the served page. The script presses the fold control there, by script and not with a pointer event. The `collection` suite tries all three on a stand-in page ([[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]]).
- Closing a document while the collection shows cards, has the row folded away under its heading, or stands behind another document in a narrow field. The script closes one with the list on screen and one with the collection collapsed.
- Escape with the collection's header pressed and not yet dragged 5 px. That key still goes to Glass.
- Touch, and a real tablet. The served page was driven in a second Electron window with no preload bridge, with a mouse pointer.
- A second display.
- Timing on the Mac. The box renders in software.
- A change on disk while the list is open, which is [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]].

## Evidence

**2026-10-02**, in the Linux box (`project-os-deck-smoke` image, Electron under Xvfb, screen 1440 by 900, window 1440 by 873), on this repository at commit `18f5405`, from a separate clone. Both scripts ran in one verification pass that also made the smoke run and the other walks, after the independent review's fixes. The Features view held 144 notes, and the collection counted 144.

| Script | Checks recorded | Checks that held | Pictures | Time | Workspace |
| --- | --- | --- | --- | --- | --- |
| `glass-desktop` | 55 | 55 | 23 | 62 seconds | unchanged |
| `glass-collection` | 17 | 17 | 3 | 60 seconds | unchanged |

No part of either script was left out: neither wrote a `NOT RUN` line. That matters for the resize step of the second script, which writes one when the corner is covered; in this run the step ran.

What the second script saw, check by check:

- The status filter at "approved": 6 notes are at that status, 10 rows are left, and the header reads "10 of 144 notes" and "narrowed: status approved". The type filter at "requirement": 6 notes, 10 rows, "narrowed: type requirement".
- Collapsed, the collection is 34 px tall and its header reads "Features", "10 of 144 notes" and "narrowed: “a” · status approved · type requirement". Before it was collapsed and after it was opened again it is 340 by 693, FEAT-0020's row is the marked one, and the list is 60 px down.
- Cleared, the header reads "144 notes" and names no filter.
- The heading for PHASE-0001 has 10 rows under it. Pressed, it has none and says it is folded. After Enter it has 10 again.
- At the first row the list stays at 0. At the last it stays at 275 of 275 px. The zoom is 1 and the bearing the same before and after.
- The collection is dragged from 192, 121 to 332, 132. After Escape it is at 192, 121. The pointer then moves three more times with the button down, and the collection is still at 192, 121; it is there after the button is let go. What the store holds for the collection is the same before and after, and FEAT-0001 is still open.
- The corner takes the collection from 340 by 693 to 420 by 717. After Escape it is 340 by 693, and it stays so while the pointer moves on and after the button is let go. The store's layout is unchanged, FEAT-0001 is still open and is still the focus.
- The collection's "cards" and "table" controls, its header, its fold control and the search box each have an outline when the Tab key arrives on them.
- Tab from the search box lands on the status filter, the type filter, a row, and then the open document's header and two of its controls. Each has an outline. The filters are named "Filter by status" and "Filter by type", the list has the role `list` and a row the role `listitem`.
- "Accept" on ADR-0005 is drawn disabled inside the document, with the reason beside it and as its tooltip. The press sent no request that writes and asked for no reason. "Supersede" is drawn as the sidecar gave it.
- With the related list and the details open, the document comes back with both closed after "close all" and again after Delete.
- FEAT-0002 closed with the list on screen leaves the keyboard on FEAT-0002's row. Closed with the collection collapsed, it leaves the keyboard on the collection's header.
- A note resized to 624 by 552 is followed by a note that opens at 624 by 552. On the served page, whose field is 1260 by 739 in this run, TASK-0010 opens at 624 by 552 too.
- With the collection collapsed by the Mac, the served page draws it 34 px tall with no row. Its fold control opens it there, 693 px tall with 76 rows on screen, folds it and opens it again. In the Mac's window it is collapsed throughout, and the store's layout for it is the same after each press.
- On the served page the header's label reads "Features, 144 notes: Enter opens it" while collapsed and "Features, 144 notes: Enter collapses it" while open.
- With the served page's window 760 px wide its field is 632 px wide, the bar holds four buttons, and each of the four controls the Tab key is moved to has an outline.

The check the first script gained: in the narrow window the Tab key is moved to four controls after the bar's first button, and each has an outline.

**How the scripts grew.** The first script first held all 54 of its checks on 2026-10-01 at commit `598ecc9`, when the view held 131 notes; it makes 55 since commit `e3f1460`. The second script was written on 2026-10-02 (commit `7103e3c`) with 11 checks and held them at `e86b2e4`. In that run its served half asserted nothing about size, because the served page's field, 772 by 446, had no room for 624 by 552. Commit `e3f1460` gave that page a larger window and added the checks on the collection's own controls and on the served page in a narrow window. Commits `716ae82`, `fb79f05` and `bad5a5c` added the resize, closing and served-fold checks with the review's fixes, which makes 17.

The first complete run of the first script, on 2026-10-01, failed nine checks. Eight were defects in the application and are fixed; each was seen failing before its fix and holding after it:

1. Escape on a document's header left the focus instead of closing the open related list.
2. A note opened with Enter left the keyboard on the row.
3. A document near the edge of sight was see-through and showed the list's text through its own.
4. The collection could be stored half below the field, with its resize corner out of reach.
5. On a page smaller than the desk, the Mac's documents covered the list and nothing offered to bring it forward.
6. A link inside a note did nothing on the served page.
7. In a narrow window the compass lay over the text being read.
8. In a window under 860 px wide the list stopped at two fifths of the window's height.

The ninth was the walk's own: it pressed a row that was hidden under a heading stuck to the top of the list.

The second script found a ninth defect in the application on 2026-10-02, fixed in commit `7103e3c`:

9. Collapsing the collection and opening it again moved the list by several hundred pixels when a note was open. The script scrolls the list 60 px down, and the commit records that it came back at 665. The rows under "Joined to what you are holding" were sorted afresh at every redraw. Their order depends on where the cards stand round the open note, which is known only a moment after the note opens. So the first redraw after that, whatever caused it, moved every row, and the list followed the row it remembered. The order is now worked out when what it describes changes, and once more when the seats round the focus are first known. The check on the collapsed header reads the scroll position before and after, 60 and 60 in this run, and would read 665 again if the defect came back.

**The independent review of FEAT-0020 on 2026-10-02 found four more, and one check of this walk that could not fail.** Two reviewers read the feature at `5e66f48` and ran node suites only; neither ran this walk. Each defect is fixed in the commit named, and the step that now holds it is named with what it would show if the defect came back. Every one of these steps held in the run at `18f5405`, with the fix in place. Nobody has run the walk with a defect put back, so that each step fails on its defect is read from the script and not seen. Round two of the review read the Escape check and said the same: fixed by reading, not run.

10. Escape during a drag of the collection left the drag live. The collection went back, but the next move of a hand still on the button began the drag again from the original press, and the release stored the moved place. Both reviewers showed it with a probe in node. **This walk's Escape check passed with the defect present,** because it pressed Escape and let go at the very point of the last move, so the pointer never moved after Escape. Fixed in commit `716ae82`. The check now moves the pointer on by one pixel and then further before letting go. With the defect back, the collection would follow the pointer again after Escape and the store's layout would change.
11. Escape while the collection was resized by its corner was not used by the collection. Reviewer B's probe showed the key was not consumed; by reading, it then reached Glass's own Escape, which leaves the focus or closes every note. Fixed in the same commit. The new step drags the corner, presses Escape and moves on. With the defect back, the size would stay as dragged, and the focus or the open notes would be gone.
12. Closing a document could leave the keyboard nowhere when the row it was opened from was not on screen. Reviewer B read this and did not run it. Fixed in commit `fb79f05`. The new step closes a document with the collection collapsed and reads which element has the keyboard. With the defect back, it would not be the collection's header.
13. On the served page a collection the Mac had collapsed could not be opened: the fold control, Enter and a double-click did nothing, and the header's label named keys that do nothing there. Reviewer B showed it with a probe. Fixed in commit `bad5a5c`. The new step has the Mac collapse the collection and the served page open it. With the defect back, the page would show no rows after its fold control is pressed.

The review's full table, with what each reviewer could not check without a window, is in [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]] under Review.
