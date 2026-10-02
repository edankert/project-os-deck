---
type: "[[task]]"
id: TASK-0110
title: "Walk scenes and handoff at real scale"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
parent: "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"
effort: M
due: ""
depends: ["[[TASK-0107-Save-Reopen-And-Undo-Scenes-In-Glass]]", "[[TASK-0109-Show-The-Destination-The-Arrival-And-The-Way-Back]]"]
blocks: []
related: ["[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]", "[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]", "[[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]"]
tests: ["[[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]]", "[[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]"]
---

# Walk scenes and handoff at real scale

The evidence for FEAT-0023. Two scripted walks drive scenes and handoff in the real application with a real pointer and keyboard and keep pictures: `desktop/demos/glass-scenes.cjs` and `desktop/demos/glass-handoff.cjs`. The acceptance check is a person's, and this task prepares it without recording a verdict for it.

**Where it stands, 2026-10-02.** The task moves from `backlog` to `doing`: both walks are written and were run in a Linux container at commit `4243fc2`, where all 26 and all 24 checks held. Six boxes are open, each with what is missing under it, and two steps are not done. Nothing was run on a second workspace, on the Mac, on a second display or on a real tablet. The record is in [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]].

## Definition of Done

- [x] `bash tools/scripts/walk-in-a-box.sh glass-scenes --copy` runs `desktop/demos/glass-scenes.cjs` on a throwaway copy of this repository's notes, records each claim with what was seen in `drive.json`, and keeps pictures in `desktop/dist/walks/glass-scenes/`. It refuses to run on anything but a copy, because it deletes and edits notes. `bash tools/scripts/walk-in-a-box.sh glass-handoff` runs the handoff walk on the repository itself, because it edits nothing. Shown by the run at `4243fc2`: 26 checks and four pictures, and 24 checks and seven pictures. The refusal is the first statement of the scenes script; no run tried it on a repository.
- [x] The walk saves a scene, deletes a note that is on the desk, renames a heading in an open document, reopens the scene and records the labelled missing document, the passage reported as moved, and the message. Shown by the checks "the heading "Scope" was found in FEAT-0003-One-Store-In-The-Main-Process.md to rename", "reopened after FEAT-0002 was deleted, a heading in FEAT-0003 was renamed and the window was made smaller: the scene says all three, and stays until dismissed", "FEAT-0002's document is there under its own title, labelled: the text this window read earlier, said to be as last read, and no other note stands in for it" and "FEAT-0003 is open at its size, as far down as before".
- [ ] The walk adds a member to the view under the saved scene and records the current count and members after reopening.
  Not done. The walk adds no note. It compares the count with the sidecar's once, before it changes anything, and does not compare it again after it deletes a note.
- [x] The walk reopens the scene in a narrow window and records the message naming the smaller field and the store's coordinates unchanged. Shown by the reopening check quoted above, whose message reads "This window's field is 1052 by 571; the scene was arranged in 1260 by 740", and by "the places and sizes the scene holds were not changed by being drawn in a smaller window".
- [ ] The walk records every document's header inside the narrow field.
  No check asserts it. The picture `03-reopened-after-changes.png` shows both headers on screen.
- [x] The walk reloads the window and records the scenes still listed and the undo back to the previous desk gone. It does not open a scene again after the reload. Shown by "after a reload the scenes are still listed; the way back to "the desk before" was this window's and is gone".
- [x] The walk opens a desk window and a reader window, sends a document with "Move to" and with "Also show in", and records the chooser's and the strip's words before release, the source document present until the answer, the size and reading position after the note has gone and come back, the arrival message, and "send back". The arrival mark is recorded once, on a document returning to the main window. "Also show in" is sent from the chooser; on the strip its entry is read and not released on. Shown by the handoff walk's checks 2 to 5 and 9 as its script numbers them, quoted in [[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]] and [[TASK-0109-Show-The-Destination-The-Arrival-And-The-Way-Back]].
- [x] The walk forces each failure a container can produce and records the source desk unchanged and the note on no desk twice: the destination kept busy past the wait, and the destination window closed during the wait. Shown by "a desk window that does not answer: after 4.2 s the main window says the note stays here, and both desks are exactly as they were" and "a desk window closed before it answered: the note stays here, and both desks are as they were".
- [ ] The walk repeats save, reopen, both acts and "send back" by keyboard alone and with `prefers-reduced-motion: reduce` emulated.
  Not done as asked. By keyboard the walks choose a scene in the list, type its name, answer "keep it", and open the chooser with `S`. Every button, every answer in the chooser and every "send back" is a pointer press. Reduced motion is emulated for one "send back" into the main window and for nothing about a scene.
- [x] The walks load the served page with no preload bridge and record no scene control, no "send back", no arrangement control, and the host's 405 to a write. Shown by "the served page offers no scenes: it shows the desk the application has" and "the served page has no bridge: it is never told of an arrival, offers no "send back", and the host still answers 405 to a write".
- [ ] The walk is also run with `--workspace` on at least one other real project-os repository on this machine, and its result is recorded with the repository's note count.
  Not run. The pass on 2026-10-02 ran other walks on a second repository and not these two.
- [ ] Measurements are recorded in [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]] with build, workspace, note count, window size and where they were taken: the time from choosing a scene to its last document's text being in, the time from release to acknowledgement for each destination kind, and the frame cadence while a scene with several documents is restored. Times taken in the box use software rendering and are labelled as such; the Mac's are taken in a foreground window when Edwin allows a window to be opened.
  Partly done. Recorded, in the container: release to answer for a desk window and for a reader window. Not measured anywhere: the time to reopen a scene, and the frame cadence. Not run: anything on the Mac, because a window there takes the keyboard from the person working.
- [x] The chosen acknowledgement wait is written beside the measured acknowledgement times, with the margin between them. In TST-0076, "Measurements": 4000 ms against 159 ms for a desk window, and 12000 ms against 904 ms for a reader, both in the container.
- [x] What cannot be scripted is listed and left to [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]: a physical second display being disconnected, Safari on the tablet, a screen reader, and whether a person finds the two acts clear. In TST-0076, "What they do not cover".
- [ ] Every defect the walk finds in code this feature changed is fixed in this feature and listed in TST-0076 with what was seen. No check is weakened to pass.
  Open, because three things the walks' records and pictures show are not fixed: "send back" offered for a window that has closed, the bar running past the edge of an 1180-pixel window, and the words "the a new reader" in an empty display's entry. The defects found while building are fixed and listed in TST-0076. The one walk check that changed after it first ran was made stricter (commit `4243fc2`).
- [x] TST-0073's Setup and Steps are checked against the built application, so that a stranger can follow them. The check was made at this close-out from the code and the walks' records, not by walking. What changed is listed at the foot of TST-0073. No verdict is recorded for it.

## Steps

- [x] Read TST-0073 and write the scripted route to follow its steps in order. The route is two scripts.
- [x] Run the walks in the box, read `drive: ok` and `drive: FAIL`, and look at every picture. Run on 2026-10-02 at `4243fc2`. The eleven pictures were looked at during this close-out.
- [ ] Run it on a second workspace.
  Not run.
- [ ] Take the Mac measurements once, batched, when Edwin says a window may be opened.
  Not run. Edwin has not said so.
- [x] Record the evidence in TST-0076 and reconcile FEAT-0023's Verification section, REQ-0004 and REQ-0005.

## Notes

**An earlier run reported a move that should not have worked.** When the handoff walk was first run (commit `f80339f`, 24 checks), it reported that a feature moved from the main window to a desk window on the Issues view arrived and was drawn there. A desk window is always drawn as Spread cards, and Spread did not draw a note its view does not list. The move appeared to work only because of a defect: after a write, a popped-out window listed the main window's view, so the desk window was listing Features. Commit `a37f8f2` fixed that defect, and the move stopped arriving. Commit `5f706a5` first made the desk window refuse at once with the reason. Commit `9379a0c` replaced the refusal: a Spread desk now draws every note on it that the workspace has, marked "not in this view", so the move arrives. Commit `4243fc2` tightened the walk's check, which had only asked whether an element carrying the note's id existed, to ask for a visible card with that mark. The full account is in TST-0076.

Window-opening runs on the Mac take the keyboard from whoever is typing (ISS-0075), so the box is the default and the Mac run is held until Edwin agrees.

A display being disconnected cannot be produced in the box. The main process's handling of it is covered without a window by [[TST-0075-A-Move-Is-Never-Half-Done]], which feeds the rule the event, and with a real display by step 9 of TST-0073.
