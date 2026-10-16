---
type: "[[change]]"
id: CHG-20261016-The-Wheel-Is-Towers-On-A-Ring-In-3D
title: "The wheel is towers on a ring, drawn in 3D: each feature a tower of its tickets, the focus lit, the exit criteria a collar, red caps you can press, and a phase brought close in place of its web"
status: merged
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16: 'go with towers, group by phase, draw it in three.js first'", "Edwin 2026-10-16: 'I like the design page, please implement as suggested. However can you please come up with a different design for the exit criteria? Also, what is the red rectangle on-top of the tower, I assume this highlights issues that \"needs me\", should this be selectable?'"]
commit: ""
pr: ""
impacts: []
platforms: []
issues: []
features: ["[[FEAT-0025]]", "[[FEAT-0026]]", "[[FEAT-0027]]", "[[FEAT-0028]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TASK-0162]]", "[[TASK-0163]]", "[[TASK-0164]]", "[[TASK-0165]]", "[[TASK-0166]]", "[[TASK-0167]]", "[[TASK-0168]]", "[[TASK-0169]]", "[[RISK-0010]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
---

# The wheel is towers on a ring, drawn in 3D

## Summary

**Deck's overview now opens on the towers of DES-0005's towers page, drawn in 3D.** Edwin chose them from the design page and asked for them to be built as suggested.

- **The ring.** Each phase still to finish is a raised segment. Planned phases lie low and dim, active ones stand raised and lit, and the phase in focus is highest and brightest, marked ▶, and faces you as Deck opens.
- **Towers.** Each feature stands as a tower in its phase, one floor per two of its tickets, done at the bottom and what needs you on top, in the cockpit's colours and fills. Tickets no feature claims lie flat at the front; finished phases stand outside as blocks; the core holds the tickets with no phase, round the way into re-phasing.
- **What is being worked on is lit.** The feature in focus sends up a beam and its tasks at `doing` pulse; the next ticket is outlined and tagged.
- **The exit criteria are a collar** of cells round each phase's rim, lit when met, so every phase shows at rest how close it is to closing. It replaces the arch of cubes, which Edwin asked to be redesigned.
- **Red caps can be pressed.** A cap means something in that tower needs you. Pointing at it lists what and what each asks; pressing it opens the one ticket on its own screen, or with several opens the phase, whose list puts them first.
- **A phase opens as its segment brought close.** The camera flies there, the others fade, the towers show their ids, and the tickets are listed as cockpit rows: what needs you first, the feature in focus open, every other tower folded to a strip. The web is gone.
- **The camera** turns the way the hand moves, pans and zooms, and Home and the three views (from above, leaning, from the side) work on it.

## What changed for other code

- **`Ticket.feature`, `OverviewModel.focus` and `OverviewModel.next`** are new in the overview model ([[TASK-0165]]). The focus is read from the workspace's SNAPSHOT and is part of the model's cache key. Deck's fixture was rebuilt at its commit; Your Trainer's had only the new fields added (`desktop/fixtures/overview/README.md`).
- **`desktop/src/shared/overview-towers.ts`** lays the towers out and draws them flat; the wheel and phase scenes carry a new `towers` node for the 3D view. The constellation's code, `fanPlaces` among it, and the phase web are removed.
- **three.js 0.160.0 is a runtime dependency of the renderer** ([[RISK-0010]]). The build copies it to `dist/web/vendor/`; `index.html` names it in an import map, which the content policy allows by its hash. Where WebGL cannot start, the flat plan is shown and says so.
- **A folded section of a flat panel is drawn on one line**, its heading beside its strip (`desktop/src/shared/overview-panel.ts`).
- **The window-run driver** (`desktop/scripts/overview-drive.cjs`) presses through the 3D view's probe: the next ticket, a cap, a plinth and the core, and turns, zooms, pans and resets the 3D camera.

## Verification

788 node tests pass. In a hidden window over Deck's build, on both fixtures, the 3D view drew with no page errors, named and opened the next ticket, turned with a middle-button drag the hand's way, came home, opened re-phasing from the core, and flew to a phase and back. The window run TST-0093 in Deck itself, with its new towers checks, waits for Edwin's word; so do his acceptance tests.
