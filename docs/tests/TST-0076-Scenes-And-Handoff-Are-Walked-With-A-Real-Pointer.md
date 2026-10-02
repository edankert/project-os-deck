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

This list is the walks as they ran in the pass at `18f5405`. The section after it says which checks were added or made stricter since the pass before the review, and what each saw.

- **Steps 1 to 3, save, reopen, undo.** A scene is saved from Glass's bar with two documents at different sizes, each read part-way down, and the collection narrowed by a search and shown as cards. The saved object's keys are read. From another view with another note open, choosing the scene's name changes nothing, and "open" brings back the view, the search, the collection as cards and both documents at their places, sizes and reading positions. The count on screen equals the sidecar's at that moment. `Undo: back to the desk before "Review Glass"` puts the other view's desk back. The same press puts back what the scene had replaced on its own view: no note open there, and its list a table again.
- **Steps 4 and 5, the workspace changed.** After a note on the desk is deleted and a heading is renamed on disk, the reopened scene shows one message naming the missing note and the moved passage, a labelled document for the deleted note under its own title, and the second document at its size and as far down as before. The message stays until dismissed, and "dismiss" is reached with Tab and pressed with Enter. Later the walk writes a new note into the copy while a scene is put away, and finds it in the collection on reopening with the count one more.
- **Step 6, a smaller field.** In a window 1180 by 760 the message gives both field sizes and the store's places for the desk are the saved ones. The field is turned and zoomed first, and both are the same after the scene is reopened. In a window 900 by 640 every document on screen has its header inside the field, with nothing but another document over either end of it while the scene's message is shown, and every control of the bar above the field can be pressed where it is drawn.
- **Step 7, replace, address, rename, delete, restore.** Saving under a name that is taken asks, and "keep it" changes nothing. With a scene open, "save scene" offers that scene's own name and asks before replacing it. The copied address carries `desk=` and the view, and opened from another view it opens the scene on its own view. Rename keeps the scene and it stays the open one. Delete offers "restore", which is reached with Tab and pressed with Enter, and restore puts the scene back as saved. A desk with no version opens on the view on screen. An entry of version 99, put in the store by the walk, is listed with its version and said to be saved by a different Deck. It can be chosen, "delete" is offered for it and neither "open" nor "rename", it is refused by address and it is kept as it was. On the cards surface "save desk" under that entry's name is refused with the reason, and under a scene's name it asks first. After a reload the scenes are listed and the undo is gone. The served page offers no scenes, and sent an address that names a scene it opens none.
- **A scene with no note open.** Saved and reopened, it says in one line that it reopened.
- **What belongs to the session.** After "save scene" the list shows the scene just saved. The focus document, the open list and the relationship picked out are the same after that scene is opened on its own view. With an arrangement applied on the reopened scene, both undo controls are on screen at once, whole, each named for what it puts back.
- **The scene controls by keyboard.** Tab goes from the list through "open", "save scene", "rename", "delete" and the undo, and each shows where the keyboard is. Enter on "save scene" asks for a name, and Escape closes the question and nothing else.
- **A scene under reduced motion.** With `prefers-reduced-motion: reduce` emulated, a reopened scene's documents are at their places the first time they are seen, with nothing animating.
- **A read that fails.** With one document's text refused, the document says so under its title with a "retry". Retried more than six seconds later, it is read under the heading the scene kept, in a window that had last read it at its top.
- **No file written.** The walk takes a SHA-1 of every file of the copy before and after each group of scene actions. Saving, opening and going back change none. Renaming, deleting and restoring change none. Across everything after that, the only file that differs is the note the walk added itself.
- **Step 8, a move.** With a desk window on the Issues view and a reader window open, `S` on a document lists "Move to" and "Also show in" for the desk and "Also show in" alone for the reader. After "Move to", the store shows the note on the source desk, then on both, then on the destination only. The desk window draws it as a card marked "not in this view", and a line there says where it came from and offers "send back" and "dismiss". A first "send back" is made while the main window is kept busy: it is not answered, the desk window says so and still offers "send back". Sent back at the next press, the document is the size it was and is read under the same heading. It is marked, and four seconds on the mark and the line are still there. A press in the document takes both away.
- **While a move waits.** With the desk window kept busy, the document is marked as being sent, the window says this desk keeps it until that window shows it, and the wheel still scrolls it. The mark is gone when the answer is known.
- **Step 9, a handoff that fails.** With the desk window kept busy past the wait, and with it closed before it answers, the main window says why and both desks are exactly as they were. After the desk window has closed, `S` offers no "Send back" to it. The walk also sends the main process the event Electron sends when a display is removed, naming the display the desk window is on. The main window then says the display was disconnected, and both desks are as they were. No display was unplugged: the box has one screen, and the check says so in its own words.
- **Step 10, Also show in.** The reader shows the note where it was being read and says the other window keeps it too, and the source keeps its document. "send back" from the reader raises the source's document, and there is one document for the note. The chooser is opened with `S`. In it the arrow keys move between the answers, the answer the keyboard is on says what it does in a sentence drawn whole, and Escape closes it with nothing sent. "Also show in the reader on …" is asked and answered with keys alone: `S`, the arrow keys and Enter. "Move to" is pressed with the pointer.
- **Offers that are withheld.** A desk window on the same view, and a note kept on every view, are offered "Also show in" only.
- **The strip.** A document dragged to the edge is offered each place with its act. Each entry says under its name what releasing there does to this desk: "it leaves this desk" for a move, "this desk keeps it" for a show. Released on "Move to", the document moves.
- **Step 11, reduced motion.** With `prefers-reduced-motion: reduce` emulated in the main window, a document sent back to it is marked as arrived with no animation running, and the line is the same.
- **The source window closes.** With the arrival line on screen, the window the note came from is closed. The line then says that window has closed and the note stays here, and "send back" is gone from the line and from `S`. "dismiss" takes the line away and the mark with it.
- **Step 12, the tablet and the served page.** With a served page following, the chooser lists "Also show in the tablet", and after it the main window says a tablet cannot confirm the note arrived. On a page loaded with no preload bridge, `S` on a document says a tablet follows the Mac and sends nothing back, a document dragged to the edge is shown no strip, there is no "send back", and the host answers 405 to a write.
- **Nothing kept.** The store holds nothing about a handoff.

## What the walks gained since the pass before the review, and what the new checks saw

The pass before the independent review, at `e86b2e4`, held 38 checks in the scenes walk and 33 in the handoff walk. The pass at `18f5405` holds 43 and 34. Five checks were added to the scenes walk, one step to the handoff walk, one check was rewritten and seven were made stricter. What each saw is from the record on this repository; the record on the copy of `your-trainer` shows the same unless a line says otherwise.

**Added in commit `972985f`, for what the second close-out of these notes found unchecked.**

- **Saving under the open scene's own name.** With "Review Glass" open, "save scene" offered "Review Glass". Entered, it asked "replace it", "keep it" or "cancel", and "keep it" left the stored scene as it was.

**Made stricter in commits `972985f` and `e3f1460`, for the same close-out.**

- **A visible focus on each scene button.** The Tab check requires an outline or a shadow on each of "open", "save scene", "rename", "delete" and the undo. Before, it recorded this for the last one only and did not assert it. It held: `focusVisible: true` for all five.
- **"dismiss" and "restore" by keyboard.** Both were pointer presses. "dismiss" is now reached with Tab, 11 presses after the list of scenes, by way of the scene buttons, the three arrangement buttons, "close all" and the field. "restore" is reached in 8 presses. On each the keyboard's place was drawn, and Enter pressed it.
- **Both ends of a document's header while the scene's message is shown.** The check in the smaller window also looks at the close button at the right end of each header. In a field of 772 by 364 both documents had both ends clear.
- **A retried document whose place can only come from the scene.** The walk scrolls the document to its top before closing it. After a retry more than six seconds later it was read 41 pixels past "Scope", where the scene kept 40. On the copy of `your-trainer` the heading was "Position", 38 pixels past where the scene kept 39.
- **The chooser's sentence drawn whole.** The check requires the sentence for each answer to fit its box, to be inside the window and to be what is drawn at its middle. It read "FEAT-0002 goes back where it came from and leaves this desk once that window shows it.", "Move FEAT-0002 to the desk on the main display: it leaves this desk once that window shows it" and "Also show FEAT-0002 in the desk on the main display: this desk keeps it", each whole.
- **One handoff made with keys alone.** "Also show in the reader on …" was asked with `S` on the document's header and answered with three presses of an arrow key and Enter. The main window said "FEAT-0002 is also shown in the reader on the main display; this desk keeps it".

**Added or rewritten by the fixes for the independent review (`093c198`, `ff25f28`, `22678b9`, `2646cf5`, `39915fe`).**

- **The other view's desk and list are put back by the undo.** The scene was opened from the Issues view and replaced the desk and the list of the Features view. Before the open the Features view held no note and its list was a table at 12, 12, 340 wide and 693 high. After `Undo: back to the desk before "Review Glass"` it held exactly that again. This is the reviewers' refuted claim 4c, in a window.
- **"save desk" on the cards surface.** Under the name of the entry this Deck cannot read, the window said '"From a newer Deck" was saved by a different Deck (version 99) and is not replaced; choose another name', and the entry was as it was. Under a scene's name it asked "replace it", "keep it" or "cancel", and "keep it" left the scene as it was saved. This is the reviewers' refuted claims 5c and 5e, in a window.
- **What is offered for an entry this Deck cannot read (rewritten).** Its text in the list read "From a newer Deck (cannot be opened: saved by a different Deck (version 99); this one reads version 2, so it is kept and not opened)". It was not disabled and was the one chosen. "delete" was offered, and "open" and "rename" were not. By address the window said '"From a newer Deck" was saved by a different Deck (version 99) and is not opened; it is kept as it is', and the stored entry still held the field this Deck does not know. Before the review the check required that the entry could not be chosen.
- **A scene saved with no note open.** Reopened, the window said 'scene "Nothing open" reopened: everything it holds is where it was, read as it is now', no note was on the desk and no report was raised. This is the reviewer's finding that a scene with no document to put back got no message at all.
- **The served page sent an address that names a scene.** The page, loaded with no preload bridge, said 'that address names the saved desk "Kept as it is"; this page shows the desk the Mac has and opens none'. No report was raised and the scene controls stayed hidden. No node suite loads the renderer, so this check is the only thing that holds the rule.
- **A "send back" that is not answered, and then works.** A new step of the handoff walk, between the arrival on the desk window and the send back. The main window was kept busy for longer than the wait. The desk window said "FEAT-0002 stays here: the Deck on the main display did not answer. Nothing was moved." The note was on the Issues desk and not on the Features desk, and "send back" was still offered. The next press, the walk's existing send back, moved it back. This is the reviewers' refuted claim 8c, and it is the only check of what the main process does with that rule.

**What the review's fixes changed that no walk check covers.** A second send of a note that is already on its way. A destination window that answers after the source has stopped waiting. What "save scene" and "rename" say of a name the address refuses. A note arriving while a scene is still waiting for its documents. Choosing an unreadable entry in the cards surface's list of saved desks. The first, the third's rule in the store and the fourth have node tests ([[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]], [[TST-0075-A-Move-Is-Never-Half-Done]]). The others have none.

## What they do not cover

- Whether a person finds the two acts clear, and how long finding a scene again takes them. That is TST-0073.
- A physical second display, a new reader opened on an empty one, a display really unplugged during a handoff, and Safari on a tablet. The box has one display, and the served page was a window on the same machine.
- A scene really saved by a newer Deck. None exists, so the walk put the entry in the store itself. A state file written before scenes is checked without a window in [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]].
- Every path through a failed handoff, which is [[TST-0075-A-Move-Is-Never-Half-Done]]. No walk fails a handoff to a reader.
- A screen reader, and touch. The checks of a visible focus read the style of the control the keyboard is on; nobody looked at it.
- The route by keyboard alone. "open", "Move to" and every "send back" are pointer presses, and no check presses "rename", "delete" or the undo with a key.
- The cards surface's list of saved desks opening a scene. It opens one straight through the store, with no undo, no reading positions and no message, and no walk does it. FEAT-0023's Review section records this as left.
- A filter in a window: the walk sets none.
- The frame cadence while a scene is restored, and anything on the Mac.
- TST-0073's step 13 as written, the comparison of `git status`. The scenes walk runs on a copy that is not a git repository, compares the files by content itself, and its record says `workspaceUnchanged: null`, which means git could not be asked. The handoff walk's `workspaceUnchanged: true` is a real comparison of `git status` before and after.

## Measurements

Taken on 2026-10-02 at commit `18f5405`, in the `project-os-deck-smoke` Linux container (Electron under Xvfb, a 1440 by 900 screen, software rendering). A time taken in the box says nothing about the Mac. Each is one reading.

| What | This repository | A copy of `your-trainer` | The wait allowed |
| --- | --- | --- | --- |
| Notes in the Features view | 144 | 1393 | |
| From pressing "open" to both of a scene's documents being read where they were | 132 ms | 124 ms | |
| Release to the answer, "Move to" a desk window | 155 ms | 190 ms | 4000 ms |
| Release to the answer, "Also show in" a reader window, which loads a page first | 1178 ms | 2159 ms | 12000 ms |
| A desk window kept busy: from pressing `S` to "did not answer" | 4197 ms | 4179 ms | 4000 ms |

The margin under the wait on this repository is 3845 ms for a desk window and 10822 ms for a reader. On the copy of `your-trainer` it is 3810 ms and 9841 ms.

The reader's time is not steady from one pass to the next. In the pass at `e86b2e4` it was 809 ms on this repository and 1918 ms on the copy of `your-trainer`. In this pass the answer is given with the arrow keys and Enter where it was a pointer press, and the time starts before those key presses, so the two passes' readings are not of the same thing.

In the scenes walk the window was 1440 pixels wide. In the handoff walk the main window was opened at 1100 by 860, and the desk window and the reader at 700 by 420.

The reopening time runs from the pointer press on "open" to both documents having their text and the second being under the heading it was saved at, polled every 25 ms. The desk window's answer time runs from the pointer press on the chooser's answer to the status line changing, polled every 20 ms. The reader's runs from just before the arrow keys are pressed, three presses with 120 ms after each, to the status line changing, so about 360 ms of it is the walk's own waiting. The last row is polled every 100 ms and includes opening the chooser, so it is not a reading of the wait itself.

Not measured: the frame cadence while a scene is restored. Nothing was measured on the Mac, because a window there takes the keyboard from the person working.

## Evidence

**2026-10-02, commit `18f5405`, in the container described under Measurements, from a separate clone.** Every run in the pass held.

- `bash tools/scripts/walk-in-a-box.sh glass-scenes --copy`: exit 0, 43 checks, none failed, seven pictures. No part was skipped. Its record says `workspaceUnchanged: null`, because the copy is not a git repository; the walk compares the files itself, and the only one of the copy's 441 files that differed at the end was the note the walk added.
- The same walk on a copy of `your-trainer` (`--workspace <path> --name glass-scenes-your-trainer`): exit 0, 43 checks, none failed, no part skipped. The copy held 3897 files.
- `bash tools/scripts/walk-in-a-box.sh glass-handoff`: exit 0, 34 checks, none failed, seven pictures. No part was skipped: the served page counted as following, so the tablet's part ran. Its record says `workspaceUnchanged: true`.
- The same walk on a copy of `your-trainer` (`--name glass-handoff-your-trainer`): exit 0, 34 checks, none failed, no part skipped. Its record says `workspaceUnchanged: null`, because a copy is not a git repository.
- The smoke run at the same commit, `bash tools/scripts/smoke-in-a-box.sh both`: exit 0 for the loopback half and the network half, after 1145 seconds. Its loopback half, run once more with each check printed, held 389 checks with none failed, none skipped and two not applicable: the throw to an empty display, and the checks shaped for a tablet on the network. The parts that drive this feature are `throw` (11 checks) and the two desk-panel checks of `desks` (47 checks): "a feature thrown onto a desk panel on Issues is on the Issues desk and drawn there as a card marked as not in that view, and the Features desk is unchanged" and "a note held on the Features desk and moved to that panel is on the Issues desk and drawn there, and it left the Features desk only after the panel had drawn it". The `address` part ends with "git status in the workspace is unchanged after every Glass check".
- Neither walk was run on the Mac.

**The pass before the review, at `e86b2e4`, held too:** 38 checks in the scenes walk and 33 in the handoff walk, on both workspaces. The second close-out of these notes cited it. The independent review came after it, and its two reviewers ran node suites only, in both rounds, so no reviewer has checked this test.

**Two earlier passes the same day failed in the scenes walk.** At `aa848b0` one check failed, on both workspaces. At `3ff281c` the walk held on this repository and stopped on the copy of `your-trainer`. Both came from one defect, which is in the list of defects below, and the passes at `e86b2e4` and `18f5405` were made after it was fixed.

**An earlier report from this walk was wrong.** On its first run, at commit `f80339f`, the handoff walk reported that a feature moved from the main window to a desk window on the Issues view arrived: "the desk window draws it, says where it came from, and offers "send back"". That was not true of the application as it should be.

- A desk window is always drawn as Spread cards. Spread did not draw a note its view does not list, unless the note was kept on every view. A feature is not in the Issues view, so the desk window should not have drawn it.
- The move appeared to work because of a defect. After a write, a popped-out window read its list again from the store's view, which is the main window's. So the desk window was listing the main window's view.
- Commit `a37f8f2` fixed that defect: a popped-out window lists its own view after a write. With that fixed, the move stopped arriving. The main window said the note stays here because the desk could not show it.
- Commit `5f706a5` first made the desk window refuse at once and say why: its view does not list the note, and a desk drawn as cards shows only the notes its view lists.
- Commit `9379a0c` replaced the refusal, because it left "Move to the desk on …" an offer that could never be taken up from another view. A Spread desk now draws every note on it that the workspace has. One its view does not list is drawn from Deck's own index and marked "not in this view". The move arrives.
- Commit `4243fc2` tightened the walk's check. It had asked only whether an element carrying the note's id existed in the desk, and a hidden element of the card pool could satisfy that. It now asks for a card that is on screen, marked as not in that window's view.

At `18f5405` the check reads "the desk window, which lists Issues and draws its desk as cards, draws the feature as a card marked "not in this view", says where it came from, and offers "send back"", and it held. The picture `03-arrived-on-the-desk-window.png` shows the card with the mark, and under it the line "FEAT-0002 arrived from the Deck on the main display." with "send back" and "dismiss".

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

**What the pictures show that no check asserts.** All fourteen pictures of the two walks on this repository were looked at for this close-out, from the pass at `18f5405`. The second close-out listed four things from the pictures of the pass before; three were changed in the build since, and the first three lines say what the pictures show now.

- **The chooser's sentence is whole.** In `02-the-chooser.png`, a window 1100 pixels wide, a box above the status line reads "Move FEAT-0002 to the desk on the main display: it leaves this desk once that window shows it". Before `972985f` it stood beside the answers and was cut after "Move FEAT-0002 to the desk …". A check now requires it.
- **A scene's message stands at the field's lower left.** In `03-reopened-after-changes.png` and `04-deleted-with-restore.png` it lies over the lower part of the collection and both documents' headers are clear. In `09-a-scene-in-a-smaller-window.png`, a window 900 pixels wide, it lies over rows of the collection and over several lines of the front document's text. Before `972985f` it lay over the right half of a header. A check now requires both ends of each header to be clear. No check says what the message may lie over, and nobody has judged whether its new place is the right one.
- **The entry this Deck cannot read can be chosen.** In `10-a-scene-this-deck-cannot-read.png` the list is on "From a newer Deck (cannot …", with "save scene" and "delete" beside it and no "open" or "rename". Before `ff25f28` the entry was disabled and "rename" stood beside it. A check now requires what is offered.
- **A note sent back lands at the top left of the desk, not where it stood.** In `04-sent-back.png` the returned document covers the collection. A landing puts a note 16 pixels in from the corner, stepped down by the notes already there. The walk compares its size and reading position and not its place. Nothing in REQ-0005 promises the place. This is as the second close-out found it.
- **A line of Glass's own lies over the middle of a document's header in two pictures.** In `08-both-undos.png` the line "Read FEAT-0003: applied. Undo arrangement puts it back." stands on the front document's title, and in `09-a-scene-in-a-smaller-window.png` the line "the desk is swept; every note is back in its slot" does. Each is what Glass says after the press the walk had just made, and neither belongs to scenes. The checks look at the two ends of a header and not at its middle. How long such a line stays was not looked at.
- **In `04-sent-back.png` the main window's status line still reads the sentence from the move out.** Above it the arrival line says "FEAT-0002 arrived from the desk on the main display." Under it the status line reads "FEAT-0002 moved to the desk on the main display, which is showing it", which was true before the note came back. The status line keeps the last thing said there, and an arrival is said on the line above it.

**Defects the independent review found that a walk check now holds.** Two reviewers read the feature at `5e66f48` on 2026-10-02 and ran node suites only, so they marked this test *not checked*. What they found by probing the store and reading the code is listed in FEAT-0023's Review section. The store's and the handoff rule's parts are held by node tests, listed in TST-0074 and TST-0075. These are the ones a walk check was written for, each fixed in the commit named. Each check held in the pass at `18f5405`, on this repository and on the copy of `your-trainer`; the section on what the walks gained says what each saw.

- "Undo: back to the desk before" left the scene's own view as the scene had put it, when the scene was opened from another view (`093c198`). Held by the check of the other view's desk and list.
- "save desk" on the cards surface replaced a scene without asking, an unreadable one included, and the controls offered "rename" for an unreadable entry (`ff25f28`). Held by the "save desk" check and the rewritten check of an unreadable entry.
- A scene with no document that had text reopened with no message (`22678b9`). Held by the check of a scene saved with no note open.
- The served page, sent an address that names a scene, scrolled documents and said the scene had reopened (`2646cf5`). Held by the served-page check, and by nothing else.
- A "send back" that failed could not be pressed again (`39915fe`). Held by the new step of the handoff walk, and by a node test of the rule.
