---
type: "[[test]]"
id: TST-0068
aliases: ["TST-0068"]
title: "The Glass desktop is walked with a real pointer and keyboard: the collection on the field, a full note opened from a card, a row and a link, read, moved, found again and closed back to its row, in a narrow window and on the served page"
status: passing
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["[[TASK-0096-Draw-And-Operate-The-Collection-In-Glass]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: integration
entrypoint: "desktop/demos/glass-desktop.cjs"
command: ""
last_verified: 2026-10-01
automation: "one command, run by hand: bash tools/scripts/walk-in-a-box.sh glass-desktop. Not run by run-tests.py or by CI, which have no Docker."
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

`node --test` cannot load the renderer, and the smoke run answers one question, whether every check still holds. This is a different kind of evidence: one route through the real application, the route TST-0063 asks a person to take, driven by `webContents.sendInputEvent` so the browser hit-tests every press as it does a person's. Each claim is recorded with what was seen, and 23 pictures are kept. It is how the eight defects listed under Evidence were found.

It is not TST-0063. That check is a person's, and no verdict is recorded for it here.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh glass-desktop`.
3. Read the lines beginning `drive: ok` and `drive: FAIL`, and look at the pictures in `desktop/dist/walks/glass-desktop/`. The same lines are in `drive.json` there.

It runs on this repository's own notes, on the Features view, and writes nothing: `git status` in the workspace is compared before and after.

## What it covers

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
- **A narrow window.** Under 720 px of field one object is in front and fills it, a bar names the collection and each open note, nothing overflows sideways, and a note opened there is stored at a reading size.
- **The served page.** With the bridge absent, as a tablet loads it: "collection" brings the list in front of the Mac's documents, a row opens the full note in a document with no tick and no verb, and the desk the application keeps is unchanged.

## What it does not cover

- Whether a person finds the route obvious or the motion helpful. That is TST-0063.
- A screen reader. The names are in the page; nobody has listened to them.
- Touch. The served page was driven with a mouse pointer.
- Timing on the Mac. The box renders in software.
- A change on disk while the list is open, which is [[TST-0069-The-Collection-Holds-Still-When-Notes-Change-On-Disk]].

## Evidence

**2026-10-01**, in the Linux box (`project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900), on this repository at commit `598ecc9` plus the walk's own tidying: 54 checks recorded, 54 held, 23 pictures, workspace unchanged, 61 seconds. Run three times after the last fix to the application, with the same result each time.

The first complete run failed nine checks. Eight were defects in the application and are fixed; each was seen failing before its fix and holding after it:

1. Escape on a document's header left the focus instead of closing the open related list.
2. A note opened with Enter left the keyboard on the row.
3. A document near the edge of sight was see-through and showed the list's text through its own.
4. The collection could be stored half below the field, with its resize corner out of reach.
5. On a page smaller than the desk, the Mac's documents covered the list and nothing offered to bring it forward.
6. A link inside a note did nothing on the served page.
7. In a narrow window the compass lay over the text being read.
8. In a window under 860 px wide the list stopped at two fifths of the window's height.

The ninth was the walk's own: it pressed a row that was hidden under a heading stuck to the top of the list.
