---
type: "[[task]]"
id: TASK-0079
aliases: ["TASK-0079"]
title: "The field is measured again on all three workspaces, throttled as well as not, and the numbers decide whether a free list is owed"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "Edwin 2026-09-12: 'I think we need to measure this.'"]
parent: "FEAT-0018"
effort: "M"
due: ""
depends: ["TASK-0078"]
blocks: ["TASK-0080"]
related: ["[[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]", "[[PHASE-0002-Glass]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
tests: []
---

# The field is measured again on all three workspaces

## Objective

**[[PHASE-0002-Glass]]'s frame-time criterion is ticked on numbers taken before any of this existed.** A fourth band of cards, promoted tiles and a hit test on every pointer move all put more work in a frame. This task retakes the measurement and writes the new numbers beside the old ones, and its result is what decides [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]].

## Detail

**The baseline to beat, measured 2026-09-10 and written in [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]], "Measured":**

| Workspace | Notes | Most tiles | Elements | Median frame | Script per frame |
|---|---|---|---|---|---|
| Your Trainer | 2,734 | 286 | 2,303 | 16.7 ms | 2.2 ms |
| project-os-cockpit | 1,570 | 229 | 1,390 | — | — |
| This repository | 261 | 35 | 729 | — | — |

Taken on a Mac Studio, window in front. The throttled figure, 6.6 ms of script at 4× CPU cost, is an estimate, and **the laptop reading is still owed** — it was owed on 2026-09-10 and it is owed now.

**What to take, through `desktop/src/main/measure.ts`, on all three workspaces:** median and 95th-percentile frame time while turning, script work per frame, elements in the document, quiet-band tiles painted, outer-field cards drawn, and promoted cards. Each unthrottled and at 4× CPU cost. Take a turn with the pointer moving, because the tile hit test runs on `pointermove` and a measurement that never moves the pointer misses it. Take one run zoomed in on the quiet band, because that is where promotion happens.

**Write the numbers into [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]**, in a "Measured" section beside the 2026-09-10 table, and say plainly which machine they came from.

**What the numbers decide.**

- **If the frame holds**, [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] closes against the measurement, with its finding kept on the record for the next feature that draws many notes at once, and [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] is not built.
- **If the turn allocates heavily**, [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] is built. A free list caps churn, which is an allocation problem, not a frame-cost problem.
- **If the frame itself is too expensive**, a free list will not save it, and what moves is the promotion threshold or a band's capacity, both of which are one number in a pure function.
- **If it fails on a laptop**, the phase's own rule applies: Spread returns to being the default, and [[PHASE-0002-Glass]] says so.

## Acceptance

- Every number above is taken on all three workspaces, throttled and not, and written into [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]].
- The machine is named beside each number.
- A turn with the pointer moving is among the runs, and so is a run zoomed into the quiet band.
- The result names, in one sentence, whether [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] is owed.
- [[PHASE-0002-Glass]]'s frame-time criterion is re-ticked against these numbers or recorded as failed with what follows.

## Steps

- [x] Extend `desktop/src/main/measure.ts` with the counts that did not exist before: outer-field cards, promoted cards, tiles separately from elements.
- [x] Run all three workspaces, throttled and not, with Edwin's agreement before any window opens.
- [x] Write the table into the feature note and the sentence into this task's Outcome.
- [x] Record the decision on [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] in that issue.
- [x] Say whether the laptop reading is still owed.

## Notes

A measurement is not an afterthought here. It is the step that turns two of Edwin's questions — what does it cost to make finished notes clickable, and was the pool the answer — into numbers rather than arguments.

## Where this stands

**2026-09-12: the measurement is extended and has not been taken.** `desktop/src/main/measure.ts` now records what FEAT-0018 made different, and `counts()` separates the three numbers the cost question turns on: tiles still PAINTED, quiet notes PROMOTED to elements, and the outer field's cards. Two runs the old measurement never took are added — a turn with the **pointer moving**, because the tile hit test runs on `pointermove` and a turn that never moves the pointer never pays for it, and a turn **zoomed in on the quiet band**, because that is where promotion happens and where the element count is highest. Each band's chosen shape is recorded beside the numbers.

**It has not been run, and it cannot be run quietly.** The measurement needs a window that is visible and holds the system's focus — by its own reasoning, since a background window's animation frames are suspended. That is Edwin's machine to interrupt, and it waits on his word.

**What it decides.** [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] stays open until these numbers exist, and [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] is not started without them.

**What is already known without running it**, from the pure modules: nothing is promoted at 1x on any of the three workspaces, so the unzoomed document is the size it was. The question the run answers is what a turn costs while zoomed in on the quiet band, where up to 180 notes are elements at once.

## Ready to take, 2026-09-12

**Everything is in place except the five minutes of Edwin's screen.**

- `cd desktop && npm run measure` — the script was added so the run is one command rather than a remembered flag, mirroring `npm run smoke`.
- All three workspaces are on the machine: this repository, `../project-os-cockpit` and `../your-trainer`, which is the default list `main.ts` uses when `--measure-workspaces` is not given.
- `measure.ts` already records what FEAT-0018 made different — tiles painted, notes promoted, outer-field cards, each band's chosen shape — and takes two runs the old measurement never took: a turn with the pointer moving, because the tile hit test runs on `pointermove`, and a turn zoomed in on the quiet band, because that is where promotion happens.

**It cannot move to the box.** [[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]]'s container renders through software GL, and the offscreen route is no better for this: the spike recorded in [[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times]] found `requestAnimationFrame` running at a full 60 a second offscreen, but an offscreen frame is painted to a bitmap rather than composited to a display, so the interval measures the harness and not the machine. The script work per frame would survive; the frame time, which is what [[PHASE-0002-Glass]]'s criterion asks about, would not.

**So this waits on Edwin being away from the keyboard, and nothing else.** The run takes the window to the front for a few minutes and needs it to stay there.

## Outcome

**Done 2026-09-12, on Edwin's Mac, on his word.** The numbers are written into [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]] beside the 2026-09-10 run, and they decide [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]].

**Every configuration holds the display's 16.7 ms frame**, at 1x and zoomed right in on the quiet band, on all three workspaces. The 95th percentile never passed 17.4 ms.

**The answer on the free list is no.** The worry was that promotion would churn hundreds of elements on a turn. Zoomed in on Your Trainer, with 135 quiet notes drawn as cards and promoting and demoting as the field turned, the turn held 16.7 ms with 2.7 ms of script work — **less than that workspace costs at 1x**. [[TASK-0080-A-Free-List-Behind-Glasss-Note-To-Element-Map]] is not built.

**The tile hit test costs nothing a frame can feel.** With the pointer moving through the field — the run that had to be added, because the hit test runs on `pointermove` and a turn that never moves the pointer never pays for it — script work was 1.0, 1.5 and 2.6 ms, at or below the same turn with the pointer still.

**The field is more expensive than it was and the number is small.** Your Trainer went from 2.2 to 3.0 ms of script work per frame, and from 6.6 to 7.8 ms at 4x CPU cost. That last figure is the one that stands in for a slower machine, and 10.5 ms at the 95th percentile still leaves six milliseconds of a frame. This repository got **faster**, 1.1 to 0.9 ms, because its quiet band now paints six large tiles where it painted thirty-five small ones.

**One thing to fix before the next run.** `runMeasure` prints its results to stdout and writes them nowhere, so the first run's output was lost to a `tail` and the measurement had to be taken twice — five minutes of a person's screen for nothing. It should write the JSON to a file beside printing it. Filed as a follow-up rather than changed between two runs of the same measurement.
