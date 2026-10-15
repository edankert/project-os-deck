---
type: "[[task]]"
id: TASK-0152
aliases: ["TASK-0152"]
title: "The wheel shows its way into re-phasing and the release test, as labelled buttons"
status: done
parent: "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15, after being told the middle of the wheel opens re-phasing: 'there is no callout in the middle of the wheel and nothing happens when pressing. Also the S6 rings I don't seem to be able to see either'"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]", "[[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0129]]", "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
---

# The wheel shows its way into re-phasing and the release test

## Problem

**Edwin could not open re-phasing (S4) or the release test (S6) from the wheel.** Both are only reachable in ways nobody can see.

- **Re-phasing.** The core of the wheel was meant to open it. But the middle of the core (inside radius 30) is empty, so pointing there shows nothing and pressing does nothing. The core's rings are covered by ticket wedges, and pressing a wedge opens that ticket. The only way left is the list twin (L).
- **The release test.** Only the red badge on a finished phase's disc opens it. Deck has no finished phase, so Deck's wheel has no way in at all. On your-trainer the badges are small and say nothing at rest.

## Definition of Done

- [x] The middle of the wheel is a labelled button: the number of tickets with no phase, the words "no phase", and a callout. Pressing it, or Enter on it, opens re-phasing. Its number has its own mark, as the look requires.
- [x] The wheel has a labelled "Release test" button on both workspaces, which opens S6. On Deck, S6 says there is no release yet.
- [x] Both are in the list twin, so the keyboard and a screen reader reach them.
- [x] The words at rest stay within sixty on both workspaces.
- [x] TST-0090 checks that both buttons are drawn, with their addresses, on both fixtures. The window run (TST-0093) presses both on each workspace and lands on S4 and S6. `cd desktop && npm test` passes.
- [x] DES-0005's S1 text says where the two ways in are, and its plates are redrawn.

## Verification

The middle of the wheel is a button (the core's rings now start at radius 50) with the number of tickets that have no phase, "no phase" under it and a callout; it opens re-phasing. A "Release test" button under the workspace's name opens S6. Both are in the list twin. TST-0090 checks both buttons, their addresses and the count on both fixtures; the words at rest are 16 on Deck and 42 on your-trainer, within sixty. The window run (TST-0093) pressed both with a real pointer on Deck and on your-trainer on 2026-10-15 and landed on S4 and S6. DES-0005's S1 text and plates are updated.

## Notes

A defect in code this feature changed, fixed in it (`QUALITY.md`). The shelf badges stay: they say how many acceptance tests a finished phase owes, which the new button does not.
