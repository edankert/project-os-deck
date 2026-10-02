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

No box is ticked. Each asks for a person's walk or for a measurement in a foreground window on the Mac, and neither has happened. Under each box, "Scripted" says what a script has shown in the Linux box, and "Owed" says what only a person or the Mac can show. The scripted evidence is from the verification pass of 2026-10-02 at `18f5405`.

- [ ] TST-0064 is walked with real full-size data, a long note, shared neighbours, a changed result, an old saved desk and a narrow window.
  - Scripted: the walk `glass-arrangements` drove the same route on a copy of this repository's notes and held 59 of 59 checks ([[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]]). A script is not a person's walk.
  - Owed: the walk. Nobody has walked [[TST-0064-Glass-Collections-And-Arrangements-Stay-Exact]] and the ledger holds no verdict for it.
- [ ] Keyboard-only, reduced motion, overlap, scroll boundaries and the served read-only host are exercised with dated artifacts and no invented verdict.
  - Scripted: the walk showed, withdrew, applied and undid Read with the keyboard alone, and applied it with reduced motion emulated. It reached Compare and Show related with Tab from Read, showed each with Enter and withdrew each with Escape, with nothing moved. In a window 1060 px wide the preview of Compare said "overlap by 164 px", the two documents overlapped by 164 px at their own sizes, and pressing the one behind brought it to the front. The wheel went on to the last row of cards and stopped there, and turning it further neither zoomed nor turned the field. The served page was read in a second Electron window with no preload bridge and offered no arrangement and no change of form. The record and 14 pictures are dated 2026-10-02.
  - Owed: a person's pass over the same things (TST-0064, steps 9 and 10). Compare and Show related applied from a start on the keyboard: where the walk applies them it starts them with the pointer. A real tablet for the served page.
- [ ] Foreground measurements record build/fixture/input/window provenance, reachable and drawn counts, frame cadence, script/render cost, stalls, memory and interaction response.
  - Scripted: [[TST-0072-Glass-Is-Measured-At-The-Size-Of-A-Real-Workspace]] holds the container's figures for Your Trainer (1393 notes in the view) and for this repository (144), each with its build, window and counts. They now include a turn of the field after Read, after Compare and after Show related was applied. On Your Trainer the script work per frame in those three turns was 3.0 to 3.1 ms at the median and 6.1 to 8.8 ms at the 95th percentile, against a frame of 16.7 ms. The container draws in software, so its time between frames says nothing about the Mac.
  - Owed: the measurement in a foreground window on the Mac. It has not been run, because a window on the Mac takes the keyboard from the person working there.
- [ ] Before/after observations record find/compare/follow-source/return completion, mistakes and lost context; source-file state confirms arrangements do not write notes.
  - Scripted, for the second half only: the walk ticked one criterion through the sidecar, applied an arrangement and undid it, and the file still held the tick. The scale walk on this repository records that the workspace it read was unchanged. The scale walk on Your Trainer reads a copy made in the box from a read-only mount, and its record holds no answer for that check; `git status` in Your Trainer was empty after the pass.
  - Owed: the observations. They are a person's, and a script has none.
- [ ] Acceptance failures and performance limits are recorded and fixed or explicitly scoped; membership is never capped to improve timings.
  - Scripted: what the walk and the review found is recorded in TST-0071 and TST-0070: two faults the walk found while it was written, the defects the independent review found, each fixed, and one step that failed once, has not failed since and is not explained. The limits the container showed are in TST-0072. On membership, the scale walk's check "as cards, the collection counts every member and draws only the rows in view" held with 1393 members and 12 drawn at once, and End reached the last one.
  - Owed: an acceptance walk to have failures from, and the Mac's figures to have limits from.

## Steps

- [ ] Read the feature, requirement and design, including state ownership and recovery rules.
- [ ] Implement this task's behavior and meaningful checks against its definition of done. The scripted part exists: the walk `desktop/demos/glass-arrangements.cjs` and the Cards part of `desktop/demos/glass-scale.cjs` (commit `b017807`), and the turns after each arrangement in `glass-scale.cjs` (commit `c5af79f`).
- [ ] Record evidence and reconcile affected documentation before closing.

## Notes

The task is `doing`: the scripted walks it names have run, and everything it asks of a person is still owed. Two things are needed to close it. Edwin, or whoever they name, walks TST-0064 on a disposable real workspace and records the verdict in the release ledger. And `glass-scale.cjs` is run in a foreground window on the Mac when it may take the keyboard for about a minute (TST-0072, Procedure, step 4).

After the first close-out three things were named here as missing from the scripted half: two compared documents that overlap on screen, the wheel turned to the last row of cards, and a turn measured after an arrangement. Commit `c5af79f` added all three to the walks, and each ran in the pass at `18f5405`. No box was ticked for them, because each box also asks for a person or for the Mac.

The independent review of 2026-10-02 found one check in the walk that could not fail, and things the walk did not reach (FEAT-0022, Review). The walk was changed in commits `e3f1460`, `2b5d578` and `e158c73`, and [[TST-0071-Collection-Forms-And-Arrangements-Are-Walked-With-A-Real-Pointer]] says what the added checks saw. The scripted figures above are from the pass at `18f5405`, which was run after those changes.
