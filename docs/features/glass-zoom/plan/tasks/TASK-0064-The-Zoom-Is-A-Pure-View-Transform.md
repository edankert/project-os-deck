---
type: "[[task]]"
id: TASK-0064
aliases: ["TASK-0064"]
title: "The zoom is a pure view transform: it scales around a point, keeps that point still, stops at 0.6 and 2.5 times, and never loses the field off the screen"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]"]
parent: "FEAT-0016"
effort: "S"
due: ""
depends: []
blocks: ["TASK-0065", "TASK-0068"]
related: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[TASK-0030-The-Slot-Geometry]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
tests: ["[[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]]"]
---

# The zoom is a pure view transform

## Objective

A new module, `desktop/src/shared/zoom.ts`, holds all the arithmetic of zooming, with no DOM in it. The renderer then only has to call it. It is tested in node, which is where the property that matters most, the point under the pointer staying under the pointer, can be checked to a fraction of a pixel.

## Detail

**What a zoom is.** A scale and an offset, `{ scale, dx, dy }`, applied after `project()` (`desktop/src/shared/slots.ts`) has placed a slot on the screen: a point at `(x, y)` is drawn at `(x × scale + dx, y × scale + dy)`, and a card's own scale is multiplied by `scale`. The identity, `{ 1, 0, 0 }`, draws today's field to the pixel.

**What the module offers.** The names are the implementer's choice; these are the jobs.

- **Zoom about a point.** Given a zoom, a factor and a pivot on the screen, return the new zoom in which the field point under the pivot is still under it. The scale is held between 0.6 and 2.5 ([[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]], decision 1).
- **Keep the field on screen** (decision 5). At a scale of 1 or more the offset is held so the zoomed field covers the whole field area; below 1 it is held so the zoomed field lies inside it. The clamp is applied after the pivot rule, so it is the one case where the pivot moves.
- **Apply a zoom to a projection.** Returns a projection with `x`, `y` and `scale` transformed and `visible` recomputed against the field's edges, because a card zoomed off the side is not visible.
- **The inverse.** A screen point back to the unzoomed field, for the pane obstacles and for any hit test that works in field coordinates.
- **The wheel's factor.** From a wheel event's `deltaY`, `deltaMode` (pixels or lines) and `ctrlKey` (a trackpad pinch), a multiplicative factor: a negative `deltaY` zooms in, the same delta the other way is the exact inverse, and lines are converted to pixels first. A pinch gets a larger factor per pixel than a mouse wheel, because its deltas are small. Choose the constants so one mouse-wheel notch is about 1.1× and write them in the Outcome.
- **The key step.** One press of `+` or `-` is a fixed factor about the middle of the field (1.25 is a starting value).

**The stage timings for FEAT-0017 are not here.** This module is only the zoom; [[TASK-0067-The-Ring-Is-A-Pure-Layout]] is the ring's.

## Acceptance

- Zooming in and out about any point of the field leaves the field point under it still to within 0.5 px, whenever the on-screen clamp does not apply.
- The scale never leaves [0.6, 2.5]; a factor that would pass a limit stops at it, and the pivot still holds when the clamp does not apply.
- Zooming by a factor and then by its inverse at the same pivot returns the starting zoom to within 1e-9.
- At a scale of 1 or more the zoomed field covers the field area; below 1 it lies inside it.
- The inverse of an applied zoom returns the original point to within 1e-9.
- The identity zoom returns every projection unchanged, so 1× draws today's field exactly.
- A card zoomed past the field's edge is reported not visible.
- The wheel factor is above 1 for a negative `deltaY`, symmetric in sign, and the same for a delta given in lines and the same distance in pixels.
- `desktop/tests/zoom.test.mjs` asserts all of the above, and [[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]] names it.

## Steps

- [x] Write `desktop/src/shared/zoom.ts` with the jobs above, importing `Projection` and `Viewport` from `slots.ts`.
- [x] Write `desktop/tests/zoom.test.mjs` against the built module, as the other suites do (`bash tools/scripts/run-desktop-tests.sh zoom`).
- [x] Break the module on purpose, one break per run, and record which checks fail in [[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]]: zoom about the middle instead of the pivot; no clamp on the scale; no clamp on the offset; `visible` not recomputed.
- [x] **Commit the suite and [[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]] together.** The note's `command:` names the suite, and `python3 tools/scripts/run-tests.py` fails with exit 2 on a note whose suite does not exist ([[ISS-0028-A-Test-Note-Names-A-Suite-That-Does-Not-Exist]]).
- [x] Write the chosen step sizes in the Outcome below.

## Notes

`project()` stays as it is. Everything that exists today calls it, and a zoom applied after it, rather than inside it, keeps every existing suite of the slot geometry valid.

## Outcome

**Done 2026-09-11.** `desktop/src/shared/zoom.ts` is the zoom: `zoomAbout` (about a point, the scale held to 0.6–2.5, then `keepOnScreen`), `zoomPoint` and its inverse `unzoomPoint`, `applyZoom` (a projection zoomed, `visible` worked out again with `project()`'s own rule), and `wheelFactor`. **The constants:** one mouse-wheel notch is 100 pixels and 1.1×, so `WHEEL_RATE` is ln(1.1)/100 per pixel; a trackpad pinch (a wheel with Ctrl) is 1% per pixel; a line is 16 pixels; a key step is 1.25×. [[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]]: 7 of 7, and each of its four named breaks fails a check. The first version of the pivot test skipped the very case it should catch, a zoom about the middle, because it took any result that differed from the pivot rule for a clamp; it now works out the clamp and holds the pivot whenever the clamp would not move it.
