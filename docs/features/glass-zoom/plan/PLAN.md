---
type: "[[plan]]"
title: "Plan — the mouse wheel zooms Glass and the orbit"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]"]
implements: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]"]
related: ["[[PHASE-0002-Glass]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
---

# Plan — the mouse wheel zooms Glass and the orbit

## Delivery sequence

The arithmetic comes first and is tested in node, because every drawing and every hit test in the field will go through it. Then the renderer uses it, then the smoke run drives it with a real wheel.

1. **[[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]** — `desktop/src/shared/zoom.ts`: a zoom around a point that keeps the point still, the 0.6× and 2.5× limits, the rule that keeps the zoomed field on screen, the wheel's step size for a mouse and for a pinch, the inverse for hit tests, and a function that applies the zoom to what `project()` returns. Writes `desktop/tests/zoom.test.mjs` and lands in the same commit as [[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]].
2. **[[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]]** — `desktop/src/renderer/glass.ts` applies the zoom wherever a projected position is drawn or hit-tested, maps pane rectangles back through the inverse for the obstacles, and moves covered cards once when the wheel stops. The wheel, the pinch, Shift and the wheel to turn, the three keys, the double-click, and the reading on the compass (`index.html`, `deck.css`). Amends [[FEAT-0001-The-Corpus-Has-An-Inside]] and [[PHASE-0002-Glass]]'s address line.
3. **[[TASK-0066-The-Smoke-Run-Zooms-With-A-Real-Wheel]]** — New checks in `desktop/src/main/smoke-glass.ts`, driven by `webContents.sendInputEvent` with `mouseWheel` events, each shown to fail with its fix removed, recorded in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].

## Dependencies

- **Hard:** TASK-0065 needs TASK-0064's module. TASK-0066 needs TASK-0065.
- **Downstream:** [[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]] draws the rest of the field smaller while a note is in the middle, with the transform TASK-0064 writes. It needs TASK-0064 only, not the wheel.
- **None outside this repository.** The sidecar is not asked for anything.

## Open questions

- **The step sizes.** How much one mouse-wheel notch and one pixel of pinch zoom by is chosen in TASK-0064 and written in its Outcome. The feature fixes only the range and the rule that the point under the pointer stays.
- **Whether 150 ms is the right wait before covered cards move out from under a pane.** Chosen to match a wheel's gap between events; TASK-0065 may change it and says so.
