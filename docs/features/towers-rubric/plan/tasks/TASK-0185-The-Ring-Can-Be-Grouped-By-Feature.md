---
type: "[[task]]"
id: TASK-0185
title: "The ring can be grouped by feature, still opening by phase, with the choice remembered and named in the address"
status: backlog
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

- [ ] By feature, each unfinished feature is a segment with its tickets as one tower, whatever phase they are in, and the feature in focus faces you. Finished features stand on the shelf; tickets of no feature lie in the core. Segment names are smaller than a phase's.
- [ ] The ring opens by phase. The switch changes it, and Deck remembers the choice on that machine the way it remembers the colouring. An address that names a grouping wins over the remembered choice, and the address restores it.
- [ ] Selection, search, the next-up board and the needs-you panel work the same in both groupings.
- [ ] Every ticket is drawn exactly once in both groupings, on Deck and on your-trainer ([[TST-0102]] and TST-0090's checks).

## Notes

Edwin did not say which grouping the ring should open in; by phase is kept as the page does it (FEAT-0031, "Decisions taken in planning"). Bringing a segment close by feature opens that feature, not a phase; what the collar of exit criteria shows there is decided in the build and stated in this note.
