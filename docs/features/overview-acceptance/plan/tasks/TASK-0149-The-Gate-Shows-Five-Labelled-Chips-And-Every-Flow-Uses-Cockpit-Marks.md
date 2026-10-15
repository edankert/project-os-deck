---
type: "[[task]]"
id: TASK-0149
title: "The feature gate shows five labelled chips of cockpit marks, and the design and release-test screens use the same marks"
status: done
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
- [x] One chip component: a label, a count drawn as marks, and the gate rule TASK-0143 wrote (a known empty chip is hollow and says "nothing to check"; an unknown one says why it is unknown). It no longer uses Deck's violet "owed again" centre for unknown.
- [x] S7 draws its gate as the five chips. Accept and Send back keep their current rules.
- [x] S5 and S6 draw ticket marks with the shared module and use the cockpit's words.
- [x] TST-0085 checks the chips' counts against the gate's items on both fixtures, and that no flow screen uses "owed again".
- [x] TST-0100's title and steps say "chips" for "lamps"; TST-0088 and TST-0089 are checked against the new marks and changed where they name a colour or a word that has gone.
- [x] `cd desktop && npm test` passes.

## Steps
- [x] Write the chip in `desktop/src/shared/overview-flows.ts` (or a module beside it) and export it for S3.
- [x] Change S7, then S5 and S6.
- [x] Update the three acceptance test notes and TST-0085.

## Notes

Codex lane. TASK-0144 supplies the fields, and Claude’s shared mark module at `f003195` draws them.

S6’s beads use the cockpit’s release-result words and acceptance glyphs. They carry no ticket identity or ticket fill. The open check’s test notes appear separately as cockpit squares, and the list twin includes every referenced test note that the model knows.

Preflight, 2026-10-15: the model port and regenerated fixtures are committed (`96955cc`, `619361c`). The shared mark module is available at the branch base. This task adds per-item gate evidence, keeps the readiness and write rules, and uses the cockpit's result glyphs and words for S6 checks. No new runtime dependency, configuration, path or write boundary is introduced. Existing RISK-0009 still covers the sidecar's evidence limits.

## Verification

2026-10-15: `cd desktop && npm test` passes 764 tests, with no failures or skips. The flow scene suite passes 20 tests, the screen suite 14, and the flow write suite 19. Both workspaces pass the four scene rules. S5 uses 9 words at rest and S7 uses 30; Your Trainer’s S6 uses at most 50 with More open.

The chip tests cover all five labels, both sizes, one square per item, separate marks for both counts, the exact model fill and attention dot, neutral unknown framing and list twins. Removing an item square fails both fixture tests. Replacing the Blocked glyph with Pass fails the result test. The original code was restored after each mutation.

Headless SVG rasters of S5, S6 and S7 on both workspaces were inspected, along with the compact chips. No Electron window opened. TST-0100 now says chips; TST-0088 and TST-0089 describe the ticket and result marks. Those acceptance checks remain unrun by Edwin and have no verdict to invalidate.

The new export is `gateChips(data, x, y, width, { compact: true })`, returning `nodes` and `rows`. Claude’s S3 must append both. The old `gateNodes` wrapper keeps the pre-TASK-0148 screen building and omits duplicate ticket identity from its small echoes, since that screen already draws each neighbour. Claude can remove the wrapper with that old caller. Official plates and the window run remain TASK-0150 and the drawing lane’s work.
