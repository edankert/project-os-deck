---
type: "[[task]]"
id: TASK-0163
title: "Towers on the ring, drawn in three.js to judge: each feature a tower of its tickets inside its phase, the active work lit, and a phase opening as its segment brought close"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16: 'the current solution results in a flat disc but I would like to turn this into a more 3d disc where the different items are stacked somehow ... it might be good to group items by feature, we will want to implement either by phase or feature. I don't think the phase spider web works really. also it would be good to see the current active phases highlighted somehow and the active phase and feature/task etc ... to be highlighted even more so it is clear what is going to be worked on next.'", "Edwin 2026-10-16, choosing from the review: 'go with towers, group by phase, draw it in three.js first'"]
parent: "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"
effort: L
due: ""
depends: []
blocks: []
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0157]]", "[[TASK-0162]]", "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
tests: ["[[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]]"]
---

# Towers on the ring, drawn in three.js to judge

**This task draws the wheel as towers standing on a ring, as a design page Edwin can turn by hand, before anything goes into Deck.** Each feature stands as a tower inside its phase's segment. Each floor of a tower is one of that feature's tickets. So a tall tower is a big feature, and a solid one is far along. The work being done now is lit, so the next thing to work on can be seen from across the room.

## What the page draws

- **The ring holds the unfinished phases, grouped by phase** (Edwin chose phase; grouping by feature stays a possible switch for later). Finished phases sit low on a shelf behind the ring, and the core in the middle holds the tickets with no phase.
- **A tower per feature, inside its phase's segment.** Its floors are its tickets: the feature itself at the foot, then its tasks, tests, requirements and designs. Done floors are solid at the bottom, then the ones in progress half filled, then open ones as outlines. Each floor is a cube in the cockpit's type colour with DES-0004's fill marks.
- **A red cap** on a tower when one of its tickets needs you, and the same red dot on that ticket's floor.
- **Tickets with no feature** lie flat as tiles at the foot of their phase's segment, in the same marks.
- **Four levels of emphasis.** Planned phases are low and dim. Active phases are raised and lit. The focus phase (from the workspace's SNAPSHOT) is brightest, with a "now" mark on its rim, and the page opens turned so it faces the person. The focus feature sends a beam of light up from its tower, and its tasks at `doing` pulse.
- **The next ticket** is marked "next" with an arrow: the snapshot's focus task when it names one, otherwise the focus feature's first task at `doing`, then its first at `backlog`. When there is none, the beam alone marks the feature.
- **A phase opens as its segment brought close**, in place of the phase screen's web (Edwin: "I don't think the phase spider web works"). The camera flies to the segment, the other phases fade, the phase's exit criteria stand over its towers as an arch of cells, lit when ticked, and its tickets are listed beside it as the cockpit lists them.
- **The camera turns the way TASK-0162 settles:** the near edge follows the hand, a Home button and three views (from above, leaning, from the side), and limits so the picture cannot be lost.
- Pointing at a floor names the ticket: its id, title, status, feature, and what to do when it needs you.

## Definition of Done

- [x] `desktop/scripts/overview-plates.mjs` writes `docs/designs/DES-0005-towers.html` from the same fixtures as the other plates, for Deck and your-trainer. Each ticket's feature comes from its note's `parent:` (followed through a task's parent) or from a feature's `tests:`, `implements:` and `designs:` lists. Each workspace's focus is read from its SNAPSHOT. Nothing on the page is entered by hand.
- [x] three.js is loaded on that page only, from cdnjs at the pinned version 0.160.0. Nothing is added to `desktop/package.json`, and no Deck code imports it.
- [x] TST-0094 checks that the page is written, holds every ticket of both fixtures exactly once, and loads nothing else from outside.
- [x] Pictures of the page are saved under `docs/designs/__attachments__/DES-0005/towers-*.jpg`: the opening view, from above, from the side, and a phase opened, on each workspace.
- [x] DES-0005 shows the pictures under a heading for the towers, says what they add and what building them into Deck would cost, and asks Edwin whether to build them.
- [x] `cd desktop && npm test` passes. Two independent Claude reviewers review it.

## Verification

`desktop/scripts/overview-towers.mjs`, run by the plate script, writes `docs/designs/DES-0005-towers.html`: 395 of Deck's tickets in 29 towers and 2,747 of your-trainer's in 69, each once. Which feature a ticket belongs to is read from the notes at the fixture's commit by `desktop/scripts/overview-towers-notes.mjs`; the focus from the SNAPSHOT at the same commit (Deck PHASE-0005, FEAT-0028, next TASK-0154; your-trainer PHASE-025, FEAT-0136, next TASK-1057 by the fallback, since its snapshot names no task). three.js 0.160.0 comes from cdnjs on that page only; `desktop/package.json` is unchanged. TST-0094 checks every ticket once, the ring and the shelf, a task in its parent's tower, the parsing cases on small notes, and Deck's focus against its snapshot; each guard was broken once to see it fail. `desktop/scripts/towers-capture.cjs` took the eight pictures in a hidden window with no page errors; drag, Escape, pointing and pressing were tried there with a probe the page exposes. DES-0005 has the section "Towers on the ring" and the question whether to build it. `cd desktop && npm test`: 790 tests, 790 passed. Reviewed in two rounds by two independent Claude reviewers each (FEAT-0025, Review, Third revision).
