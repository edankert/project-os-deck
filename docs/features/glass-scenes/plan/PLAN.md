---
type: "[[plan]]"
title: "Add named scenes and an acknowledged handoff to Glass"
status: active
owner: user:edwin
created: 2026-10-02
updated: 2026-10-02
source: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
implements: ["[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]"]
related: ["[[ADR-0007-A-Scene-Is-A-Saved-Desk-Read-Live-And-A-Handoff-Waits-For-The-Destination]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[REQ-0004-A-Glass-Scene-Reopens-With-Live-Content-And-Says-What-Changed]]", "[[REQ-0005-A-Handoff-Is-Acknowledged-Before-The-Source-Lets-Go]]"]
---

# Add named scenes and an acknowledged handoff to Glass

## Delivery sequence

1. **[[TASK-0106-Keep-A-Scene-In-The-Store]]: the scene model, without a window.** A pure module, `desktop/src/shared/scenes.ts`, says what a scene holds, how a reading anchor is taken and found again, and what a reopened scene has to report. The store (`desktop/src/shared/store-state.ts`) gains the actions that save, open, rename, delete and restore a scene and that keep the desk that was there before. The state file's reader keeps a desk with no version and a scene of an unknown version as they are. Checked by `desktop/tests/scenes.test.mjs`.
2. **[[TASK-0107-Save-Reopen-And-Undo-Scenes-In-Glass]]: scenes on screen.** Glass gains the controls, captures and applies reading anchors, shows the message about what changed, and offers the undo back to the desk before. The served page offers none of it.
3. **[[TASK-0108-Acknowledge-A-Handoff-In-The-Main-Process]]: the handoff's states.** A pure module, `desktop/src/shared/handoff.ts`, holds the states a handoff passes through and what each failure undoes. The main process (`desktop/src/main/main.ts`, around `deck:window:throw`) lands the note, waits for the destination, and commits or undoes. The preload bridge carries the arrival and the acknowledgement. Checked by `desktop/tests/handoff.test.mjs`.
4. **[[TASK-0109-Show-The-Destination-The-Arrival-And-The-Way-Back]]: the handoff on screen.** The target strip and the `S` chooser name the destination and the act. The destination marks the arrival, names the source and offers "send back".
5. **[[TASK-0110-Walk-Scenes-And-Handoff-At-Real-Scale]]: the walk.** The scripted walk `desktop/demos/glass-scenes.cjs` drives both with a real pointer and keyboard and keeps pictures. Measurements are taken on real workspaces. [[TST-0073-A-Scene-Reopens-And-A-Note-Crosses-Screens]] is a person's and is not walked by a script.

Tasks 1 and 3 do not depend on each other and can be built in either order. Task 2 needs 1, task 4 needs 3, and task 5 needs 2 and 4.

## Dependencies

- **Hard:** FEAT-0020's document and collection on the desk, and FEAT-0022's arrangement undo, because scene undo has to sit beside it. Both are at `doing` on 2026-10-02 with their code in the tree. TASK-0101, which is the focus while this plan is written, is finished first.
- **Hard:** none outside this repository. The sidecar is not asked for anything, and no route is added to Deck's host.
- **Soft:** FEAT-0014's throw checks in the smoke run and in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]. TASK-0108 changes what a throw answers and when, so those checks are reconciled in that task and not left to fail.

## Recovery rules

- A scene is read from the source every time. Nothing in a scene can be used to draw a row, a count or a note's text.
- Opening a scene keeps the desk that was there, for this window's session, so it can be put back. A second scene opened before undoing replaces what is kept, and the control's name says which desk it returns to.
- A scene this Deck cannot read is never rewritten. It is listed with its version and left in the state file.
- A handoff is one record in the main process with one state. A move's source document is removed in the same step that marks the handoff acknowledged, and in no other.
- A handoff that is not acknowledged undoes exactly what its landing added. A note the destination desk already held stays there.
- Nothing about a handoff is written to the state file. After a restart there is no arrival mark and no "send back".

## Open questions

These are Edwin's and none of them blocks the build. Each is recorded under ADR-0007's Acceptance section with the default the build takes.

- Should a reopened scene name a note whose file moved? Default: no, because a scene keeps a note's id and no path.
- Should a scene remember its view? FEAT-0015 left this to Edwin for saved desks. Default: yes for a scene, unchanged for a desk with no version.
- May a reading anchor keep the words of a heading? Default: yes, as a locator, with the fraction as the fallback.

One value is left to the build and recorded when it is chosen: how many seconds the main process waits for an acknowledgement. TASK-0108 sets it as a named constant and TASK-0110 records the acknowledgement times the walk measured beside it.
