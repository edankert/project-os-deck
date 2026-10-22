---
type: "[[task]]"
id: TASK-0185
title: "The ring can be grouped by feature, still opening by phase, with the choice remembered and named in the address"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Build the DES-0005 into the deck'"]
parent: "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"
effort: M
due: ""
depends: ["[[TASK-0182]]"]
blocks: ["[[TASK-0186]]"]
related: ["[[TASK-0177]]", "[[TASK-0166]]"]
tests: ["[[TST-0102]]", "[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]"]
---

# The ring can be grouped by feature

**A switch in the overview's header regroups the towers ring: by phase, as now, or by feature, with each unfinished feature as one segment holding all its tickets.**

## Definition of Done

- [x] By feature, each unfinished feature is a segment with its tickets as one tower, whatever phase they are in, and the feature in focus faces you. Finished features stand on the shelf; tickets of no feature lie in the core. Segment names are smaller than a phase's.
- [x] The ring opens by phase. The switch changes it, and Deck remembers the choice on that machine the way it remembers the colouring. An address that names a grouping wins over the remembered choice, and the address restores it.
- [x] Selection, search, the next-up board and the needs-you panel work the same in both groupings.
- [x] Every ticket is drawn exactly once in both groupings, on Deck and on your-trainer ([[TST-0102]] and TST-0090's checks).

## Notes

Edwin did not say which grouping the ring should open in; by phase is kept as the page does it (FEAT-0031, "Decisions taken in planning"). Bringing a segment close by feature opens that feature, not a phase; what the collar of exit criteria shows there is decided in the build and stated in this note.

## What was built (2026-10-22)

- **A switch under the corner's buttons, "By phase" or "By feature"**, shown on the wheel (`desktop/src/renderer/overview.ts`). The ring opens by phase. The address names the other grouping as `group=feature`, which the grammar accepts only with `page=wheel`. Deck remembers the last choice on this machine and opens the wheel in it when no address names one, as it does the colouring; an address that names a grouping wins.
- **By feature** (`byFeature` in `desktop/src/shared/overview-towers.ts`), each unfinished feature is a segment holding one tower of all its tickets, whatever phase they are filed in. Finished and dropped features stand on the shelf, and tickets of no feature lie in the core. The feature in focus faces you. Only where things stand changes: the card still says each ticket's own phase.
- **The decisions this note left to the build.** A feature has no exit criteria, so a feature's segment has no collar. Pressing a segment selects its feature on the ring rather than bringing it close, because Deck's phase screen is a phase's. The card's Its phase button brings the phase its feature is filed in close, by phase. A phase screen is always by phase, and its way back returns to the wheel in the grouping it came from.
- **Names.** In 3D a segment is named by its id and two words of its title, smaller than a phase's name. In the flat plan it is named by its id alone, which is not counted as words, so your-trainer's 51 segments keep the screen within 60 words at rest.
- Selection, search, the next-up board, what needs you and the weeks work the same in both groupings; every wheel address keeps the grouping.
- [[TST-0102]] has 48 checks now. By feature, every ticket stands once on both fixtures, and each feature's tower holds exactly its tickets. Deck's ring has 15 features and 143 tickets in its core; your-trainer's has 51 and 1,515. DES-0005's text says 147 and 1,520, written before TASK-0179 stood four designs on each workspace with their features. The page's data now agrees with Deck except for your-trainer's ACCEPTANCE-TESTS-V2-1-0, whose id the page cannot read; the model has its feature, FEAT-0096.
- **Checked in the real Deck**, in the container: the switch grouped the ring by feature and the address said so; 17 unfinished features stood as segments with FEAT-0031 facing you; TASK-0185 selected drew its 8 curves; hiding the overview and opening the wheel again opened it by feature; the switch put it back by phase. The towers walk held 32 of 32.
