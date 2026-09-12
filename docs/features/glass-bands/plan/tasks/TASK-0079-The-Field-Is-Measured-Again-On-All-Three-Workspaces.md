---
type: "[[task]]"
id: TASK-0079
aliases: ["TASK-0079"]
title: "The field is measured again on all three workspaces, throttled as well as not, and the numbers decide whether a free list is owed"
status: backlog
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

- [ ] Extend `desktop/src/main/measure.ts` with the counts that did not exist before: outer-field cards, promoted cards, tiles separately from elements.
- [ ] Run all three workspaces, throttled and not, with Edwin's agreement before any window opens.
- [ ] Write the table into the feature note and the sentence into this task's Outcome.
- [ ] Record the decision on [[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] in that issue.
- [ ] Say whether the laptop reading is still owed.

## Notes

A measurement is not an afterthought here. It is the step that turns two of Edwin's questions — what does it cost to make finished notes clickable, and was the pool the answer — into numbers rather than arguments.
