---
type: "[[task]]"
id: TASK-0034
aliases: ["TASK-0034"]
title: "The field is measured on the largest workspace, and the numbers go in the note"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-10
source: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
parent: "FEAT-0009"
effort: ""
due: ""
depends: ["TASK-0031", "TASK-0032"]
blocks: []
related: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[PHASE-0002-Glass]]", "[[REFERENCE-DES-0002-REVIEW]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The field is measured on the largest workspace

## Objective

The frame time while turning is measured on the fleet's largest workspace, Your Trainer, in a window that is in front, and the numbers are written into [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]. The choice between bound near bands over a canvas and a pooled DOM is recorded with the numbers beside it. If the numbers fail on a laptop, that is recorded too, and Spread stays the default.

## Detail

Every number DES-0002 carried about frame time was taken in a background tab, where the browser suspends animation frames, and every one was zero or invented; the note says so itself, twice. The review's finding was that no artifact ever showed a banded field at real scale. This task is the measurement the phase is judged on, and it is done on the real renderer over real notes, with the window in front.

Three numbers are written down: the median frame time while turning through the quiet band, which is the worst case because that is when the most tiles are on screen; the count of elements in the document at that moment; and the count of tiles on the canvas. They are taken on Your Trainer, about 2660 notes, and on this repository as a control. The pooled-versus-canvas choice is recorded next to them: if the hybrid holds, that is the architecture; if it does not, the pool the design proposed is the fallback and the reason is stated.

[[ADR-0002-Glass-Is-The-Main-View]] carries the consequence: Glass is the default only while the field holds a usable frame rate on a laptop. If it does not, Spread remains the default surface, the phase note records it, and Glass stays a surface a person can choose.

## Acceptance

- The feature note carries the median frame time while turning, the document element count and the canvas tile count, for Your Trainer and for this repository, each with the date and the machine.
- The measurement was taken with the window in front, and the note says how that was ensured.
- The note records which renderer the numbers were taken on and whether the hybrid is kept.
- If the frame time fails the budget on a laptop, the note and [[PHASE-0002-Glass]] both record it, and the default surface stays Spread.

## Steps

- [x] Add a frame-time meter that only records while the document is visible.
- [x] Turn through the quiet band on Your Trainer and on this repository; take the median and the two counts.
- [x] Write the numbers into the feature note with date, machine and renderer.
- [x] Record the pooled-versus-canvas decision, and the failure branch if it applies.

## Notes

A budget is a number, and this note does not invent one. The phase's exit criterion is that the numbers are written down and Edwin judges them, which is how the treatment decision in [[TASK-0005-The-Treatment-Is-Chosen-Not-Assumed]] is handled too.

## Outcome

**Done 2026-09-10.** `electron . --measure` opens each workspace in a throwaway state directory, asks macOS for the keyboard, shows and focuses the window, confirms from inside the page that it has focus, and turns the field for five seconds through the quiet band. The meter in the page records a frame only while the document is visible and has focus, and each result says whether both held; every run below held both, over about 300 frames. The numbers are written into [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]], "Measured", with the date, the machine and the renderer.

**What was learned about measuring.** The first run focused the window three seconds early and recorded no frames in two workspaces of three, because something else took focus back; focus is now taken immediately before each turn and a run that loses it is taken again. And a 60 Hz display holds every frame to 16.7 ms however little work it took, so the frame time alone shows the field keeps up but not by how much. The meter therefore also records the script's work per frame, and the turn is taken again under Chromium's CPU throttling at four times, as a stand-in for a slower machine.

**The hybrid is kept.** Bound cards for the near bands and one canvas for the quiet band held the display's rate on Your Trainer, 2,734 notes, with 2.2 ms of script work in the median frame and 6.1 ms at four times the CPU cost. No pool was needed.

**The laptop branch is not decided here.** The machine is a Mac Studio (M2 Max). [[ADR-0002-Glass-Is-The-Main-View]] asks whether Glass holds a usable frame rate on a laptop, and a desktop cannot answer that; the throttled run is an estimate, not a laptop. The same command on the laptop answers it, and [[PHASE-0002-Glass]] records that it is owed.
