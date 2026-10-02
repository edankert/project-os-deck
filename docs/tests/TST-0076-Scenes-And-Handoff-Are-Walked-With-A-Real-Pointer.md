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

- `desktop/demos/glass-scenes.cjs` walks scenes. It deletes a note, renames a heading in another and adds a note, so it runs on a throwaway copy of the notes made inside the box and refuses anything else.
- `desktop/demos/glass-handoff.cjs` walks the handoff between windows. It edits nothing and runs on the repository itself.

These walks are not TST-0073. That check is a person's, and no verdict is recorded for it here.

They are run by hand, one command each. `python3 tools/scripts/run-tests.py` and CI do not run them, because neither has Docker. That is why this note has no `command:`.

## Procedure

1. `colima start` if no Docker daemon is running.
2. `bash tools/scripts/walk-in-a-box.sh glass-scenes --copy`.
3. `bash tools/scripts/walk-in-a-box.sh glass-handoff`.
4. For each, read the lines beginning `drive: ok` and `drive: FAIL`, and look at the pictures in `desktop/dist/walks/glass-scenes/` and `desktop/dist/walks/glass-handoff/`. The same lines are in `drive.json` there.
5. Run each once more on another real workspace: `bash tools/scripts/walk-in-a-box.sh glass-scenes --workspace <path> --name glass-scenes-<repository>`, and the same for `glass-handoff`. A workspace given with `--workspace` is always copied, so the box never writes to it.

## What the walks check, against TST-0073's steps

- **Steps 1 to 3, save, reopen, undo.** A scene is saved from Glass's bar with two documents at different sizes, each read part-way down, and the collection narrowed by a search and shown as cards. The saved object's keys are read. From another view with another note open, choosing the scene's name changes nothing, and "open" brings back the view, the search, the collection as cards and both documents at their places, sizes and reading positions. The count on screen equals the sidecar's at that moment. `Undo: back to the desk before "Review Glass"` puts the other view's desk back.
- **Steps 4 and 5, the workspace changed.** After a note on the desk is deleted and a heading is renamed on disk, the reopened scene shows one message naming the missing note and the moved passage, a labelled document for the deleted note under its own title, and the second document at its size and as far down as before. The message stays until dismissed. Later the walk writes a new note into the copy while a scene is put away, and finds it in the collection on reopening with the count one more.
- **Step 6, a smaller field.** In a window 1180 by 760 the message gives both field sizes and the store's places for the desk are the saved ones. The field is turned and zoomed first, and both are the same after the scene is reopened. In a window 900 by 640 every document on screen has its header inside the field and under the pointer, and every control of the bar above the field can be pressed where it is drawn.
- **Step 7, replace, address, rename, delete, restore.** Saving under a name that is taken asks, and "keep it" changes nothing. The copied address carries `desk=` and the view, and opened from another view it opens the scene on its own view. Rename keeps the scene and it stays the open one. Delete offers "restore", and restore puts it back as saved. A desk with no version opens on the view on screen. An entry of version 99, put in the store by the walk, is listed with its version, cannot be chosen, is refused by address and is kept as it was. After a reload the scenes are listed and the undo is gone. The served page offers no scenes.
- **What belongs to the session.** After "save scene" the list shows the scene just saved. The focus document, the open list and the relationship picked out are the same after that scene is opened on its own view. With an arrangement applied on the reopened scene, both undo controls are on screen at once, whole, each named for what it puts back.
- **The scene controls by keyboard.** Tab goes from the list through "open", "save scene", "rename", "delete" and the undo. Enter on "save scene" asks for a name, and Escape closes the question and nothing else.
- **A scene under reduced motion.** With `prefers-reduced-motion: reduce` emulated, a reopened scene's documents are at their places the first time they are seen, with nothing animating.
- **A read that fails.** With one document's text refused, the document says so under its title with a "retry". Retried more than six seconds later, it is read under the heading the scene kept.
- **No file written.** The walk takes a SHA-1 of every file of the copy before and after each group of scene actions. Saving, opening and going back change none. Renaming, deleting and restoring change none. Across everything after that, the only file that differs is the note the walk added itself.
- **Step 8, a move.** With a desk window on the Issues view and a reader window open, `S` on a document lists "Move to" and "Also show in" for the desk and "Also show in" alone for the reader. After "Move to", the store shows the note on the source desk, then on both, then on the destination only. The desk window draws it as a card marked "not in this view", and a line there says where it came from and offers "send back" and "dismiss". Sent back, the document is the size it was and is read under the same heading. It is marked, and four seconds on the mark and the line are still there. A press in the document takes both away.
- **While a move waits.** With the desk window kept busy, the document is marked as being sent, the window says this desk keeps it until that window shows it, and the wheel still scrolls it. The mark is gone when the answer is known.
- **Step 9, a handoff that fails.** With the desk window kept busy past the wait, and with it closed before it answers, the main window says why and both desks are exactly as they were. After the desk window has closed, `S` offers no "Send back" to it. The walk also sends the main process the event Electron sends when a display is removed, naming the display the desk window is on. The main window then says the display was disconnected, and both desks are as they were. No display was unplugged: the box has one screen, and the check says so in its own words.
- **Step 10, Also show in.** The reader shows the note where it was being read and says the other window keeps it too, and the source keeps its document. "send back" from the reader raises the source's document, and there is one document for the note. The chooser is opened with `S`. In it the arrow keys move between the answers, the answer the keyboard is on says what it does, and Escape closes it with nothing sent. The answers that send a note are pressed with the pointer.
- **Offers that are withheld.** A desk window on the same view, and a note kept on every view, are offered "Also show in" only.
- **The strip.** A document dragged to the edge is offered each place with its act. Each entry says under its name what releasing there does to this desk: "it leaves this desk" for a move, "this desk keeps it" for a show. Released on "Move to", the document moves.
- **Step 11, reduced motion.** With `prefers-reduced-motion: reduce` emulated in the main window, a document sent back to it is marked as arrived with no animation running, and the line is the same.
- **The source window closes.** With the arrival line on screen, the window the note came from is closed. The line then says that window has closed and the note stays here, and "send back" is gone from the line and from `S`. "dismiss" takes the line away and the mark with it.
- **Step 12, the tablet and the served page.** With a served page following, the chooser lists "Also show in the tablet", and after it the main window says a tablet cannot confirm the note arrived. On a page loaded with no preload bridge, `S` on a document says a tablet follows the Mac and sends nothing back, a document dragged to the edge is shown no strip, there is no "send back", and the host answers 405 to a write.
- **Nothing kept.** The store holds nothing about a handoff.

## What they do not cover

- Whether a person finds the two acts clear, and how long finding a scene again takes them. That is TST-0073.
- A physical second display, a new reader opened on an empty one, a display really unplugged during a handoff, and Safari on a tablet. The box has one display, and the served page was a window on the same machine.
- A scene really saved by a newer Deck. None exists, so the walk put the entry in the store itself. A state file written before scenes is checked without a window in [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]].
- Every path through a failed handoff, which is [[TST-0075-A-Move-Is-Never-Half-Done]]. No walk fails a handoff to a reader.
- A screen reader, and touch.
- The route by keyboard alone. "open", every answer that sends a note and every "send back" are pointer presses. No check presses "rename", "delete", the undo, "restore" or "dismiss" with a key.
- Saving under the open scene's own name. The walk saves over a taken name with no scene open.
- A failed read retried in a session that has not read the note before. The scene's own reading position waits five seconds. The later retry in the walk lands where the window last read the note, which is the same place there.
- A filter in a window: the walk sets none.
- The frame cadence while a scene is restored, and anything on the Mac.
- TST-0073's step 13 as written, the comparison of `git status`. The scenes walk runs on a copy that is not a git repository, compares the files by content itself, and its record says `workspaceUnchanged: null`, which means git could not be asked. The handoff walk's `workspaceUnchanged: true` is a real comparison of `git status` before and after.

## Measurements

Taken on 2026-10-02 at commit `e86b2e4`, in the `project-os-deck-smoke` Linux container (Electron under Xvfb, a 1440 by 900 screen, software rendering). A time taken in the box says nothing about the Mac. Each is one reading.

| What | This repository | A copy of `your-trainer` | The wait allowed |
| --- | --- | --- | --- |
| Notes in the Features view | 144 | 1393 | |
| From pressing "open" to both of a scene's documents being read where they were | 128 ms | 122 ms | |
| Release to the answer, "Move to" a desk window | 155 ms | 184 ms | 4000 ms |
| Release to the answer, "Also show in" a reader window, which loads a page first | 809 ms | 1918 ms | 12000 ms |
| A desk window kept busy: from pressing `S` to "did not answer" | 4193 ms | 4171 ms | 4000 ms |

The margin under the wait on this repository is 3845 ms for a desk window and 11191 ms for a reader. On the copy of `your-trainer` it is 3816 ms and 10082 ms.

In the scenes walk the window was 1440 pixels wide. In the handoff walk the main window was opened at 1100 by 860, and the desk window and the reader at 700 by 420.

The reopening time runs from the pointer press on "open" to both documents having their text and the second being under the heading it was saved at, polled every 25 ms. The two answer times run from the pointer press on the chooser's answer to the status line changing, polled every 20 ms. The last row is polled every 100 ms and includes opening the chooser, so it is not a reading of the wait itself.

Not measured: the frame cadence while a scene is restored. Nothing was measured on the Mac, because a window there takes the keyboard from the person working.

## Evidence

**2026-10-02, commit `e86b2e4`, in the container described under Measurements, from a separate clone.**

- `bash tools/scripts/walk-in-a-box.sh glass-scenes --copy`: exit 0, 38 checks, none failed, seven pictures. No part was skipped. Its record says `workspaceUnchanged: null`, because the copy is not a git repository; the walk compares the files itself.
- The same walk on a copy of `your-trainer` (`--workspace <path> --name glass-scenes-your-trainer`): exit 0, 38 checks, none failed.
- `bash tools/scripts/walk-in-a-box.sh glass-handoff`: exit 0, 33 checks, none failed, seven pictures. No part was skipped: the served page counted as following, so the tablet's part ran. Its record says `workspaceUnchanged: true`.
- The same walk on a copy of `your-trainer` (`--name glass-handoff-your-trainer`): exit 0, 33 checks, none failed. Its record says `workspaceUnchanged: null`, because a copy is not a git repository.
- The smoke run at the same commit, `bash tools/scripts/smoke-in-a-box.sh both`: exit 0 for the loopback half and the network half, after 1148 seconds. Its loopback half, run once more with each check printed, held 389 checks with none failed, none skipped and two not applicable: the throw to an empty display, and the checks shaped for a tablet on the network. The parts that drive this feature are `throw` (11 checks) and the two desk-panel checks of `desks` (47 checks): "a feature thrown onto a desk panel on Issues is on the Issues desk and drawn there as a card marked as not in that view, and the Features desk is unchanged" and "a note held on the Features desk and moved to that panel is on the Issues desk and drawn there, and it left the Features desk only after the panel had drawn it". The `address` part ends with "git status in the workspace is unchanged after every Glass check".
- Neither walk was run on the Mac.

**Two earlier passes the same day failed in the scenes walk.** At `aa848b0` one check failed, on both workspaces. At `3ff281c` the walk held on this repository and stopped on the copy of `your-trainer`. Both came from one defect, which is in the list of defects below, and the pass above was made after it was fixed.

**An earlier report from this walk was wrong.** On its first run, at commit `f80339f`, the handoff walk reported that a feature moved from the main window to a desk window on the Issues view arrived: "the desk window draws it, says where it came from, and offers "send back"". That was not true of the application as it should be.

- A desk window is always drawn as Spread cards. Spread did not draw a note its view does not list, unless the note was kept on every view. A feature is not in the Issues view, so the desk window should not have drawn it.
- The move appeared to work because of a defect. After a write, a popped-out window read its list again from the store's view, which is the main window's. So the desk window was listing the main window's view.
- Commit `a37f8f2` fixed that defect: a popped-out window lists its own view after a write. With that fixed, the move stopped arriving. The main window said the note stays here because the desk could not show it.
- Commit `5f706a5` first made the desk window refuse at once and say why: its view does not list the note, and a desk drawn as cards shows only the notes its view lists.
- Commit `9379a0c` replaced the refusal, because it left "Move to the desk on …" an offer that could never be taken up from another view. A Spread desk now draws every note on it that the workspace has. One its view does not list is drawn from Deck's own index and marked "not in this view". The move arrives.
- Commit `4243fc2` tightened the walk's check. It had asked only whether an element carrying the note's id existed in the desk, and a hidden element of the card pool could satisfy that. It now asks for a card that is on screen, marked as not in that window's view.

At `e86b2e4` the check reads "the desk window, which lists Issues and draws its desk as cards, draws the feature as a card marked "not in this view", says where it came from, and offers "send back"", and it held. The picture `03-arrived-on-the-desk-window.png` shows the card with the mark, and under it the line "FEAT-0002 arrived from the Deck on the main display." with "send back" and "dismiss".

**Defects found by these walks or while building, fixed in this feature.**

- A popped-out window for another view switched the main window to that view, and every note open in the main window left the screen ([[ISS-0091-A-Popped-Out-Window-Switches-The-Main-Windows-View]], fixed in `f80339f`). The handoff walk's first check would fail if it came back.
- A note whose document was taken down and built again opened at its top. Where it was being read is now kept for the session (`f80339f`).
- In a reader window under 860 pixels wide the whole page scrolled, and the status line with the arrival message went off the screen (`f80339f`). The reader check asserts that the page does not scroll and that the arrival line is on screen.
- On some systems the arrow keys change a list's value at every step, and opening on that replaced the desk with each scene passed on the way. Opening became its own press (`b1bfa1d`).
- After a tick or a verb a popped-out window listed the main window's view (`a37f8f2`). The smoke run's verb checks found it.
- The move to a desk window on another view, described above (`9379a0c`).
- "Send back" was offered for a window that had closed. The first pass's record showed the chooser still listing "Send back to the desk on the main display" after that desk window was destroyed. Fixed in `9d94fa0`. The checks "the window the note once came back from has closed, and S offers no "Send back" to it" and "when the window a note arrived from closes, the line says it has closed and that the note stays here, and "send back" is offered neither in the line nor by S" would fail if it came back.
- An empty display's entry read "Also show in the a new reader on …". Fixed in `9d94fa0`, and held by the test "an empty display is offered "Also show in" only, and its entry reads as a sentence" in [[TST-0075-A-Move-Is-Never-Half-Done]]. No walk shows the entry: the box has one display.
- The bar above the field did not fit an 1180-pixel window, and the undo button was cut off by the window's edge. The bar is two rows in a window under 1500 pixels wide (`9d94fa0`). The check that finds both undo controls on screen, whole, would fail if either ran past the bar.
- After "save scene" the list kept the name chosen in it before, so "open", "rename" and "delete" were about another scene than the one saved. Found by the extended scenes walk and fixed in `40a74e3`. The check that begins "after saving, the list shows the scene just saved" would fail if it came back.
- A walk's record said `workspaceUnchanged: true` when git could not be asked. It now says `null` (`40a74e3`).
- The count of owed notes moved up when the bar gained its second row. The smoke run found it at `f7bdd46`, and `aa848b0` fixed it.
- **In a narrow window a row of the bar above the field was cut off, and a press on a control there went to what stood behind it.** The scenes walk found it twice. At `aa848b0`, in a window 900 pixels wide, the bar's third row was below its lower edge. The walk pressed the middle of "close all" and the press landed on the collection's header, which raised the collection over both documents. The check that every header can be reached failed, on this repository and on a copy of `your-trainer`. Commit `3ff281c` gave the bar a third row under 1200 pixels. It also made a walk's press stop, with the name of what is drawn at the point, when that is not the control meant. At `3ff281c` the walk held on this repository and stopped on the copy of `your-trainer` with "#sweep-desk cannot be pressed at its middle: #collection-head is drawn there": that workspace's bar held a longer line and needed a fourth row. Commit `b085ad7` removed the cause. The bar wrapped wherever a row was full, so the number of rows depended on what it held, while its height is fixed. Each group of controls now has a row fixed by the window's width. The small-window check now also requires that every control of the bar can be pressed where it is drawn, and would fail if a row were cut off again.

**What the pictures show that no check asserts.** All fourteen pictures of the two walks on this repository were looked at for this close-out. Nothing has been done about any of the following.

- **In the keyboard chooser the sentence about a move is cut short.** In `02-the-chooser.png`, a window 1100 pixels wide, the text beside the answers reads "Move FEAT-0002 to the desk …". The words "it leaves this desk once that window shows it" are in the element and not on screen. The sentence takes the room left beside the answers, so that no answer moves when it appears. The strip's entries show their second line whole (`07-the-strip-names-the-act.png`).
- **A scene's message lies over documents.** In `03-reopened-after-changes.png` it covers the right half of both documents' headers, in `04-deleted-with-restore.png` the right end of one, and in `09-a-scene-in-a-smaller-window.png` the right half of the front one. The check in the smaller window looks at one point near the left end of each header.
- **A note sent back lands at the top left of the desk, not where it stood.** In `04-sent-back.png` the returned document covers the collection. A landing puts a note 16 pixels in from the corner, stepped down by the notes already there. The walk compares its size and reading position and not its place. Nothing in REQ-0005 promises the place.
- **In `10-a-scene-this-deck-cannot-read.png` the list is on the unreadable entry, with "rename" and "delete" beside it.** The walk put the list there by script. The entry is disabled, so a person cannot choose it. No check says what "rename" or "delete" would do to it.
