---
type: "[[test]]"
id: TST-0076
aliases: ["TST-0076"]
title: "Scenes and handoff are walked with a real pointer and keyboard: a scene saved, the workspace changed under it, reopened and undone; a document moved to a second window, shown in a reader, sent back, and left alone when the other window does not answer"
status: passing
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
last_verified: 2026-10-02
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

Two routes through the real application, close to the route [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]] asks a person to take. Each is driven by `webContents.sendInputEvent`, so every press is hit-tested as a person's is. Each claim is recorded with what was seen, and pictures are kept.

- `desktop/demos/glass-scenes.cjs` walks scenes. It deletes a note and renames a heading in another, so it runs on a throwaway copy of the notes made inside the box and refuses anything else.
- `desktop/demos/glass-handoff.cjs` walks the handoff between windows. It edits nothing and runs on the repository itself.

These walks are not TST-0073. That check is a person's, and no verdict is recorded for it here.

They are run by hand, one command each. `python3 tools/scripts/run-tests.py` and CI do not run them, because neither has Docker. That is why this note has no `command:`.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh glass-scenes --copy`.
3. `bash tools/scripts/walk-in-a-box.sh glass-handoff`.
4. For each, read the lines beginning `drive: ok` and `drive: FAIL`, and look at the pictures in `desktop/dist/walks/glass-scenes/` and `desktop/dist/walks/glass-handoff/`. The same lines are in `drive.json` there.
5. Run each once more on another real workspace: `bash tools/scripts/walk-in-a-box.sh glass-scenes --workspace <path> --name glass-scenes-<repository>`.

## What the walks check, against TST-0073's steps

- **Steps 1 to 3, save, reopen, undo.** A scene is saved from Glass's bar with two documents at different sizes, each read part-way down, and the collection narrowed by a search and shown as cards. The saved object's keys are read. From another view with another note open, choosing the scene's name changes nothing, and "open" brings back the view, the search, the collection as cards and both documents at their places, sizes and reading positions. The count on screen equals the sidecar's at that moment. `Undo: back to the desk before "Review Glass"` puts the other view's desk back.
- **Steps 4 and 5, the workspace changed.** After a note on the desk is deleted and a heading is renamed on disk, the reopened scene shows one message naming the missing note and the moved passage, a labelled document for the deleted note under its own title, and the second document at its size and as far down as before. The message stays until dismissed. The walk adds no note to the view.
- **Step 6, a smaller field.** In a window 1180 by 760 the message gives both field sizes and the store's places for the desk are the saved ones. The field is turned and zoomed first, and both are the same after the scene is reopened.
- **Step 7, replace, address, rename, delete, restore.** Saving under a name that is taken asks, and "keep it" changes nothing. The copied address carries `desk=` and the view. Rename keeps the scene and it stays the open one. Delete offers "restore", and restore puts it back as saved. A desk with no version opens on the view on screen. After a reload the scenes are listed and the undo is gone. The served page offers no scenes.
- **Step 8, a move.** With a desk window on the Issues view and a reader window open, `S` on a document lists "Move to" and "Also show in" for the desk and "Also show in" alone for the reader. After "Move to", the store shows the note on the source desk, then on both, then on the destination only. The desk window draws it as a card marked "not in this view", says where it came from and offers "send back". Sent back, the document is the size it was and is read under the same heading.
- **Step 9, a handoff that fails.** With the desk window kept busy past the wait, and with it closed before it answers, the main window says why and both desks are exactly as they were. A display being disconnected cannot be produced in the box and is not walked.
- **Step 10, Also show in.** The reader shows the note where it was being read and says the other window keeps it too, and the source keeps its document. "send back" from the reader raises the source's document, and there is one document for the note. The chooser is opened with `S`; the answers are pressed with the pointer.
- **Offers that are withheld.** A desk window on the same view, and a note kept on every view, are offered "Also show in" only.
- **The strip.** A document dragged to the edge is offered each place with its act, and released on "Move to" it moves.
- **Step 11, reduced motion.** With `prefers-reduced-motion: reduce` emulated in the main window, a document sent back to it is marked as arrived with no animation running, and the message is the same.
- **Step 12, the tablet and the served page.** With a served page following, the chooser lists "Also show in the tablet", and after it the main window says a tablet cannot confirm the note arrived. A page loaded with no preload bridge offers no "send back", and the host answers 405 to a write.
- **Nothing kept.** The store holds nothing about a handoff.

## What they do not cover

- Whether a person finds the two acts clear, and how long finding a scene again takes them. That is TST-0073.
- A physical second display, a new reader opened on an empty one, a display disconnected during a handoff, and Safari on a tablet. The box has one display, and the served page was a window on the same machine.
- A desk from before scenes in a state file and a scene of a newer version, which are checked without a window in [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]].
- Every path through a failed handoff, which is [[TST-0075-A-Move-Is-Never-Half-Done]].
- A screen reader, and touch.
- These things this note first expected of the walk, which the scripts do not do: a note added to the view under a saved scene and the count afterwards; a check that every document's header is inside the smaller field; "open", "rename", "delete", "restore" and "send back" by keyboard, and the arrow keys and Escape in the chooser; a scene reopened under reduced motion; opening the copied address; a second workspace.
- TST-0073's step 13, the comparison of files. The scenes walk runs on a copy that is not a git repository, so its record's `workspaceUnchanged: true` compares two failed `git status` calls and says nothing. The handoff walk's `workspaceUnchanged: true` is a real comparison: `git status` in the repository was the same before and after.

## Measurements

Taken on 2026-10-02 at commit `4243fc2`, in the `project-os-deck-smoke` Linux container (Electron under Xvfb, a 1440 by 900 screen, software rendering), on this repository's notes: 427 records in Deck's index, 144 notes in the Features view. The main window was 1100 by 860, the desk window and the reader 700 by 420. A time taken in the box says nothing about the Mac.

| What | Measured | The wait allowed | Margin |
| --- | --- | --- | --- |
| Release to the answer, "Move to" a desk window | 159 ms | 4000 ms | 3841 ms |
| Release to the answer, "Also show in" a reader window, which loads a page first | 904 ms | 12000 ms | 11096 ms |
| A desk window kept busy: from pressing `S` to "did not answer" | 4157 ms | 4000 ms | not a reading of the wait itself: it includes opening the chooser |

Each is one reading. The first two run from the pointer press on the chooser's answer to the status line changing, polled every 20 ms. The third is polled every 100 ms.

Not measured: the time from choosing a scene to its last document's text being in, and the frame cadence while a scene is restored. Nothing was measured on the Mac, because a window there takes the keyboard from the person working.

## Evidence

**2026-10-02, commit `4243fc2`, in the container described under Measurements, from a separate clone.**

- `bash tools/scripts/walk-in-a-box.sh glass-scenes --copy`: exit 0, 26 checks, none failed, four pictures. No part was skipped.
- `bash tools/scripts/walk-in-a-box.sh glass-handoff`: exit 0, 24 checks, none failed, seven pictures. No part was skipped: the served page counted as following, so the tablet's part ran.
- The smoke run at the same commit, `bash tools/scripts/smoke-in-a-box.sh both`: exit 0. Its loopback half, run once more with each check printed, held 389 checks with none failed, none skipped and two not applicable: the throw to an empty display, and the checks shaped for a tablet on the network. The parts that drive this feature are `throw` (11 checks) and the two desk-panel checks of `desks` (47 checks): "a feature thrown onto a desk panel on Issues is on the Issues desk and drawn there as a card marked as not in that view, and the Features desk is unchanged" and "a note held on the Features desk and moved to that panel is on the Issues desk and drawn there, and it left the Features desk only after the panel had drawn it". The `address` part ends with "git status in the workspace is unchanged after every Glass check".
- Neither walk was run on a second workspace, and neither was run on the Mac.

**An earlier report from this walk was wrong.** On its first run, at commit `f80339f`, the handoff walk reported that a feature moved from the main window to a desk window on the Issues view arrived: "the desk window draws it, says where it came from, and offers "send back"". That was not true of the application as it should be.

- A desk window is always drawn as Spread cards. Spread did not draw a note its view does not list, unless the note was kept on every view. A feature is not in the Issues view, so the desk window should not have drawn it.
- The move appeared to work because of a defect. After a write, a popped-out window read its list again from the store's view, which is the main window's. So the desk window was listing the main window's view.
- Commit `a37f8f2` fixed that defect: a popped-out window lists its own view after a write. With that fixed, the move stopped arriving. The main window said the note stays here because the desk could not show it.
- Commit `5f706a5` first made the desk window refuse at once and say why: its view does not list the note, and a desk drawn as cards shows only the notes its view lists.
- Commit `9379a0c` replaced the refusal, because it left "Move to the desk on …" an offer that could never be taken up from another view. A Spread desk now draws every note on it that the workspace has. One its view does not list is drawn from Deck's own index and marked "not in this view". The move arrives.
- Commit `4243fc2` tightened the walk's check. It had asked only whether an element carrying the note's id existed in the desk, and a hidden element of the card pool could satisfy that. It now asks for a card that is on screen, marked as not in that window's view.

At `4243fc2` the check reads "the desk window, which lists Issues and draws its desk as cards, draws the feature as a card marked "not in this view", says where it came from, and offers "send back"", and it held. The picture `03-arrived-on-the-desk-window.png` shows the card with the mark.

**Defects found while building, fixed in this feature.**

- A popped-out window for another view switched the main window to that view, and every note open in the main window left the screen ([[ISS-0091-A-Popped-Out-Window-Switches-The-Main-Windows-View]], fixed in `f80339f`). The handoff walk's first check would fail if it came back.
- A note whose document was taken down and built again opened at its top. Where it was being read is now kept for the session (`f80339f`).
- In a reader window under 860 pixels wide the whole page scrolled, and the status line with the arrival message went off the screen (`f80339f`). The reader check asserts that the page does not scroll.
- On some systems the arrow keys change a list's value at every step, and opening on that replaced the desk with each scene passed on the way. Opening became its own press (`b1bfa1d`).
- After a tick or a verb a popped-out window listed the main window's view (`a37f8f2`). The smoke run's verb checks found it.
- The move to a desk window on another view, described above (`9379a0c`).

**What the record shows that no check asserts.** These are not fixed.

- **"Send back" is offered for a window that has closed.** The desk window the note had come back from was destroyed in the "closes before it answers" part. In the next part the chooser's first answer was still "Send back to the desk on the main display". The cause was traced by reading the code and is in [[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]], Notes. Nothing was pressed, so what pressing it does was not seen.
- **The bar does not fit an 1180-pixel window.** In `03-reopened-after-changes.png` the undo button reads `Undo: back to the desk before "Review` and is cut off by the window's edge.
- **A note sent back lands at the top left of the desk, not where it stood.** In `04-sent-back.png` the returned document covers the collection. A landing puts a note 16 pixels in from the corner, stepped down by the notes already there. The walk compares its size and reading position and not its place. Nothing in REQ-0005 promises the place.
- **A scene's message can cover a document's header.** In `03-reopened-after-changes.png` and `04-deleted-with-restore.png` the message lies over the right end of a document's header.
