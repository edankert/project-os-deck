---
type: "[[task]]"
id: TASK-0103
title: "Walk collection forms and arrangements at scale"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"]
parent: "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]"
effort: medium
due: ""
depends: ["[[TASK-0102-Preview-Apply-And-Undo-Glass-Arrangements]]"]
blocks: []
related: ["[[REQ-0003-Glass-Arrangements-Preserve-Membership-And-Reading-Size]]", "[[DES-0003-Collections-And-Documents-On-Glass]]", "[[RISK-0007-Glass-Restoration-Loses-Identity-Or-Layout]]"]
tests: ["[[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]]"]
---

# Walk collection forms and arrangements at scale

## Definition of Done

No box is ticked. Each asks for a person's walk or for a measurement in a foreground window on the Mac, and neither has happened. The line under each box says what a script has shown in the Linux box and what is still missing. The scripted evidence is from the verification pass of 2026-10-02 at `4243fc2`.

- [ ] TST-0064 is walked with real full-size data, a long note, shared neighbours, a changed result, an old saved desk and a narrow window.
  - Missing: the walk. Nobody has walked [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]] and the ledger holds no verdict for it. A script drove the same route on this repository's notes, 44 of 44 checks ([[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]). A script is not a person's walk.
- [ ] Keyboard-only, reduced motion, overlap, scroll boundaries and the served read-only host are exercised with dated artifacts and no invented verdict.
  - Missing: a person's pass over these, two compared documents that overlap on screen, and the cards turned to their last row with the wheel. The scripted walk drove Read with the keyboard alone, applied an arrangement with reduced motion emulated, turned the wheel three notches over the cards, and read the served page in a second Electron window with no preload bridge. Its record and 12 pictures are dated 2026-10-02. The overlap sentence is checked without a window in [[TST-0070-An-Arrangement-Is-A-Plan-Before-It-Is-A-Move]].
- [ ] Foreground measurements record build/fixture/input/window provenance, reachable and drawn counts, frame cadence, script/render cost, stalls, memory and interaction response.
  - Missing: the measurement in a foreground window on the Mac. It has not been run, because a window on the Mac takes the keyboard from the person working there. [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]] holds the container's figures for Your Trainer (1393 notes in the view) and for this repository (144), each with its build, window and counts. The container draws in software, so its time between frames says nothing about the Mac. Its turns were measured with the collection as cards and with four documents open; no turn was measured after Read, Compare or Show related was applied.
- [ ] Before/after observations record find/compare/follow-source/return completion, mistakes and lost context; source-file state confirms arrangements do not write notes.
  - Missing: the observations. They are a person's, and a script has none. For the second half, the scripted walk ticked one criterion through the sidecar, applied an arrangement and undid it, and the file still held the tick; both scale walks left the workspace they read unchanged.
- [ ] Acceptance failures and performance limits are recorded and fixed or explicitly scoped; membership is never capped to improve timings.
  - Missing: an acceptance walk to have failures from. What the scripted walk found is recorded in TST-0071: two faults, both fixed, and one step that failed once, has not failed since and is not explained. The limits the container showed are in TST-0072. On membership, the scale walk's check "as cards, the collection counts every member and draws only the rows in view" held with 1393 members and 14 drawn at once, and End reached the last one.

## Steps

- [ ] Read the feature, requirement and design, including state ownership and recovery rules.
- [ ] Implement this task's behavior and meaningful checks against its definition of done. The scripted part exists: the walk `desktop/demos/glass-arrangements.cjs` and the Cards part of `desktop/demos/glass-scale.cjs` (commit `b017807`).
- [ ] Record evidence and reconcile affected documentation before closing.

## Notes

The task is `doing`: the scripted walks it names have run, and everything it asks of a person is still owed. Two things are needed to close it. Edwin, or whoever they name, walks TST-0064 on a disposable real workspace and records the verdict in the release ledger. And `glass-scale.cjs` is run in a foreground window on the Mac when it may take the keyboard for about a minute (TST-0072, Procedure, step 4).
