---
type: "[[task]]"
id: TASK-0219
aliases: ["TASK-0219"]
title: "A link or a waiting button to a note that is not a ticket stays on the screen, and an old address says only what it lost"
status: done
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
- [x] A link or a waiting button to a phase opens that phase's screen.
- [x] A link to any other note that is not a ticket leaves the person where they are and says the overview has no screen for it.
- [x] A waiting button to such a note is drawn disabled, and its words say why.
- [x] An old address's line about what is not in this Deck appears only when the wheel opened, and an overview address that also names a desk, a panel or a surface says those parts were dropped.
- [x] The smoke's old-address check starts from another screen, so returning to the wheel is a real result.
- [x] Node checks cover the waiting button and the phase case, and each is shown to fail when the fix is undone.

## Verification

- 2026-10-23: `screenFor` in `overview-ticket.ts` decides where an address the model holds opens: a page or a flow as it is, a ticket as its screen, a phase as its screen, and anything else nowhere. The waiting button and the link follower both use it.
- `overview-screens.test.mjs` gained a check that a ticket waiting on a phase opens it, that one waiting on a change note gets no address and a button drawn off, and the rule itself. Dropping the phase case failed it, and so did giving the dead button its old address back; both restored, 33 checks pass.
- `npm test`: 537 checks, all passing.
- The container smoke, both halves, with every check printed: loopback 31 passed, the network half 41, none failed or skipped. The new check opens the re-phasing screen first, and the old Spread address then lands on the wheel with its line.
