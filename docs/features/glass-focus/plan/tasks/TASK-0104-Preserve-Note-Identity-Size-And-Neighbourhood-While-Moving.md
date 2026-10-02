---
type: "[[task]]"
id: TASK-0104
title: "Preserve note identity, chosen size and neighbourhood while moving"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-02
source: ["Edwin: This sounds great update the documents to support this fully.", "[[ISS-0070]]", "[[ISS-0071]]", "[[ISS-0072]]", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
parent: "[[FEAT-0017]]"
effort: large
due: ""
depends: []
blocks: ["[[TASK-0098]]", "[[TASK-0099]]"]
related: ["[[DES-0003]]", "[[FEAT-0020]]", "[[ISS-0070]]", "[[ISS-0071]]", "[[ISS-0072]]", "[[RISK-0007]]"]
tests: ["[[TST-0052]]", "[[TST-0045]]", "[[TST-0051]]", "[[TST-0065]]"]
---

# Keep one note and its neighbourhood intact

A note opened in Glass is now drawn once, at the size the person chose, and dragging it carries the cards gathered round it. The repair is committed. One box below is still open, the rendering cost on the Mac, so this task stays `doing`. TST-0052, the walk a person makes, has not been walked.

## Definition of Done

- [x] A spatial note has one visible card or document per desk while focused. Related notes move from their actual cards; no duplicate or empty ghost remains. Reference rows may still identify the note. Shown by the `focus` part of the smoke run (47 checks, none failed, at `4243fc2`): "one note is one object: no card is drawn for the open note (0), no note is drawn twice (none), and there is no ghost (0), no copy on a ring (0) and no "+N more" (0)", and "every neighbour is seated round the document, each once" (16 of 16 for ISS-0070, 217 of 217 for PHASE-0002). The `glass-desktop` walk's check "the open note is one object: no card is drawn for it and no neighbour is drawn twice" held too.
- [x] Opening respects the person's reading size. Dragging a document never changes its size. Resizing remains available deliberately. A note's own saved size wins, then the size last chosen on that view, then the first-use size of 560 by 520. Explicit resizing updates the note and the view's size; moving or a temporary narrow layout never overwrites them. Older state without the preference loads safely, and the size is kept in the one store every window reads. This box said "calibrated first-use default": 560 by 520 is a trial value taken from DES-0003's line length, and its calibration is TASK-0097's. Shown by the `reading-size` suite (14 tests, inside `npm test`, 586 of 586 at `9379a0c`), by the smoke run's `focus` check "the document is 560 by 520 to the pixel when opened, while dragged, after the drag, out of focus and in focus again", by its corner and Alt-arrow checks ("the view remembers that size (600 by 550)"), and by the `glass-desktop` walk's checks that a narrow window stores a reading size and that each document is back at its size when the window is wide again. Not shown in a window: no run opened a note in a second window on the same view to see it take the view's size. The suite checks that rule in the store, and step 9 of TST-0052 asks a person to look.
- [x] Dragging the focused document preserves focus and moves its neighbourhood with its relative order intact. A larger-than-window arrangement keeps off-screen notes reachable through a named locate action and the complete relationship list. Shown by the smoke run's `focus` checks: "a drag of its header moves the document 90 by 50 in the store … keeps the focus … and changes no size", "every seated card keeps its place beside the document through the drag (16 cards; none shifted)", "seats run past the field's edges, and a counter at each edge says how many cards stand wholly beyond it (left 96, right 119)", "the document's list has one row for each of its 217 neighbours", "a row's "show where it is" brings TST-0079, which was beyond the left edge, wholly into the field" and ""find" brings the desk back".
- [x] Shared neighbours and already held notes reuse their existing spatial object. Closing or changing focus restores surviving objects without a full unexplained re-deal. Shown by the smoke run's `lift` check "a note joined to both documents is one card with a second line from ISS-0070 (10 second lines for 10 shared notes, 0 notes drawn twice), and ISS-0070, already a document, has 1 line to its document and 0 cards", and by its `focus` check "leaving the focus deals nothing and turns nothing: all 5 cards drawn before the note was opened are back exactly where they stood". The `glass-desktop` walk compared 24 cards after Escape and none had strayed, and the `glass-scale` walks' check "a note joined to more than one open note is one card, not one per document" held on this repository and on Your Trainer.
- [x] Real pointer and keyboard checks cover repeated focus, interrupted drag, resize, view return and reduced motion in Glass, and the focus behaviour the orbit shares. Shown by the smoke run's `focus` part: Enter on the header makes the note the focus again; "Escape during a drag puts the document back where it was"; the corner and Alt with an arrow resize it; "Hide notes, W, ×, a view switch and a surface switch each leave the focus", and the `desks` part finds a note back where it was on returning to its view; "under reduced motion the document is in place at once … and 16 of 16 cards" are marked; and in the orbit a click on a dot opens the note as one object with its 27 neighbours seated, the orbit holds still for six seconds, and after Escape 0 of 111 dots had moved. Not driven in the orbit: a drag and a resize of the document. Step 8 of TST-0052 asks a person for those.
- [x] Existing focus geometry, smoke and walk assertions that require a ghost, sixteen tiny copies or drag-to-exit are reconciled with the repaired contract, and the regression results are recorded. The geometry suite `focus-ring` was rewritten for seats in `81d4632` (15 tests). The smoke run's `focus` part was rewritten in `6be167a`, and it now fails if a ghost, a ring copy, a "+N more" card or a docked header is on the page, or if a drag of the header leaves the focus. TST-0052's steps were rewritten on 2026-10-01. Regression results are under Verification below. This box and the next were one box; they are split because only the next one is open.
- [ ] The rendering cost of the gathered neighbourhood is recorded on the Mac, in a foreground window.
  Missing: no measurement has been made on the Mac since this repair, because a Deck window there takes the keyboard from the person working. What exists was timed in the Linux container, which draws in software. In the `glass-scale` walk at `4243fc2`, with 217 cards seated round one note of Your Trainer, the time between frames while turning was 16.7 ms at the median and 33.4 ms at the 95th percentile, and script work was 5.6 ms and 9.0 ms. On this repository, with 63 seated, it was 16.7 and 16.8 ms, and 0.6 and 0.8 ms. Those numbers say nothing about the Mac. TASK-0099 also asks for a foreground measurement, with the collection and a document open.

## Steps

1. Read the three issue decisions and DES-0003. Reconcile shared identity, chosen size and group translation in the layout model together. Done in `81d4632`.
2. Implement the geometry and renderer changes with focused regression checks that fail on duplication, size jumps and dropped neighbours. Done in `81d4632` and `b2a99d6`; the checks are the two node suites and the smoke run's `focus` part.
3. Update the executable checks behind TST-0051 and TST-0045 where their previous assumptions conflict. Retain coverage for unaffected zoom, keyboard, pointer and Orbit behavior. Done in `81d4632` (the suite) and `6be167a` (the smoke run).
4. Walk TST-0052 and retain before/after captures, counts and foreground measurements. Link evidence to each issue before changing its status. **Not done as written.** TST-0052 is a person's walk and nobody has walked it; the acceptance ledger holds no verdict for it. No foreground measurement was made on the Mac. What exists instead is scripted: the counts above, the pictures the walks keep, and the container's timings. Each issue's "Fixed, 2026-10-02" section names the check that shows its defect gone.

## Boundaries

This task repairs the existing focus contract. TASK-0097 owns the new document presentation and opening calibration; TASK-0098 owns collection-to-document handoff. It adds no saved scenes, source writes or new cockpit payload. RISK-0007 tracks persisted identity and reading-size restoration. The stored shape gained one key, `readingSizes`, and the `reading-size` suite checks that a state file written before it existed still loads.

## Verification

Run on 2026-10-02 at `4243fc2` in the Linux container (the `project-os-deck-smoke` image, Electron under Xvfb, 1440 by 900), from a separate clone.

- **Node suites.** `npm test` in `desktop/`: 586 of 586 on 2026-10-02 at `9379a0c`. Between that commit and `4243fc2` the application changed by one word in a comment. `focus-ring` holds 15 tests and `reading-size` 14.
- **The smoke run.** `bash tools/scripts/smoke-in-a-box.sh both` exited 0 on loopback and then on the network. The loopback half, run again with each check printed, passed 389 checks, failed none, skipped none and reported two not applicable. Its Glass section passed 291, of which `focus` is 47, `lift` 27, `panes` 21, `zoom` 15 and `orbit` 22.
- **The walk `glass-desktop`.** 54 checks, none failed. It opens a note from a card, drags it with its neighbourhood, resizes it, turns away and finds it again.
- **The walks `glass-scale` and `glass-scale-your-trainer`.** 8 checks each, none failed. They open the most linked-to note (63 neighbours here, 217 in Your Trainer) and time a turn.
- **The walk `focus-neighbourhood`,** written for this task. The pass's summary does not list it. Its record in the clone was written at 03:42 on 2026-10-02 and it makes no pass-or-fail checks; it logs what it sees. It opened FEAT-0015: 43 neighbours, 43 cards each drawn once, no card for the held note and no ghost. A drag left the document 560 by 520 with every card at the same offset. Its next step no longer does what it was written to do: the drag meant to turn the field starts on a row of the collection, which FEAT-0020 added afterwards, and opened FEAT-0024 instead. So this record shows no turn and no "find". The script needs a new starting point for that drag.

Not done: TST-0052 has not been walked by a person. Nothing was measured on the Mac. Nothing was tried on a second display, on a tablet, with a screen reader or by touch. No check written for this repair was broken on purpose to see it fail.

## Notes

One box is open, the Mac measurement, and the task closes when it is ticked. The original sixth box asked for the rendering cost to be recorded before ISS-0070, ISS-0071 and ISS-0072 were resolved. The three issues were moved to `fixed` on 2026-10-02 all the same: each describes what is drawn, and a named check shows that defect gone. How fast it draws on the Mac stays owed here.
