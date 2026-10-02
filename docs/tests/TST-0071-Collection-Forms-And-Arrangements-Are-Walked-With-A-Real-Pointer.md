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
- **A view that cannot be read.** TST-0064 has no step for this. The walk refuses the window's request for the Issues list. The collection then says "Issues could not be read", with the reason and a `retry` button, and shows no row; it is not drawn as an empty view. Pressing `retry` once the request is allowed brings the list back.
- **Step 2, one object per note.** With a note open and the collection as cards, no note id has two cards. The open note is a reference in its cell, and pressing it finds the document. The collection says how many members are elsewhere on the desk.
- **Step 3, Read.** Shown: an outline at the destination, the objects named, the keyboard on Apply, and nothing moved. Escape withdraws it and nothing else. Applied: the document is the size it was, scrolled where it was, with text the size it was; the list is down the left and the document beside it. Undo arrangement is offered by name.
- **Step 4, Compare.** Two documents at different sizes and different reading positions stand side by side at one height, each at its own size and position. Before the undo the script looks in both documents' text for a link to a note that is not on the desk. When it finds one, it presses it, the note opens as a third document, and the walk checks that the undo leaves the third where it was. When neither document has such a link, it writes a line beginning `NOT RUN`. Undo puts both documents and the collection back and asks nothing.
- **Step 5, one note.** Compare with one note open says it needs two, shows no preview and moves nothing. There is no selection apart from which notes are open, so Compare is always about the top two; "three selected" has no meaning here and is not walked.
- **Step 6, Show related.** A row for each note the sidecar reports, the number the preview named. The relationships offered are exactly the frontmatter keys Deck's index of the files finds, each with its count, and "link" is not one of them. Picking one leaves exactly those notes undimmed, says "N of M", and keeps every row. A note joined only by a link in the text is dimmed under every pick. Clear restores, and the number of links in the index is unchanged. Then one relationship is picked out, Read is applied, the pick is cleared, and Undo arrangement is pressed: the same relationship is picked out again.
- **Step 7, change under a preview and an undo.** A note's status is changed on disk while Compare is shown: the preview is worked out again and says so, and Apply applies the plan on screen. After a document is dragged by hand, Undo names it before doing anything; "Undo the rest" puts the other back and leaves the dragged one. After a document is closed, Undo says so and does not open it again.
- **Step 8, a source edit.** A criterion is ticked in its document through the sidecar; the file gains one `- [x]`. After an arrangement and its undo the file still has it.
- **Step 9, keyboard and reduced motion.** With the keyboard on Read, Enter shows the preview; Escape withdraws it and returns the keyboard to Read; Tab goes from Apply to Cancel; Enter applies; with `prefers-reduced-motion: reduce` emulated the document is at its new place at once. Enter on Undo arrangement puts it back.
- **Two documents that overlap.** TST-0064 has no step of its own for this; its Expect asks that a narrow screen keeps readable sizes without shrinking text. In a window 1060 px wide, too narrow for the two documents side by side and not narrow enough for the one-at-a-time bar, the preview of Compare says by how many pixels they will overlap. Applied, they stand at one height at their own sizes and overlap by that much. Pressing the one behind brings it to the front.
- **Step 10, narrow, reload, served.** In a narrow window each compared note is reached by name in the bar, one at a time, with text the same size and the stored sizes untouched. After a reload the desk and the collection are where they were, the collection is still cards, the members are read again, and the undo is gone. The store keeps six values for the collection. The served page offers no arrangement and no change of form.

## What it does not cover

- Whether a person finds the three commands useful, how long comparing two notes takes them, or how often they pick the wrong note. That is TST-0064.
- Step 11's measurements, which are [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]].
- An older saved desk, which is checked without a window in [[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]].
- Compare and Show related started from the keyboard. The walk starts them with the pointer and applies them with Enter. Read is the one shown, withdrawn, applied and undone with the keyboard alone.
- How the keyboard gets to Read and to Undo arrangement. The script puts the keyboard on each button itself and then presses Enter; it does not reach them with Tab.
- Whether a document is scrolled to the same place after an undo as before the arrangement. The walk itself scrolls one compared document to bring a link into view before it presses Undo arrangement, so the check after the undo compares places and sizes only. That Apply leaves the reading position alone is checked, for Read and for Compare.
- A second display, a real tablet, a screen reader and touch. The served page is driven in a second Electron window that has no preload bridge.

## Evidence

**2026-10-02**, in the Linux box (the `project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900), on a copy of this repository's notes made inside the box, at commit `e86b2e4`: 51 checks recorded, 51 held, no line beginning `NOT RUN`, 14 pictures, 92 seconds. The record is `desktop/dist/walks/glass-arrangements/drive.json` in the clone the verification pass ran from. The Features view held 144 notes, and 59 when narrowed by "glass". As cards the collection drew at most 12 at once and reached all 59 over its pages.

What the record shows for the checks added in commit `c5af79f`:

- **The wheel to the last row.** The last 11 of the 59 cards were drawn, the last member (TASK-0105) among them, with the field's zoom at 1 and its turn at 0 after six more notches.
- **Collapsed as cards and opened again.** Collapsed, the collection was 34 px high, said "59 of 144 notes" and drew no card. Opened again it drew the same 11 cards from the same row, with the `cards` button still pressed.
- **A view that cannot be read.** The collection read "Issues could not be read: the sidecar did not answer: Failed to fetch", with `retry` and no row. After `retry` the list was back with "91 notes" in its header.
- **The link inside a compared document.** It ran. FEAT-0002 and TASK-0006 were compared, a link to PHASE-0001 was pressed, and PHASE-0001 opened as a third document. After the undo all three were open and PHASE-0001 had not moved. Before commit `c5af79f` the script looked in one document only and wrote nothing when it found no link, so two earlier runs recorded 44 checks where 45 were written.
- **The picked-out relationship.** "covers" was picked out for FEAT-0002, Read was applied, and the pick was cleared. After Undo arrangement "covers" was picked out again, the list was open with the same 5 rows undimmed, and it said ""covers": 5 of 28 picked out. All 28 are still listed."
- **Two documents that overlap.** In a window 1060 px wide the preview said "FEAT-0002 and TASK-0080 are 1088 px wide together and this window has 908. They keep their sizes and overlap by 164 px; pressing either brings it to the front." Applied, the two were 560 and 512 px wide and overlapped by 164 px. FEAT-0002 was behind, and pressing it brought it to the front.

Since commit `3ff281c` the walks' shared press on a control (`clickOn` in `desktop/demos/lib.cjs`) stops the walk when something else is drawn at the point it aims for. Before that, a press on a control that was cut off or covered landed on whatever was there, and the walk went on. This walk's presses on the collection's and the arrangement's buttons go through it. Its presses on rows, on links and on the narrow bar's buttons do not. The step that clears the pick after the check of the picked-out relationship used to swallow a failed press; it now leaves the control alone when it is not drawn and fails when it is drawn and covered.

What the walk found while it was being written, all fixed:

1. Undo after Show related said the collection "has been moved, resized or changed form since" when nobody had touched it. The field was 744.5 px high, the plan asked for a collection 720.5 px high, the store kept 721, and the undo compared the two. Plans are now in whole pixels.
2. In a window 780 px wide the field was not narrow when it should have been. The field's bar had gained four buttons, its width set the field area's width, the area wrapped under the rail and was then 780 px wide. The area is now sized from the room there is.

One step failed once and has not failed since: pressing a note's name in the narrow bar left the other note in front. The same run had a message on screen over that bar. The message takes no pointer, and the two runs after it at `b017807` passed, so the cause is not known. It is recorded here and not explained away. It did not recur in the pass at `e86b2e4`: the run records that the bar's button for FEAT-0002 was the element under the pointer, and FEAT-0002 came to the front with its text at 14 px.
