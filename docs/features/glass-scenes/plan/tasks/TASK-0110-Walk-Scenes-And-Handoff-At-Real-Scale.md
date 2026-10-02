---
type: "[[task]]"
id: TASK-0110
title: "Walk scenes and handoff at real scale"
status: backlog
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

The evidence for FEAT-0023. A scripted walk drives scenes and handoff in the real application with a real pointer and keyboard and keeps pictures. Measurements are taken on real workspaces. The acceptance check is a person's, and this task prepares it without recording a verdict for it.

## Definition of Done

- [ ] `bash tools/scripts/walk-in-a-box.sh glass-scenes --copy` runs `desktop/demos/glass-scenes.cjs` on a throwaway copy of this repository's notes, records each claim with what was seen in `drive.json`, and keeps pictures in `desktop/dist/walks/glass-scenes/`. It refuses to run on anything but a copy, because it deletes and edits notes.
- [ ] The walk saves a scene, changes the workspace under it (a member added to the view, a note on the desk deleted, a heading in an open document renamed), reopens the scene and records: the current count and members, the labelled missing document, the passage reported as moved, and the message.
- [ ] The walk reopens the scene in a narrow window and records every document's header inside the field, the message naming the smaller field, and the store's coordinates unchanged.
- [ ] The walk reloads the window and records the scene still listed and openable and the undo back to the previous desk gone.
- [ ] The walk opens a second window, sends a document with "Move to" and with "Also show in", and records for each the strip's and the chooser's words before release, the source document present until the acknowledgement, the size and reading position at the destination, the arrival mark and message, and "send back".
- [ ] The walk forces each failure and records the source document unchanged and the note on no desk twice: the destination's acknowledgement withheld past the wait, and the destination window closed during the wait.
- [ ] The walk repeats save, reopen, both acts and "send back" by keyboard alone and with `prefers-reduced-motion: reduce` emulated.
- [ ] The walk loads the served page with no preload bridge and records no scene control, no handoff entry, and the host's 405 to a write.
- [ ] The walk is also run with `--workspace` on at least one other real project-os repository on this machine, and its result is recorded with the repository's note count.
- [ ] Measurements are recorded in [[TST-0076-Scenes-And-Handoff-Are-Walked-With-A-Real-Pointer]] with build, workspace, note count, window size and where they were taken: the time from choosing a scene to its last document's text being in, the time from release to acknowledgement for each destination kind, and the frame cadence while a scene with several documents is restored. Times taken in the box use software rendering and are labelled as such; the Mac's are taken in a foreground window when Edwin allows a window to be opened.
- [ ] The chosen acknowledgement wait is written beside the measured acknowledgement times, with the margin between them.
- [ ] What cannot be scripted is listed and left to [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]]: a physical second display being disconnected, Safari on the tablet, a screen reader, and whether a person finds the two acts clear.
- [ ] Every defect the walk finds in code this feature changed is fixed in this feature and listed in TST-0076 with what was seen. No check is weakened to pass.
- [ ] TST-0073's Setup is checked against the built application, so that a stranger can follow it. No verdict is recorded for it.

## Steps

- [ ] Read TST-0073 and write the scripted route to follow its steps in order.
- [ ] Run the walk in the box, read `drive: ok` and `drive: FAIL`, and look at every picture.
- [ ] Run it on a second workspace.
- [ ] Take the Mac measurements once, batched, when Edwin says a window may be opened.
- [ ] Record the evidence in TST-0076 and reconcile FEAT-0023's Verification section, REQ-0004 and REQ-0005.

## Notes

Nothing is built by this note and no walk has been run. Window-opening runs on the Mac take the keyboard from whoever is typing (ISS-0075), so the box is the default and the Mac run is held until Edwin agrees.

A display being disconnected cannot be produced in the box. The main process's handling of it is covered without a window by [[TST-0075-A-Move-Is-Never-Half-Done]], which feeds the state machine the event, and with a real display by step 9 of TST-0073.
