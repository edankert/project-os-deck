---
type: "[[test]]"
id: TST-0069
aliases: ["TST-0069"]
title: "The collection holds still when notes change on disk: the change is announced and applied only when asked, the list stays on its row, and a deleted note's open document keeps its text and offers nothing that writes"
status: passing
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: integration
kind: manual
entrypoint: "desktop/demos/collection-refresh.cjs"
command: ""
last_verified: 2026-10-02
automation: "one command, run by hand: bash tools/scripts/walk-in-a-box.sh collection-refresh --copy. Not run by run-tests.py or by CI, which have no Docker."
covers: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]", "[[REQ-0001-Glass-Collections-Remain-Exact-And-Interactive]]", "[[REQ-0002-Glass-Opens-The-Full-Note-On-Its-Desk]]"]
issues: []
tasks: ["[[TASK-0095-Model-An-Exact-Collection-On-The-Desk]]", "[[TASK-0099-Walk-The-Glass-Desktop-At-Real-Scale]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0067-A-Collection-Counts-Exactly-And-Keeps-Its-Place]]", "[[TST-0068-The-Glass-Desktop-Is-Walked-With-A-Real-Pointer]]"]
---

# The collection holds still when notes change on disk

## Purpose

REQ-0001 says a changed result is announced before it re-orders anything under a pointer, and that a document whose note left the result stays usable. Neither can be shown without changing notes, and no check may change the workspace it reads. So this walk runs on a throwaway copy of the notes, made inside the box, and changes three files there while the Issues list is open: it deletes the note that is open as a document, changes another note's status, and adds a note.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh collection-refresh --copy`.
3. Read the `drive:` lines and look at the four pictures in `desktop/dist/walks/collection-refresh/`.

The walk refuses to run on anything that is not a copy under `/tmp`, and on any directory that is a git repository.

## Expected results

- The collection says "3 notes changed: 1 added, 1 removed, 1 changed" and offers apply.
- Until apply is pressed no row has moved, arrived or left, including the rows under "Joined to what you are holding", and the count is still the count of the list on screen.
- The open document of the deleted note keeps the text that was read. It says the text is as it was last read and that the note was deleted, renamed or moved, and offers retry and close. Its ticks and verbs are hidden.
- After apply the new note has a row, the deleted one has none under any heading of the view, and the count is the new exact count.
- The list is scrolled to the same note, under the same heading, at the same place.
- The collection says the open note is no longer in the list and that its document stays open.
- The document still has its title and its text, and can be closed.
- Closed, the keyboard goes to the collection's header and the status line says the note is not in the list any more.

## What it does not cover

- A rename or a move. The document's message names all three, "deleted, renamed or moved", and the walk only deletes.
- Any view but Issues.
- A person's pointer. The walk rests a scripted pointer on a row; whether a person notices the announcement is TST-0063.
- The Mac. The box renders in software.

## Evidence

**2026-10-02**, in the Linux box (`project-os-deck-smoke` image, Electron under Xvfb), at commit `e86b2e4`, on a copy of this repository's notes made inside the box: 10 checks recorded, 10 held, 4 pictures, 8 seconds. No part of the walk was left out. The walk deleted ISS-0008 while it was open as a document, changed ISS-0069 from `open` to `fixed`, and added ISS-9999. The Issues view held 91 notes before and 91 after, one in and one out, and 88 rows held their order until apply was pressed. The walk chooses the notes it changes from the list on screen, so they are not the same notes as in the run on 2026-10-01.

The walk first held all 10 on 2026-10-01. Its first run that day failed five. All five were defects in the application and are fixed:

1. The collection did not say a change was waiting. Only the chip in the field's bar did.
2. The "Joined to what you are holding" rows vanished and came back on every save, so the row under the pointer became another row.
3. The deleted note's document lost its text and showed "the sidecar answered 404" and a line of JSON.
4. After apply the document lost its title and its text again, because the view no longer held the note.
5. After apply the list was scrolled to the wrong row, by the height of the line that had appeared above it.

The smoke run makes a smaller version of the same check on the workspace itself, without writing a file: its `switch` part shows a change arriving, the collection saying "1 note changed: 1 changed" with one apply button, and no card moving until the person acts.
