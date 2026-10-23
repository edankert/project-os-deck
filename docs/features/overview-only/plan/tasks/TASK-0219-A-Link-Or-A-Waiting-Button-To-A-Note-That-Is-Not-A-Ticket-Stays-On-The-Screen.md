---
type: "[[task]]"
id: TASK-0219
aliases: ["TASK-0219"]
title: "A link or a waiting button to a note that is not a ticket stays on the screen, and an old address says only what it lost"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["FEAT-0036 review, round one, 2026-10-23: both reviewers found the ticket screen's links and its waiting button to a note that is not a ticket now dead-end on the wheel"]
parent: "[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[TASK-0214]]", "[[TASK-0216]]"]
tests: ["[[TST-0090]]"]
---

# A link to a note that is not a ticket stays on the screen

**Before this task, a ticket's link to a phase, a change note or a reference note threw the person off the ticket screen onto the wheel, with a line saying a view was gone.** So did the button on a ticket waiting on such a note. Both reviewers of FEAT-0036 found it in round one. Until 2026-10-23 those addresses opened the note in Spread; the overview still made them after Spread left.

## Definition of Done
- [ ] A link or a waiting button to a phase opens that phase's screen.
- [ ] A link to any other note that is not a ticket leaves the person where they are and says the overview has no screen for it.
- [ ] A waiting button to such a note is drawn disabled, and its words say why.
- [ ] An old address's line about what is not in this Deck appears only when the wheel opened, and an overview address that also names a desk, a panel or a surface says those parts were dropped.
- [ ] The smoke's old-address check starts from another screen, so returning to the wheel is a real result.
- [ ] Node checks cover the waiting button and the phase case, and each is shown to fail when the fix is undone.

## Verification
