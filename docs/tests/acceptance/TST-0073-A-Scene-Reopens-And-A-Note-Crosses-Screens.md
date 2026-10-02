---
type: "[[test]]"
id: TST-0073
title: "A scene reopens and a note crosses screens"
status: active
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
scope: feature
level: acceptance
entrypoint: "Glass scene controls and the send-to-window strip in Deck"
command: ""
last_verified: ""
covers: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
issues: []
tasks: ["[[TASK-0107-Save-Reopen-And-Undo-Scenes-In-Glass]]", "[[TASK-0109-Show-The-Destination-The-Arrival-And-The-Way-Back]]", "[[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]]"]
artifacts: []
related: ["[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]", "[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]"]
area: glass-scenes
after: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]", "[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
---

# A scene reopens and a note crosses screens

## Setup

Use a disposable copy of a real project-os workspace, because the walk deletes a note and edits another. Copy a repository's folder, add the copy to Deck as a workspace, and open it. Run `git status` in the copy and keep the output.

You need a Mac with a second display connected, and a tablet on the same network. Start Deck with `cd desktop && npm run start:lan` so the tablet can load it, and open the address Deck prints in Safari on the tablet.

Open Glass on the Features view. Open three long notes as documents, give two of them different sizes, and scroll each to a different heading. Type a search that narrows the collection, and write down the search text, the collection's count, the three note ids and the heading at the top of each document. Record the build, both displays' sizes and whether reduced motion is on.

Pop out a desk window for a different view (Issues) and drag it to the second display. Pop out a reader window and leave it on the first display.

## Steps

1. Save the desk as a scene named "review". Turn the field, zoom, and close one document. Open "review" from the scene list.
2. Read what is on screen: the view, the search text, the collection, the three documents, where each is scrolled, and whether the field's turn and zoom changed.
3. Use "Undo: back to the desk before review". Then open "review" again.
4. Quit Deck. In the workspace copy, add a new feature note that matches the search, delete one of the three notes' files, and rename the heading you recorded in a second one. Start Deck and open "review".
5. Read the message. Look at the document for the deleted note. Compare the collection's count with the number you wrote down and with the number of matching files now.
6. Make the window half as wide and open "review" again. Find every document. Widen the window and open "review" once more.
7. Rename "review" to "review glass", copy the window's address, delete the scene, and use "restore". Paste the address into Deck. Save the desk again under "review glass" and answer the question it asks.
8. Drag a document toward the edge facing the second display. Read the strip before letting go. Release on "Move to" the Issues desk. Watch the source document until the other window shows the note. In the Issues window, read the arrival message, check the document's size and where it is scrolled, and use "send back".
9. Send the document with "Move to" again and disconnect the second display's cable the moment you release. Reconnect it. Then send it once more and, this time, close the Issues window the moment you release.
10. Press `S` on a document and choose "Also show in" the reader window using only the keyboard. Then, from the reader, use "send back" with the keyboard.
11. Turn on Reduce motion in macOS's Accessibility settings and repeat steps 8 and 10.
12. Press `S` and choose the tablet. Look at the tablet. On the tablet, look for any scene control, any send control, and try to move a document.
13. Run `git status` in the workspace copy and compare it with the output from Setup, allowing for the three edits you made in step 4.

## Expect

- After step 1, Glass is on the Features view with the search text you typed, the collection where it stood, and three documents at their places and sizes, each scrolled to the heading you recorded. The field's turn and zoom are as you left them and did not jump back.
- "Undo: back to the desk before review" brings back the desk with two documents. It is a different control from "Undo arrangement".
- After step 4, the collection's count includes the note you added. A message stays on screen until you dismiss it. It names the deleted note and says its document is kept, and it says the passage in the second note moved. It does not mention the count.
- The deleted note's document is on the desk with its id, says the note is no longer in the workspace, and offers Close. It shows no other note's text.
- In the narrow window every document can be reached, and the message says the field is smaller than the one the scene was arranged in. After widening, the documents are back at their original places.
- The renamed scene opens from the pasted address. "restore" brings a deleted scene back. Saving over "review glass" asks before replacing.
- The strip names the Issues desk window, its display, and both "Move to" and "Also show in". "Move to" says the note will leave this desk.
- After the move the note is in the Issues window at the same size and scrolled to the same place, marked, with a message naming the window it came from. The source document stayed until then and is gone afterwards. "send back" returns it.
- After the cable is pulled or the window is closed, the source document is where it was and a message says why the move did not happen. The note is not on any desk twice.
- The keyboard offers the same two acts and the same "send back".
- With Reduce motion on, nothing flies across the screen and the arrival mark and message still appear.
- The tablet shows the note on the desk it follows. The Mac says the tablet's arrival is not confirmed. The tablet offers no scene control, no send control and no way to move a document.
- `git status` shows only your three edits from step 4.

## Not this check

- Whether the field's turn, zoom or focus document should be saved. They are not, by decision (ADR-0007).
- A scene that spans several views or several windows, and several collections on one desk. Neither exists.
- Stack, table and cards, and Read, Compare and Show related. That is [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]].
- A desk saved before scenes, and a scene saved by a newer Deck. Both are checked without a window in [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]].
- Every path through a failed handoff. That is [[TST-0075-A-Move-Is-Never-Half-Done]]; this check walks two of them with real hardware.
- A screen reader. It is not walked here and no claim is made for it.

This note defines the walk. It records no outcome, and nothing it describes is built on 2026-10-02.
