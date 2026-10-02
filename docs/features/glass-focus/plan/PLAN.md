---
type: "[[plan]]"
title: "Plan — an opened note stands in the middle of its neighbours"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-10-02
source: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]"]
implements: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[DES-0002-The-Glass-Cockpit]]"]
---

# Preserve the focused document and its neighbourhood

## Delivery sequence

**The repair is built and committed, and the plan stays `active` because its feature is at `review`, not `done`.** TASK-0067 through TASK-0071 built the first implementation under the earlier contract. They are complete and are historical evidence only. [[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]] repaired the three defects Edwin reported in ISS-0070, ISS-0071 and ISS-0072: a note drawn twice, a size the person did not choose, and a drag that ended the arrangement. All three issues are `fixed`.

1. One spatial object per note, with the source slot reserved and no ghost drawn. Built in `81d4632`.
2. The chosen document size feeds the layout, the existing related cards move in a workspace larger than the window, and a drag of the document carries the group. Built in `81d4632` and `b2a99d6`.
3. Keyboard and named routes to cards out of sight, with held and shared neighbours reused. Built in the same two commits.
4. The old geometry and smoke assertions are reconciled (`81d4632`, `6be167a`), and the walk written for the repair makes checks (`f7bdd46`). The walk of TST-0052 and the performance record on the Mac, which this step also asked for, are not done.
5. Two independent reviewers read the repair on 2026-10-02 and asked for changes. A note with no size of its own changed size when another note was resized, a press on the resize corner could store a size nobody chose, the seating suite passed with four of its rules taken out, and the reading-size suite had no test of a note with no size. The fixes are the five commits merged in `0dc5708`. Round two found all six refuted claims fixed and one narrower case left, which is kept as FEAT-0017's decision 19. The verdict recorded is `changes-requested`. FEAT-0017's "Review" lists each finding and what was done.

## What is still owed

- **The rendering cost on the Mac.** It is the one open box in TASK-0104, which stays `doing`. Everything timed so far was timed in the Linux container, which draws in software.
- **A person's walk of TST-0052.** Nobody has walked it, and the acceptance ledger holds no verdict.
- **Edwin's choice about the field's edge.** A dragged document is drawn stopped at the edge, and his answer of 2026-09-12 was that nothing is clamped. ISS-0072 sets the two side by side.
- **Edwin's judgement of a note kept on every view.** With no size of its own it changes size once on a view not in front of the person. Round two of the review reported it, and FEAT-0017's decision 19 says why it is kept.
- **Edwin's judgement of one seating.** Six cards that all stood to one side of a document are seated on both sides of it. A reviewer raised it, and FEAT-0017's "Review" records it as kept.

No longer owed since the pass at `18f5405`: the three walk checks about the resize corner ran and held, and a note opened on the served page took the size chosen on its view, which ticks ISS-0071's last box.

## Dependencies

TASK-0104 precedes FEAT-0020's final integration and acceptance in TASK-0098/0099. The source remains the current context/graph routes; no new cockpit payload is needed. FEAT-0020 owns opening-motion calibration and the on-stage collection/document surface. FEAT-0022 owns explicit arrangement commands.

## Resolved choices and remaining calibration

The document's chosen size, removal of the ghost, movement of the existing cards and movement of the neighbourhood were chosen by Edwin in the linked issues. A larger workspace replaces the former requirement to fit sixteen mini cards into the viewport. The repair chose its spacing and its controls for finding a card out of sight against DES-0003, and FEAT-0017's "Decisions" records each. The first-use size of 560 by 520 and the opening times are trial values; TASK-0097 owns their calibration. Full graph expansion is outside this task.
