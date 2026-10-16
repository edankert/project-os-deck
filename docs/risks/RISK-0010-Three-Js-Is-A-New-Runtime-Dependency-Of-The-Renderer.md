---
type: "[[risk]]"
id: RISK-0010
title: "three.js is a new runtime dependency of Deck's renderer, and the wheel cannot be drawn in 3D without WebGL"
status: open
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["[[TASK-0167]]"]
likelihood: medium
impact: medium
mitigation: ["Pinned at 0.160.0 and copied into Deck's own build, so nothing loads from outside", "The scene also draws as a flat plan, used when WebGL is missing", "The node checks read the pure layout, not the 3D view"]
related: ["[[TASK-0166]]", "[[TASK-0167]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
---

# three.js is a new runtime dependency of the renderer

## Description

Deck's wheel and phase screens are drawn by three.js from TASK-0167. Three things could go wrong. A three.js upgrade could change its API or its look. A machine or a tablet without WebGL (a virtual display in CI, an old browser) could not draw the 3D view. And words drawn as textures in 3D are invisible to a screen reader and to the screen checks.

## Mitigation

- three.js is pinned at 0.160.0 in `desktop/package.json` and copied into `dist/web/vendor/` at build; the page's content policy still allows scripts only from Deck's own origin, plus the import map by its hash.
- The wheel and phase scenes also draw as a flat SVG plan from the same layout, which Deck shows when WebGL cannot start, and says so.
- The list twin, the callouts and the screen checks read the pure layout in `desktop/src/shared/overview-towers.ts`, not the 3D scene.

## Triggers

- The window run or CI smoke reports that WebGL could not start.
- A three.js version other than 0.160.0 appears in `package-lock.json`.
