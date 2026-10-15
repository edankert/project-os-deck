---
type: "[[task]]"
id: TASK-0145
title: "Every overview screen marks a ticket in the cockpit's type colour and state fill, and the wheel can be drawn either way"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'the colours would be good to use the same colours for the different tickets throughout (same as in the cockpit) and use the same way to show the status as is used in the overview page, closed, semi closed, open, flashing, strikethrough and red dots for something needing attention? (maybe this doesn't work but let's try for a start)'", "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"]
parent: "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
effort: M
due: ""
depends: ["[[TASK-0144]]"]
blocks: ["[[TASK-0147]]", "[[TASK-0148]]", "[[TASK-0149]]", "[[TASK-0150]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[DES-0004-The-Phase-Overview]]", "[[REFERENCE-COCKPIT-ADOPTION]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]", "[[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]]"]
---

# Every overview screen marks a ticket in the cockpit's type colour and state fill

**A ticket looks the same on every overview screen and in the cockpit: its colour says its type, and how its mark is filled says its state.** One shared module draws the mark, and every screen uses it.

- **Colour is type.** The cockpit's `--type-*` tokens, light and dark (`../project-os-cockpit/src/project_os_cockpit/static/cockpit.css`, lines 11 to 40).
- **Fill is state**, the cockpit's marks from its DES-0004 (`../project-os-cockpit/desktop/src/renderer/renderer.css`, about lines 2700 to 2800). Filled is done. Hollow is not started. Inverted and pulsing is in progress. Inverted and still is "complete, not proven". Solid with a slit is "resolved, nothing delivered". Hollow with a strike is "parked". A dot in the corner, one hue for every type, is "needs you".
- **Words are the cockpit's.** A callout or row says "in progress", "complete, not proven", "parked", "needs you", never Deck's "owed again".

## Definition of Done
- [ ] One shared module draws a ticket's mark from its kind, `fill` and `needsYou` (TASK-0144), with the cockpit's colours in both themes; S1 to S7 use it and no screen draws a ticket mark of its own.
- [ ] The wheel draws in two colourings, switched by one control and kept in its address: by state (as now) and by type with fills. The green progress arc outside a sector is drawn in both. Which one Deck opens on is Edwin's choice; until he makes it, it opens in the state colouring.
- [ ] The pulse stops under reduced motion and the in-progress mark is still told apart from "complete, not proven" without it.
- [ ] "Owed again" no longer appears on any screen or callout; the cockpit's word replaces it.
- [ ] TST-0090 checks, on both fixtures, that every drawn ticket mark has its type's colour and its ticket's fill and dot. `cd desktop && npm test` passes.
- [ ] The adoption table records what was taken from the cockpit's overview marks (`shell.pages.overview`), dated.

## Steps
- [ ] Copy the type tokens and the mark shapes into one Deck module, citing the cockpit lines they came from.
- [ ] Replace each screen's own ticket glyph with it; keep the scene's list twin rows in step.
- [ ] Add the wheel's colouring switch and its address parameter.
- [ ] Extend TST-0090; run the window run (TST-0093) once for the lane, with Edwin's go-ahead.

## Notes

Claude lane. Depends on TASK-0144 for `fill` and `needsYou`. Codex's TASK-0149 and Claude's TASK-0147 and TASK-0148 use the module this task writes.

Assumption: where a screen keeps a glyph rather than a row (the wheel's wedges, S4's particles), the shape still says the kind as DES-0005 has it; the colour and fill change. If Edwin wants every mark to be the cockpit's square instead, that is a change to this task.

The cockpit's register has no key for its type colours on their own; they arrive with `shell.pages.overview`. If that row does not describe them well enough to adopt, an issue is filed in the cockpit, as CLAUDE.md asks.
