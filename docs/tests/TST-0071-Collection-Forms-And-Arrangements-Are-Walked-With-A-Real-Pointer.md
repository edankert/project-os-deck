---
type: "[[test]]"
id: TST-0071
aliases: ["TST-0071"]
title: "Collection forms and arrangements are walked with a real pointer and keyboard: the same members as a table, as cards and as a header; Read, Compare and Show related shown before they are applied; undo; one relationship picked out; and a preview and an undo that meet a changed desk"
status: passing
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: integration
kind: manual
entrypoint: "desktop/demos/glass-arrangements.cjs"
command: ""
last_verified: 2026-10-02
automation: "one command, run by hand: bash tools/scripts/walk-in-a-box.sh glass-arrangements --copy. Not run by run-tests.py or by CI, which have no Docker."
covers: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]", "[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]"]
issues: []
tasks: ["[[TASK-0101-Change-A-Collection-Between-Stack-Table-And-Cards]]", "[[TASK-0102-Preview-Apply-And-Undo-Glass-Arrangements]]", "[[TASK-0103-Walk-Collection-Forms-And-Arrangements-At-Scale]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]", "[[TST-0070-An-Arrangement-Is-A-Plan-Before-It-Is-A-Move]]", "[[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]"]
---

# Collection forms and arrangements are walked with a real pointer

## Purpose

One route through the real application, the route TST-0064 asks a person to take, driven by `webContents.sendInputEvent`. Each claim is recorded with what was seen, and 14 pictures are kept. It changes notes on disk in two places: it changes one note's status to show a preview being worked out again, and it ticks one criterion through the sidecar's own guarded route to show that undoing an arrangement leaves a source edit alone. So it runs on a throwaway copy of the notes, made inside the box, and refuses anything else.

It is not TST-0064. That check is a person's, and no verdict is recorded for it here.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh glass-arrangements --copy`.
3. Read the lines beginning `drive: ok`, `drive: FAIL` and `drive: NOT RUN`, and look at the pictures in `desktop/dist/walks/glass-arrangements/`.

## What it covers, against TST-0064's steps

- **Step 1, the three forms.** With the list narrowed by a search: the header counts the members the list holds. As a stack it is the header alone, with the same count, the same members and the filter named. As cards the count and the members are the same, and the cards open at the note the table was scrolled to. Walking the cards from the first page to the last draws every member on some page and nothing else. The wheel over a card moves through the cards and does not zoom or turn the field. It goes on to the last row and stops there: the last member is drawn, and turning it further neither zooms nor turns the field. Collapsed while it is cards, the collection is the header alone with the same count and no card drawn. Opened again from its header it is cards again, on the row of cards it was on. Back as a table, the list is on the row it was on.
- **The selected note, through a change of form.** Added in commit `2b5d578`, after the review found no check for it. A note is opened from its row and its document closed, so the note stays the selected one and is a card, not a reference, among the cards. Its row is the one marked in the table. As cards, its card is the one card marked. Back as a table, its row is the one marked again.
- **A view that cannot be read.** TST-0064 has no step for this. The walk refuses the window's request for the Issues list. The collection then says "Issues could not be read", with the reason and a `retry` button, and shows no row; it is not drawn as an empty view. Pressing `retry` once the request is allowed brings the list back.
- **Step 2, one object per note.** With a note open and the collection as cards, no note id has two cards. The open note is a reference in its cell, and pressing it finds the document. The collection says how many members are elsewhere on the desk. Since `2b5d578` the Tab key is pressed from the cards until the keyboard is on a reference, and the reference must show a 2 px outline in the accent colour, not the hover border alone.
- **Step 3, Read.** Shown: an outline at the destination, the objects named, the keyboard on Apply, and nothing moved. Escape withdraws it and nothing else. Applied: the document is the size it was, scrolled where it was, with text the size it was; the list is down the left and the document beside it. Undo arrangement is offered by name.
- **Step 4, Compare.** Two documents at different sizes and different reading positions stand side by side at one height, each at its own size and position. Before the undo the script looks in both documents' text for a link to a note that is not on the desk. When it finds one, it presses it, the note opens as a third document, and the walk checks that the undo leaves the third where it was. When neither document has such a link, it writes a line beginning `NOT RUN`. Undo puts both documents and the collection back and asks nothing.
- **Step 5, one note.** Compare with one note open says it needs two, shows no preview and moves nothing. The commands take no selection, so Compare is always about the top two; "three selected" has no meaning here and is not walked.
- **Step 6, Show related.** A row for each note the sidecar reports, the number the preview named. The relationships offered are exactly the frontmatter keys Deck's index of the files finds, each with its count, and "link" is not one of them. Picking one leaves exactly those notes undimmed, says "N of M", and keeps every row. A note joined only by a link in the text is dimmed under every pick. Clear restores, and the number of links in the index is unchanged. Then one relationship is picked out, Read is applied, the pick is cleared, and Undo arrangement is pressed: the same relationship is picked out again. Two checks were added in `2b5d578`. The Tab key is pressed from the document's header until the keyboard is on a "pick out" chip in its list, and the chip must show the same outline. And while the document is arranged for reading, so that it is not the focus, a chip pressed in its list must say the count for that document, the number its list picks out.
- **Step 7, change under a preview and an undo.** A note's status is changed on disk while Compare is shown. The preview is worked out again and says that notes changed on disk, not that the desk did; the status line says the same sentence; and the preview's text is a polite live region. Then a third note is opened on top of the two while the preview is still shown, through the store, as another window of the application would open it. The preview is still about the same two notes, names the third as what was opened, in the preview and in the status line, and now says the other open note stays where it is. Apply then brings the two compared notes above the third. The plan first shown was made when the two were already on top and would have raised nothing, so this check fails if the old plan is the one applied. After a document is dragged by hand, Undo names it before doing anything; "Undo the rest" puts the other back and leaves the dragged one. After a document is closed, Undo says so and does not open it again. While that question is on screen the other note is moved through the store: "Undo the rest", pressed, puts nothing back, shows the question again with that note in its list, and says so in the status line.
- **Step 8, a source edit.** A criterion is ticked in its document through the sidecar; the file gains one `- [x]`. After an arrangement and its undo the file still has it.
- **Step 9, keyboard and reduced motion.** With the keyboard on Read, Enter shows the preview; Escape withdraws it and returns the keyboard to Read; Tab goes from Apply to Cancel; Enter applies; with `prefers-reduced-motion: reduce` emulated the document is at its new place at once. Enter on Undo arrangement puts it back. Since commit `e3f1460` Tab goes from Read to Compare and to Show related, each shows where the keyboard is, Enter on each shows what it would do or says why it cannot, and Escape withdraws it with nothing moved and the keyboard back on the control.
- **Two documents that overlap.** TST-0064 has no step of its own for this; its Expect asks that a narrow screen keeps readable sizes without shrinking text. In a window 1060 px wide, too narrow for the two documents side by side and not narrow enough for the one-at-a-time bar, the preview of Compare says by how many pixels they will overlap. Applied, they stand at one height at their own sizes and overlap by that much. Pressing the one behind brings it to the front.
- **A window shorter than the collection.** TST-0064 has no step for this. Added in `2b5d578`, for the first claim the review refuted. The collection is stored open, and the window is then made shorter than the collection's stored height. The collection is drawn shorter to fit, and the preview of Read outlines it that way. Apply stores its new place and the height it had, not the fitted one. Undo arrangement asks nothing and leaves what is stored for the collection, and the desk, the same bytes as before. The window is 540 px high or more: the collection is never drawn lower than 240 px, and in a window 420 px high the field was 237 (commit `e158c73`).
- **Step 10, narrow, reload, served.** In a narrow window each compared note is reached by name in the bar, one at a time, with text the same size and the stored sizes untouched. After a reload the desk and the collection are where they were, the collection is still cards, the members are read again, and the undo is gone. The store keeps six values for the collection. The served page offers no arrangement and no change of form.

## What it does not cover

- Whether a person finds the three commands useful, how long comparing two notes takes them, or how often they pick the wrong note. That is TST-0064.
- Step 11's measurements, which are [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]].
- An older saved desk, which is checked without a window in [[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]].
- Compare and Show related applied from a start on the keyboard. The walk reaches each with Tab, shows it with Enter and withdraws it with Escape. Where it applies them, in steps 4 and 6, it starts them with the pointer and applies them with Enter. Read is the one shown, withdrawn, applied and undone with the keyboard alone.
- How the keyboard gets to Read and to Undo arrangement. The script puts the keyboard on each button itself and then presses Enter; it does not reach them with Tab.
- Whether a document is scrolled to the same place after an undo as before the arrangement. The walk itself scrolls one compared document to bring a link into view before it presses Undo arrangement, so the check after the undo compares places and sizes only. That Apply leaves the reading position alone is checked, for Read and for Compare.
- An arrangement of a view other than the one the store has selected. The walk arranges the view on screen. The suite `arrange` holds that an arrangement naming a view changes that view's desk and no other.
- A window too narrow for Read or for Show related. The walk narrows the window for Compare only. The fold of the collection to its header in those two plans is checked without a window in [[TST-0070-An-Arrangement-Is-A-Plan-Before-It-Is-A-Move]].
- An Apply pressed at the instant the plan changes. The third note is opened more than a second before Apply is pressed, so the preview has been worked out again by then. Round two of the review read that such a press sends the store nothing; no test drives it either.
- Whether a screen reader reads the reworked sentence out. The walk checks that the status line holds it and that the preview's text is a polite live region.
- A second display, a real tablet, a screen reader and touch. The served page is driven in a second Electron window that has no preload bridge.

## Evidence

**2026-10-02**, in the Linux box (the `project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900), on a copy of this repository's notes made inside the box, at commit `18f5405`: 59 checks recorded, 59 held, no line beginning `NOT RUN`, 14 pictures, 113 seconds. The record is `desktop/dist/walks/glass-arrangements/drive.json` in the clone the verification pass ran from. The Features view held 144 notes, and 59 when narrowed by "glass". As cards the collection drew at most 12 at once and reached all 59 over its pages. The pass before the review, at `e86b2e4`, recorded 51 checks, all of which held.

What the record shows for the eight checks added since, and for the two that were made able to fail:

- **The selected note through a change of form** (added). FEAT-0002 was opened from its row and its document closed. It was the selected note and the one row marked in the table. As cards it was drawn as a card and was the one card marked. Back as a table it was the one row marked again.
- **The keyboard on a reference among the cards** (added). One press of Tab from the cards put the keyboard on the reference for FEAT-0002. Its outline was solid, 2 px wide, in `rgb(122, 162, 247)`, which is the accent colour the page reported.
- **The keyboard on a "pick out" chip** (added). Eight presses of Tab from the document's header went into its list and put the keyboard on the chip "covers". Its outline was the same: solid, 2 px, the accent colour.
- **The count a chip announces on a document that is not the focus** (added). With FEAT-0002 arranged for reading and no document the focus, "covers" was pressed in its list. The status line said ""covers": 5 of the notes joined to FEAT-0002 are picked out; the rest are dimmed and still listed", the number its list picks out.
- **A note changed on disk under a preview** (made stricter). The status of TASK-0012 was changed on disk while Compare was shown. The preview read "While this was shown, notes changed on disk, so it was worked out again from what is there now. Moves 3 objects: FEAT-0002, TASK-0008 and the collection. Sizes and text are not changed." The status line held the first of those sentences, and the preview's text had `aria-live="polite"`. The word "desk" was not in it.
- **A note opened under a preview** (added). TASK-0006 was opened on top of FEAT-0002 and TASK-0008 through the store. The preview was still "Compare FEAT-0002 and TASK-0008". It and the status line said "While this was shown, TASK-0006 was opened and notes changed on disk, so it was worked out again from what is there now." The preview gained the line "The other open note stays where it is.", which the first preview did not have.
- **Apply applies the plan on screen** (made able to fail). After Apply the stack was TASK-0006, FEAT-0002, TASK-0008, lowest first: the two compared notes were above the third. They stood at one height, 560 by 520 and 512 by 552. The plan first shown was made when the two were already on top and names no change of stacking, so applying it would have left TASK-0006 over them.
- **"Undo the rest" after a further change** (added). TASK-0008 was closed and Undo arrangement pressed, and the question listed "TASK-0008 has been closed since". FEAT-0002 was then moved through the store. "Undo the rest" put nothing back. The question listed "FEAT-0002 has been moved since" and "TASK-0008 has been closed since", and the status line said "What has changed since the arrangement is not what was listed, so nothing was put back. The list is worked out again." Undo arrangement was still offered.
- **Compare and Show related from the keyboard** (added in `e3f1460`). One press of Tab from Read put the keyboard on Compare, and one more on Show related, each with an outline. Enter on each showed its preview, "Compare FEAT-0002 and TASK-0080" and "Show what TASK-0080 is joined to", with the keyboard on Apply. Escape withdrew each with the desk the same bytes and the keyboard back on the control.
- **A window shorter than the collection** (added). The collection was stored 693 px high at `x: 40, y: 60`. In a field 423 px high it was drawn 423 px high, and the preview of Read outlined it 423 px high. Apply stored `x: 12, y: 12, w: 340, h: 693`. Undo arrangement asked nothing, and what was stored afterwards was the same bytes as before Apply, as was the desk.

What the record shows for the checks added in commit `c5af79f`, which held again:

- **The wheel to the last row.** The last 11 of the 59 cards were drawn, the last member (TASK-0105) among them, with the field's zoom at 1 and its turn at 0 after six more notches.
- **Collapsed as cards and opened again.** Collapsed, the collection was 34 px high, said "59 of 144 notes" and drew no card. Opened again it drew the same 11 cards from the same row, with the `cards` button still pressed.
- **A view that cannot be read.** The collection read "Issues could not be read: the sidecar did not answer: Failed to fetch", with `retry` and no row. After `retry` the list was back with "91 notes" in its header.
- **The link inside a compared document.** It ran. FEAT-0002 and TASK-0006 were compared, a link to PHASE-0001 was pressed, and PHASE-0001 opened as a third document. After the undo all three were open and PHASE-0001 had not moved. Before commit `c5af79f` the script looked in one document only and wrote nothing when it found no link, so two earlier runs recorded 44 checks where 45 were written.
- **The picked-out relationship.** "covers" was picked out for FEAT-0002, Read was applied, and the pick was cleared. After Undo arrangement "covers" was picked out again, the list was open with the same 5 rows undimmed, and it said ""covers": 5 of 28 picked out. All 28 are still listed."
- **Two documents that overlap.** In a window 1060 px wide the preview said "FEAT-0002 and TASK-0080 are 1088 px wide together and this window has 908. They keep their sizes and overlap by 164 px; pressing either brings it to the front." Applied, the two were 560 and 512 px wide and overlapped by 164 px. FEAT-0002 was behind, and pressing it brought it to the front.

Since commit `3ff281c` the walks' shared press on a control (`clickOn` in `desktop/demos/lib.cjs`) stops the walk when something else is drawn at the point it aims for. Before that, a press on a control that was cut off or covered landed on whatever was there, and the walk went on. This walk's presses on the collection's and the arrangement's buttons go through it. Its presses on rows, on links and on the narrow bar's buttons do not. The step that clears the pick after the check of the picked-out relationship used to swallow a failed press; it now leaves the control alone when it is not drawn and fails when it is drawn and covered.

What the walk found while it was being written, all fixed:

1. Undo after Show related said the collection "has been moved, resized or changed form since" when nobody had touched it. The field was 744.5 px high, the plan asked for a collection 720.5 px high, the store kept 721, and the undo compared the two. Plans were put in whole pixels. Since commit `b3c4219` a plan writes no height for the collection at all.
2. In a window 780 px wide the field was not narrow when it should have been. The field's bar had gained four buttons, its width set the field area's width, the area wrapped under the rail and was then 780 px wide. The area is now sized from the room there is.

One step failed once and has not failed since: pressing a note's name in the narrow bar left the other note in front. The same run had a message on screen over that bar. The message takes no pointer, and the two runs after it at `b017807` passed, so the cause is not known. It is recorded here and not explained away. It did not recur in the pass at `18f5405`: the run records that the bar's button for FEAT-0002 was the element under the pointer, and FEAT-0002 came to the front with its text at 14 px.

What the second close-out and the independent review of FEAT-0022 found in this walk on 2026-10-02, and one fault in a check written for the review:

1. The check "Apply then applies the plan on screen, not the one it replaced" could not fail. The change made while the preview was shown was a status edited on disk, which moves nothing, so the first plan and the plan worked out again put the two notes in the same places. A third note is now opened on top of the two while Compare is shown, and the check reads the stack after Apply (commit `2b5d578`).
2. The review found no check that the selected note survives a change of form. There is one now (commit `2b5d578`).
3. The walk began Compare and Show related with the pointer only. The second close-out of the notes found this, before the review. The walk now reaches each with Tab from Read (commit `e3f1460`).
4. No check on screen reached the defects the review refuted claims with: the fitted height stored in a short window, the outline on the chips and the references, the count a chip announces on a document that is not the focus, what a reworked preview says, and "Undo the rest" after a further change. Each has a check now (commit `2b5d578`), and each held in the pass at `18f5405`.
5. The check for a short window, as first written, made the window 420 px high. The field was then 237 px high, and the collection is never drawn lower than 240, so the check's own condition failed. The commit says the rule it is about held in that run: Apply stored the height the collection had, and Undo left the stored layout the same bytes. The window is now 540 px high or more (commit `e158c73`), and in the pass at `18f5405` the field was 423 px high.
