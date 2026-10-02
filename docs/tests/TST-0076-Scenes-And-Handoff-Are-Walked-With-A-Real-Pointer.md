---
type: "[[test]]"
id: TST-0076
aliases: ["TST-0076"]
title: "Scenes and handoff are walked with a real pointer and keyboard: a scene saved, the workspace changed under it, reopened and undone; a document moved to a second window, shown in a reader, sent back, and left alone when the other window does not answer"
status: ready
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: integration
kind: manual
entrypoint: "desktop/demos/glass-scenes.cjs"
command: ""
last_verified: ""
covers: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]"]
issues: []
tasks: ["[[TASK-0107-Save-Reopen-And-Undo-Scenes-In-Glass]]", "[[TASK-0109-Show-The-Destination-The-Arrival-And-The-Way-Back]]", "[[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]", "[[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]]", "[[TST-0075-A-Move-Is-Never-Half-Done]]", "[[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]", "[[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]"]
---

# Scenes and handoff are walked with a real pointer

## Purpose

One route through the real application, the route [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]] asks a person to take, driven by `webContents.sendInputEvent` so every press is hit-tested as a person's is. Each claim is recorded with what was seen, and pictures are kept. The walk deletes a note, edits another and adds a third, so it runs on a throwaway copy of the notes made inside the box, and refuses anything else.

It is not TST-0073. That check is a person's, and no verdict is recorded for it here.

It is run by hand with one command. `python3 tools/scripts/run-tests.py` and CI do not run it, because neither has Docker. That is why it has no `command:` and is `ready` until it has been run.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh glass-scenes --copy`.
3. Read the lines beginning `drive: ok` and `drive: FAIL`, and look at the pictures in `desktop/dist/walks/glass-scenes/`. The same lines are in `drive.json` there.
4. Run it once more on another real workspace: `bash tools/scripts/walk-in-a-box.sh glass-scenes --workspace <path> --name glass-scenes-<repository>`.

## Expected results, against TST-0073's steps

- **Steps 1 to 3, save, reopen, undo.** A scene is saved from Glass's bar. With one document closed and the field turned and zoomed, choosing the scene brings back the view, the search text, the collection's layout and every document at its place, size and reading position. The turn and the zoom are unchanged. The members and each document's text are requested again after the scene was chosen. "Undo: back to the desk before …" puts the previous desk back and is a different control from "Undo arrangement".
- **Steps 4 and 5, the workspace changed.** After a member is added, a note on the desk is deleted and a heading is renamed on disk, the reopened scene shows the current count, a labelled document for the deleted note with no other note's text, the second document at its fraction, and one message naming the missing note and the moved passage and not the count. The message stays until dismissed.
- **Step 6, a smaller field.** In a narrow window every document's header is inside the field, the message names the smaller field, and the store's coordinates for the desk are the saved ones.
- **Step 7, rename, delete, restore, replace, address.** Each works by pointer and by keyboard. The copied address opens the scene on its view. Saving over a name asks first, and Cancel changes nothing. After a reload the scene is still listed and the undo is gone.
- **Step 8, a move.** With a second window open on another view's desk, the strip and the chooser name the window, the display and both acts before release, and say a move leaves this desk. The source document is present until the destination has drawn the note and absent after. At the destination the document has the same size and reading position, a mark, and a message naming the source. "send back" returns it.
- **Step 9, a handoff that fails.** With the destination's acknowledgement withheld past the wait, and with the destination window closed during the wait, the source document is where it was, a message says why, and no desk holds the note twice. A display being disconnected cannot be produced in the box and is not walked here.
- **Step 10, Also show in, by keyboard.** `S` opens the chooser, the reader window shows the note, the source keeps its document, and "send back" from the reader raises the source's document.
- **Step 11, reduced motion.** With `prefers-reduced-motion: reduce` emulated, no document travels at either end and the mark and the message appear.
- **Step 12, the served page.** A page loaded with no preload bridge shows no scene control and no handoff entry, and the host answers 405 to a write. A send to the tablet is named "Also show in" and is said to be unconfirmed.
- **Step 13, the record.** The copy's files differ from the start only by the three edits the walk made itself.

## What it does not cover

- Whether a person finds the two acts clear, and how long finding a scene again takes them. That is TST-0073.
- A physical second display, its disconnection, and Safari on a tablet. Those are TST-0073's steps 8, 9 and 12 with real hardware.
- A desk from before scenes and a scene of a newer version, which are checked without a window in [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]].
- Every path through a failed handoff, which is [[TST-0075-A-Move-Is-Never-Half-Done]].
- A screen reader, and touch.

## Measurements

To be recorded by TASK-0110, each with build, workspace, note count, window size and where it was taken: the time from choosing a scene to its last document's text being in; the time from release to acknowledgement for a desk window and for a reader window; the frame cadence while a scene with several documents is restored; and the acknowledgement wait chosen, beside those times. A time taken in the box is software rendering and says nothing about the Mac.

## Evidence (fill after running)

- None. The walk has not been run on 2026-10-02, and nothing it drives is built.
