---
type: "[[task]]"
id: TASK-0149
title: "The feature gate shows five labelled chips of cockpit marks, and the design and release-test screens use the same marks"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:codex
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'also the items above the (the solar systems) are a little strange what are they supposed to represent?'", "Edwin 2026-10-15: 'the colours would be good to use the same colours for the different tickets throughout (same as in the cockpit) and use the same way to show the status as is used in the overview page'", "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
parent: "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"
effort: M
due: ""
depends: ["[[TASK-0144]]", "[[TASK-0145]]"]
blocks: ["[[TASK-0148]]", "[[TASK-0150]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0143]]"]
tests: ["[[TST-0085-Flow-Scenes-And-Payloads-Keep-The-Recorded-Evidence]]", "[[TST-0100-Accept-A-Feature-From-Its-Five-Lamps]]", "[[TST-0088-Accept-A-Design-From-Its-Plates]]", "[[TST-0089-Run-A-Release-Test-From-Its-Captures]]"]
---

# The feature gate shows five labelled chips of cockpit marks

**S7's five round lamps become five labelled chips, each saying what it counts and showing one cockpit mark per item.** A chip reads, for example, "Requirements 0 / 8", followed by eight marks in the requirement colour, filled as the cockpit fills them. S3 shows the same chips (TASK-0148), so the component is written once, here.

S5 (a design) and S6 (a release test) change their ticket marks to the shared module from TASK-0145, and their words to the cockpit's.

## Definition of Done
- [ ] One chip component: a label, a count drawn as marks, and the gate rule TASK-0143 wrote (a known empty chip is hollow and says "nothing to check"; an unknown one says why it is unknown). It no longer uses Deck's violet "owed again" centre for unknown.
- [ ] S7 draws its gate as the five chips. Accept and Send back keep their current rules.
- [ ] S5 and S6 draw ticket marks with the shared module and use the cockpit's words.
- [ ] TST-0085 checks the chips' counts against the gate's items on both fixtures, and that no flow screen uses "owed again".
- [ ] TST-0100's title and steps say "chips" for "lamps"; TST-0088 and TST-0089 are checked against the new marks and changed where they name a colour or a word that has gone.
- [ ] `cd desktop && npm test` passes.

## Steps
- [ ] Write the chip in `desktop/src/shared/overview-flows.ts` (or a module beside it) and export it for S3.
- [ ] Change S7, then S5 and S6.
- [ ] Update the three acceptance test notes and TST-0085.

## Notes

Codex lane. Waits on TASK-0144 for `fill` and on TASK-0145 for the shared mark module, which is Claude's.

Open: S6's beads are checks in a release test, not tickets, and their colour is a result (pass, fail, blocked, and so on). Assumed: a bead keeps its result colour and takes the cockpit release test page's result dots and words, and the check's test note, when shown, takes the test type colour. If Edwin wants beads in the test type colour with fills instead, that changes this task.
