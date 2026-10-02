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

**Not walked.** No person has walked this check, and the ledger (`docs/releases/ledgers/WORKING-app.json`) holds no verdict for it on 2026-10-02. What it describes is built. Two scripted walks drive most of the same route in a Linux container ([[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]). A scripted walk is not a person's walk, and it had one display and no tablet.

## Setup

Use a disposable copy of a real project-os workspace, because the walk deletes a note and edits another. Copy a repository's folder, add the copy to Deck as a workspace, and open it. Run `git status` in the copy and keep the output.

You need a Mac with a second display connected, and a tablet on the same network. Start Deck with `cd desktop && npm run start:lan` so the tablet can load it, and open the address Deck prints in Safari on the tablet.

Pop out the two other windows first. Switch to the Issues view and open one issue, so that view's desk holds a note. Press "Pop out…" and choose "The desk". Drag the new window to the second display. Switch to the Features view, open a note, press "Pop out…" and choose "The focused note". Leave that reader window on the first display.

Then, in Glass on the Features view, open three long notes as documents, give two of them different sizes, and scroll each to a different heading. Type a search that narrows the collection, and write down the search text, the collection's count, the three note ids and the heading at the top of each document. Record the build, both displays' sizes and whether reduced motion is on.

## Steps

1. Press "save scene", type "review" and press Return. Turn the field, zoom, and close one document. Choose "review" in the scene list, then press "open".
2. Read what is on screen: the view, the search text, the collection, the three documents, where each is scrolled, and whether the field's turn and zoom changed.
3. Press the button that reads `Undo: back to the desk before "review"`. Then open "review" again.
4. Quit Deck. In the workspace copy, add a new feature note that matches the search, delete one of the three notes' files, and rename the heading you recorded in a second one. Start Deck and open "review".
5. Read the message. Look at the document for the deleted note. Compare the collection's count with the number you wrote down and with the number of matching files now.
6. Make the window half as wide and open "review" again. Find every document. Widen the window and open "review" once more.
7. With "review" chosen in the list, press "rename" and type "review glass". Press "Copy address". Press "delete", then "restore" in the message. Press "Open address…" and paste the address. Then switch to the Issues view and back to Features, press "save scene", type "review glass", press Return, and answer "keep it".
8. Drag a document toward the edge facing the second display. Read the strip before letting go, and rest the pointer on the "Move to" entry to read what it says. Release on "Move to the desk on …". Watch the source document until the other window shows the note. In the Issues window, read the arrival message, look at the card, and press "send back". Back in the main window, check the document's size and where it is scrolled.
9. Send the document with "Move to" again and disconnect the second display's cable the moment you release. Reconnect it. Then send it once more and, this time, close the Issues window the moment you release. In the container a desk window answered 159 ms after release, so the move may be finished before the cable is out or the window is closed. Write down which happened each time.
10. Press `S` on a document and choose "Also show in the reader on …" using only the keyboard. Then, in the reader window, reach "send back" with the keyboard and press it.
11. Turn on Reduce motion in macOS's Accessibility settings and repeat steps 8 and 10.
12. Press `S` and choose "Also show in the tablet". Look at the tablet. On the tablet, look for any scene control, any send control, and try to move a document.
13. Run `git status` in the workspace copy and compare it with the output from Setup, allowing for the three edits you made in step 4.

## Expect

- After step 1, Glass is on the Features view with the search text you typed, the collection where it stood, and three documents at their places and sizes, each scrolled to the heading you recorded. The field's turn and zoom are as you left them and did not jump back. Choosing the name in the list changed nothing until "open" was pressed.
- `Undo: back to the desk before "review"` brings back the desk with two documents. It is a different control from "Undo arrangement".
- After step 4, the collection's count includes the note you added. A message stays on screen until you dismiss it. It names the deleted note and says its document is kept, and it says the passage in the second note is not under the heading it was. It does not mention the count.
- The deleted note's document is on the desk under its id. It says there is no note at that path any more, and offers "retry" and "close". It shows no other note's text.
- In the narrow window every document can be reached, and the message gives this window's field size and the size the scene was arranged in. After widening, the documents are back at their original places.
- The renamed scene opens from the pasted address. "restore" brings a deleted scene back. Saving under "review glass" while another desk is on screen asks "replace it", "keep it" or "cancel", and "keep it" leaves the saved scene as it was.
- The strip names the desk window by what it carries and its display ("the desk on …"), once as "Move to" and once as "Also show in". Resting on "Move to" says the note leaves this desk once that window shows it.
- After the move the note is in the Issues window as a card marked "not in this view", with a message naming the window it came from. A desk window draws its notes as cards, so the size and the reading position are not seen there. The source document stayed until the card was drawn and is gone afterwards. "send back" returns it, and the document is then the size it was and scrolled to the same place.
- When the cable is pulled or the window is closed before the desk window has answered, the source document is where it was and the status line says why the move did not happen. The note is not on any desk twice.
- The keyboard offers the same two acts. `S` on a document that arrived from another window lists "Send back to …" first.
- With Reduce motion on, nothing flies across the screen. A document that arrives in the main window is outlined for about two seconds, and the message is the same.
- The tablet shows the note on the desk it follows. The Mac says a tablet cannot confirm it arrived. The tablet offers no scene control, no send control and no way to move a document.
- `git status` shows only your three edits from step 4.

## Not this check

- Whether the field's turn, zoom or focus document should be saved. They are not, by decision (ADR-0007).
- A scene that spans several views or several windows, and several collections on one desk. Neither exists.
- Stack, table and cards, and Read, Compare and Show related. That is [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]].
- A desk saved before scenes, and a scene saved by a newer Deck. Both are checked without a window in [[TST-0074-A-Scene-Keeps-Places-And-Nothing-Derived]].
- Every path through a failed handoff. That is [[TST-0075-A-Move-Is-Never-Half-Done]]; this check walks two of them with real hardware.
- A screen reader. It is not walked here and no claim is made for it.

## Corrected against the built application, 2026-10-02

The steps were written before anything was built. These were changed so that a person can follow them in the application as it is. Nothing was walked to make the changes; each comes from the code and from the scripted walks' records.

- **Setup.** "Pop out…" offers the desk of the view on screen, and only when that desk holds a note. The setup now says to switch to Issues and open an issue first. It pops the windows out before arranging the Features desk, so the arranging is not disturbed.
- **Step 1.** A scene is chosen in the list and then opened with its own "open" button (commit `b1bfa1d`).
- **Step 3.** The button's label carries the scene's name in quotation marks.
- **Step 7.** "save scene" asks before replacing only when the name belongs to a scene that is not the open one. Typing the open scene's own name saves over it with no question (`saveScene` in `desktop/src/renderer/renderer.ts`). The step now switches view first, which closes the scene's name. ADR-0007 A7 says saving under a name that exists asks first, so whether saving over the open scene should ask is Edwin's to judge.
- **Step 8 and its expected result.** A desk window is always drawn as cards, so the moved note is a card there and not a document with a size and a scroll position. The check of size and reading position moved to after "send back". The sentence saying a move leaves this desk is the strip entry's tooltip, not its label.
- **Step 9.** A sentence says the move may finish before the cable is out, with the time the scripted walk measured.
- **Step 12.** The entry is named "Also show in the tablet".
- **The deleted note's document.** It says there is no note at that path any more and offers "retry" and "close". The words "no longer in this workspace" are in the scene's message, not on the document.
