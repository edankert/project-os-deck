---
type: "[[task]]"
id: TASK-0167
title: "Deck draws the towers in 3D with three.js, loaded from its own build, with the orbit camera, callouts, presses and a flat plan when WebGL is missing"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16, after turning DES-0005-towers.html: 'I like the design page, please implement as suggested. However can you please come up with a different design for the exit criteria? Also, what is the red rectangle on-top of the tower, I assume this highlights issues that \"needs me\", should this be selectable?'"]
parent: "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
effort: L
due: ""
depends: ["[[TASK-0166]]"]
blocks: ["[[TASK-0169]]"]
related: ["[[TASK-0162]]", "[[TASK-0163]]", "[[RISK-0010]]"]
tests: ["[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]"]
---

# Deck draws the towers in 3D with three.js

**The overview's wheel and phase screens are drawn by three.js inside Deck.** three.js 0.160.0 is installed as a dependency and copied into Deck's own build, so the page still loads code only from its own origin; an import map names it, and the page's content policy allows that map by its hash. The new dependency is [[RISK-0010]].

## Definition of Done

- [x] `three` is a dependency at 0.160.0 with its types; `npm run build` copies `three.module.min.js` into `dist/web/vendor/` and writes the import map's hash into the page's content policy. The window still refuses scripts from anywhere else.
- [x] `desktop/src/renderer/overview-towers-view.ts` draws the layout: the marks, the beam, the caps, the band, the labels; points at anything with the overview's callout; presses go to the layout's addresses; the caps open what needs you.
- [x] The camera turns as TASK-0162 settled (the near edge follows the hand), pans, zooms, and Home and the three views work on it, as do Escape, Home and 0.
- [x] Reduced motion stops the pulse and the glides. With no WebGL, the flat plan is drawn instead and says so.
- [ ] The served host (a tablet) draws the same, read-only.

## Verification

`three@0.160.0` is a dependency and `@types/three@0.160.0` a dev dependency; `desktop/scripts/copy-assets.mjs` copies `three.module.min.js` to `dist/web/vendor/` and refuses a build whose import map and content policy hash disagree. `desktop/src/renderer/overview-towers-view.ts` draws the layout; `desktop/src/renderer/overview.ts` puts its canvas under the scene's controls, hides the flat plan, routes Home, the views, the keys and the wheel to it, shows its callouts and follows its presses, and outlines a floor when a row of the phase list is pointed at. In a hidden window over Deck's own build on 2026-10-16, on both fixtures, with no page errors: pointing at the next ticket named it and pressing it gave its ticket screen's address; a middle-button drag to the right turned the ring the hand's way; Home put it back; pressing the core gave re-phasing; opening a phase and going back moved the camera. Still owed: the window run in Deck itself (TST-0093, its driver updated in TASK-0169), and the served host on a tablet.
