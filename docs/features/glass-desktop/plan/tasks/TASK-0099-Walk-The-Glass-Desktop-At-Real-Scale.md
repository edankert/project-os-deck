---
type: "[[task]]"
id: TASK-0099
title: "Walk the Glass desktop at real scale"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: ["[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]"]
blocks: []
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]", "[[PHASE-0002-Glass]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Walk the Glass desktop at real scale

## Definition of Done

- [x] The automated Glass smoke drives collection and full-document interactions with a real pointer and keyboard, including refresh and multiple windows. Shown by the smoke run at commit `18f5405`: its Glass section holds 291 checks, of which the `collection` part is 17, the `document` part 14 and the `served` part 6. Refresh is in the `switch` part ("a change arriving under the field is read, counted and announced", "the collection says what is waiting and offers to apply it"). More than one window is in the `served` part (a second window with no bridge), the `desks` part (a desk window on another view) and the `throw` part. The run as CI makes it, `bash tools/scripts/smoke-in-a-box.sh both`, exited 0 on loopback and on the network.
- [ ] The acceptance walk covers the current real workspaces, a narrow window or tablet, an accessible route, exact counts and an opened long note.
  - Missing: [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] is a person's walk and has not been walked. The ledger holds no verdict for it.
  - What exists instead is scripted: the `glass-desktop` walk on this repository (55 checks of 55: exact counts, a long note scrolled to its end, a route by keyboard alone, a field 652 px wide, the served page), the `glass-collection` walk there (17 of 17: the two filters, a group heading, the collapsed header, the wheel at both ends of the list, Escape during a drag and a resize, focus that can be seen, and on the served page the collection's own fold and the keyboard's place in a window 760 px wide) and the `glass-scale` walk on a copy of Your Trainer (8 of 8, 1393 notes in the view). A scripted walk is not a person's walk.
- [ ] Foreground measurements with the collection and document open report frame work and reachability against PHASE-0002's existing budget; failures are recorded, not hidden by population caps.
  - Missing: PHASE-0002's budget is a frame time in a foreground window on the Mac, and that has not been measured. The measuring walk takes the keyboard for about a minute, so it waits for Edwin to run it or to say when.
  - What exists is the container's, which draws in software: [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]]. At `18f5405`, on Your Trainer, the script work per frame while turning is 2.5 ms at the median and 6.5 ms at the 95th percentile with the collection alone, 5.9 and 10.7 ms with 217 notes gathered round a document, and 2.9 and 8.7 ms with four documents, against a frame of 16.7 ms. With documents on the field the container delivers 211 to 240 frames in four seconds where 240 would arrive, and that is recorded, not hidden. The walk logs these figures and asserts nothing about them. The collection counts 1393 members, 133 with a place in the field and 1260 in the list only, and a member with no place opens from its row.
- [ ] Record before/after task completion time, mistaken selections and lost-context incidents for find, open, follow link and return; retain the observations rather than assert animation improves usability.
  - Missing: these are a person's numbers and nobody has taken them. No note claims that the motion helps.

- [x] Capture interrupted transitions, reduced motion, high-degree neighbours, shared neighbours, scroll boundaries and an unplaced member reached through the exact collection. Shown by the scale walk on Your Trainer: a second note opened 90 ms into the first one's opening (picture `04-two-openings-interleaved.png`), the note joined to 217 others with every one seated once (`03-the-most-linked-note.png`), "a note joined to more than one open note is one card", and REQ-0185, which the field has no place for, opened from its row (`02-an-unplaced-note-opened-from-the-list.png`). Reduced motion and a document's two scroll boundaries are in the `glass-desktop` walk (`16-reduced-motion.png`, and the checks on the wheel at a document's end and top). The list's own two scroll boundaries are in the `glass-collection` walk (the check on the wheel at the list's first and last row).
- [ ] Record build, fixture, window/display, refresh state, input sequence, timing endpoint, foreground frame cadence, script/render work, stalls and memory with full documents present.
  - Shown for the container: the scale walk's first entry records the build (`18f5405`), the workspace and view, the machine (4 cores, 8 GB, software rendering), the window (1440 by 873), the field, the device pixel ratio and that the window was focused and visible. Each turn records the frames delivered, the time between frames and the script work; each opening records the time to the first frame, to the text and to rest; three entries record memory. TST-0072 holds the tables.
  - Missing: the same record on the Mac. The time spent drawing, apart from script work, is not measured per frame either; commit `002fc33` gives one figure for the canvas, 3.9 ms in the container.

## Steps

- [x] Extend real-pointer checks and update the stale owed-card smoke precondition. The smoke run now says first what the workspace owes. On a day the Issues view owes nothing it marks open issues as owed in the page's own copy of the navigation payload and prints a line beginning INJECTED; no file is written (commit `6be167a`, and the line is in the run at `18f5405`). The three parts for this feature were added in commit `2bda283`.
- [ ] Run [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] and save evidence. Not done: it is a person's walk.
- [x] Measure the full corpus with on-stage objects present. Done in the container, on a copy of Your Trainer (3247 notes, 20277 links): TST-0072. Not done on the Mac.

## Notes

This task measures the Electron experience being delivered here. The native comparison that TASK-0092 planned was dropped on 2026-10-01.

**This task stays `doing`.** Four boxes are open. Three need a person: the acceptance walk, the Mac measurement and the before-and-after observations. The fourth, the record of a run, is complete for the container and absent for the Mac.

**Where the evidence is from.** The verification pass ran on 2026-10-02 at commit `18f5405`, in the Linux container (the `project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900), from a separate clone, after the independent review's fixes. The smoke run's loopback half, with every check printed, reads 389 passed, 0 failed, 0 skipped and 2 not applicable, and `bash tools/scripts/smoke-in-a-box.sh both` exited 0. The walks: `glass-desktop` 55 of 55, `glass-collection` 17 of 17, `collection-refresh` 10 of 10, `glass-scale` 8 of 8 on this repository and 8 of 8 on Your Trainer.

**What was not tried at all:** a second display, a display unplugged, a real tablet, touch and a screen reader.

**The independent review, 2026-10-02.** Both reviewers ran node suites only, so they marked what this task's boxes ask for *not checked*. On the third box reviewer A read the scale walk's script and says what the box already says: it logs the script work per frame "against a 16.7 ms frame" and asserts nothing about it, and nothing was timed on the Mac. The review requested changes to the feature for other reasons, and round two approved the fixes; both are recorded in [[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]] under Review. That approval ticks nothing here: the four open boxes need a person or the Mac.

**One saving was made under this task.** A turn with 217 notes gathered round a document cost 8.2 ms of script work at the median and 16.7 ms at the 95th percentile, a whole frame. Two things were being redone on every frame that a turn does not change: every card was repainted, and every link line was rebuilt. Commit `002fc33` brought that to 6.1 and 11.2 ms, and at `18f5405` the walk reads 5.9 and 10.7 ms. All of these are the container's figures.
