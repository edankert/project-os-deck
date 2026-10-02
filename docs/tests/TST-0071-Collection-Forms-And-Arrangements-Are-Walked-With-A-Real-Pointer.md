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

One route through the real application, the route TST-0064 asks a person to take, driven by `webContents.sendInputEvent`. Each claim is recorded with what was seen, and 12 pictures are kept. It changes notes on disk in two places: it changes one note's status to show a preview being worked out again, and it ticks one criterion through the sidecar's own guarded route to show that undoing an arrangement leaves a source edit alone. So it runs on a throwaway copy of the notes, made inside the box, and refuses anything else.

It is not TST-0064. That check is a person's, and no verdict is recorded for it here.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh glass-arrangements --copy`.
3. Read the lines beginning `drive: ok` and `drive: FAIL`, and look at the pictures in `desktop/dist/walks/glass-arrangements/`.

## What it covers, against TST-0064's steps

- **Step 1, the three forms.** With the list narrowed by a search: the header counts the members the list holds. As a stack it is the header alone, with the same count, the same members and the filter named. As cards the count and the members are the same, and the cards open at the note the table was scrolled to. Walking the cards from the first page to the last draws every member on some page and nothing else. The wheel over a card moves through the cards and does not zoom or turn the field. Back as a table, the list is on the row it was on.
- **Step 2, one object per note.** With a note open and the collection as cards, no note id has two cards. The open note is a reference in its cell, and pressing it finds the document. The collection says how many members are elsewhere on the desk.
- **Step 3, Read.** Shown: an outline at the destination, the objects named, the keyboard on Apply, and nothing moved. Escape withdraws it and nothing else. Applied: the document is the size it was, scrolled where it was, with text the size it was; the list is down the left and the document beside it. Undo arrangement is offered by name.
- **Step 4, Compare.** Two documents at different sizes and different reading positions stand side by side at one height, each at its own size and position. Undo puts both and the collection back and asks nothing. Before the undo the script looks in the second document's text for a link it can press. When it finds one, it opens that note as a third document and checks that the undo leaves the third where it was. When it finds none, it skips that check and writes no line saying so.
- **Step 5, one note.** Compare with one note open says it needs two, shows no preview and moves nothing. There is no selection apart from which notes are open, so Compare is always about the top two; "three selected" has no meaning here and is not walked.
- **Step 6, Show related.** A row for each note the sidecar reports, the number the preview named. The relationships offered are exactly the frontmatter keys Deck's index of the files finds, each with its count, and "link" is not one of them. Picking one leaves exactly those notes undimmed, says "N of M", and keeps every row. A note joined only by a link in the text is dimmed under every pick. Clear restores, and the number of links in the index is unchanged.
- **Step 7, change under a preview and an undo.** A note's status is changed on disk while Compare is shown: the preview is worked out again and says so, and Apply applies the plan on screen. After a document is dragged by hand, Undo names it before doing anything; "Undo the rest" puts the other back and leaves the dragged one. After a document is closed, Undo says so and does not open it again.
- **Step 8, a source edit.** A criterion is ticked in its document through the sidecar; the file gains one `- [x]`. After an arrangement and its undo the file still has it.
- **Step 9, keyboard and reduced motion.** Read shown from the keyboard; Escape withdraws it and returns the keyboard to Read; Tab goes from Apply to Cancel; Enter applies; with `prefers-reduced-motion: reduce` emulated the document is at its new place at once. Enter on Undo arrangement puts it back.
- **Step 10, narrow, reload, served.** In a narrow window each compared note is reached by name in the bar, one at a time, with text the same size and the stored sizes untouched. After a reload the desk and the collection are where they were, the collection is still cards, the members are read again, and the undo is gone. The store keeps six values for the collection. The served page offers no arrangement and no change of form.

## What it does not cover

- Whether a person finds the three commands useful, how long comparing two notes takes them, or how often they pick the wrong note. That is TST-0064.
- Step 11's measurements, which are [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]].
- An older saved desk, which is checked without a window in [[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]].
- Two compared documents that overlap. In the walk's window the two fit side by side once the collection is collapsed. The sentence that says by how many pixels they overlap is checked without a window in [[TST-0070-An-Arrangement-Is-A-Plan-Before-It-Is-A-Move]].
- Whether an undo puts back the relationship that was picked out before the arrangement. The application's `undoArrange` does it, and no check reads it.
- A collapsed collection of cards opened again from its header. The walk goes from the header straight to cards by the `cards` button.
- Compare and Show related started from the keyboard. The walk starts them with the pointer and applies them with Enter. Read is the one shown, withdrawn, applied and undone with the keyboard alone.
- The wheel turned until the cards reach their last row. The walk turns it three notches and checks that the field neither zooms nor turns.
- A second display, a real tablet, a screen reader and touch. The served page is driven in a second Electron window that has no preload bridge.

## Evidence

**2026-10-02**, in the Linux box (the `project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900), on a copy of this repository's notes made inside the box, at commit `4243fc2`: 44 checks recorded, 44 held, 12 pictures, 71 seconds. The record is `desktop/dist/walks/glass-arrangements/drive.json` in the clone the verification pass ran from. The Features view held 144 notes, and 59 when narrowed by "glass". As cards the collection drew at most 14 at once and reached all 59 over its pages.

One of the script's 45 checks did not run in this pass: the link inside a compared document (step 4). The script found no link it could press in TASK-0006's text. After the undo the desk held FEAT-0002 and TASK-0006 and no third note, so "leaves a note opened since alone" was not shown on screen. The first run, at `b017807`, also recorded 44 checks with the same script. Without a window, [[TST-0070-An-Arrangement-Is-A-Plan-Before-It-Is-A-Move]] checks that a plan and an undo name only the documents the arrangement moved.

What the walk found while it was being written, all fixed:

1. Undo after Show related said the collection "has been moved, resized or changed form since" when nobody had touched it. The field was 744.5 px high, the plan asked for a collection 720.5 px high, the store kept 721, and the undo compared the two. Plans are now in whole pixels.
2. In a window 780 px wide the field was not narrow when it should have been. The field's bar had gained four buttons, its width set the field area's width, the area wrapped under the rail and was then 780 px wide. The area is now sized from the room there is.

One step failed once and has not failed since: pressing a note's name in the narrow bar left the other note in front. The same run had a message on screen over that bar. The message takes no pointer, and the two runs after it at `b017807` passed, so the cause is not known. It is recorded here and not explained away. It did not recur in the pass at `4243fc2`: the run records that the bar's button for FEAT-0002 was the element under the pointer, and FEAT-0002 came to the front with its text at 14 px.
