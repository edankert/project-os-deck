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

- [ ] `three` is a dependency at 0.160.0 with its types; `npm run build` copies `three.module.min.js` into `dist/web/vendor/` and writes the import map's hash into the page's content policy. The window still refuses scripts from anywhere else.
- [ ] `desktop/src/renderer/overview-towers-view.ts` draws the layout: the marks, the beam, the caps, the band, the labels; points at anything with the overview's callout; presses go to the layout's addresses; the caps open what needs you.
- [ ] The camera turns as TASK-0162 settled (the near edge follows the hand), pans, zooms, and Home and the three views work on it, as do Escape, Home and 0.
- [ ] Reduced motion stops the pulse and the glides. With no WebGL, the flat plan is drawn instead and says so.
- [ ] The served host (a tablet) draws the same, read-only.

## Verification
