---
type: "[[task]]"
id: TASK-0066
aliases: ["TASK-0066"]
title: "The smoke run zooms with a real wheel, a pinch and the keys, and each check is seen to fail with its fix removed"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]"]
parent: "FEAT-0016"
effort: "S"
due: ""
depends: ["TASK-0065"]
blocks: []
related: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[ISS-0068-The-Throw-Checks-Sometimes-Draw-No-Strip-And-Everything-After-Fails]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The smoke run zooms with a real wheel

## Objective

The Glass section of the smoke run (`desktop/src/main/smoke-glass.ts`) drives the zoom with real input in a real window and reads back what it did. Each new check is seen to fail with its fix removed, which is this project's practice for every smoke check.

## Detail

**Real input only.** Wheel events go through `webContents.sendInputEvent({ type: 'mouseWheel', x, y, deltaX, deltaY, modifiers })`, with `modifiers: ['control']` for a pinch and `['shift']` for a turn. Keys go through the existing `press()` helper. Clicks go through the existing pointer helpers.

**Its own section, reset at its start.** The zoom checks start from 1× with the desk cleared, so a failure in an earlier section, such as the intermittent cascade [[ISS-0068-The-Throw-Checks-Sometimes-Draw-No-Strip-And-Everything-After-Fails]] records, does not turn them red as well.

**The checks, with the break that each must catch.**

1. The card under the pointer stays under it after three notches in (break: zoom about the middle of the field).
2. The zoom stops at 2.5× after many notches in and at 0.6× after many out (break: no scale clamp).
3. A Ctrl wheel zooms the field and `webContents.getZoomFactor()` is still 1 (break: the listener made passive).
4. The wheel over a pane's text scrolls it and the zoom is unchanged (break: no pane exclusion).
5. A Shift wheel turns the field and the zoom is unchanged (break: Shift ignored).
6. 200 ms after the wheel stops, no near card's rectangle overlaps a pane's (break: no reassignment after the wheel).
7. A real click at a card's reported centre at 2× lifts that card (break: `whereIs` reports the unzoomed position).
8. In the orbit at 2×, resting on a link's reported point shows its sentence, and a click on a reported dot lands on it (break: `dots` recorded unzoomed).
9. `+`, `-` and `0` change the zoom, and typing `-` and `0` into the search box does not (break: no text-field guard).
10. The compass reads "N×" away from 1×, is hidden at 1×, and pressing it resets (break: button not wired).
11. After a reload the zoom is 1×, and the store's state has no zoom key (break: the zoom dispatched to the store).
12. The bands and the orbit each keep their own zoom across a switch (break: one shared zoom).
13. Under reduced motion a key step has no frames between the old and new scale (break: the ease runs regardless).

## Acceptance

- The thirteen checks above are in the Glass section and pass in `DECK_SMOKE_ONLY=glass` runs and in `bash tools/scripts/run-smoke.sh both`.
- Each was seen to fail with its break applied, one break per run, and the breaks and the failing checks are listed in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]'s Evidence.
- Every existing Glass check still passes, since nothing moves at 1×.
- `git status` in the workspace is unchanged after the run.

## Steps

- [x] Add the section and its reset to `desktop/src/main/smoke-glass.ts`, with a small helper for a wheel event.
- [x] Add the thirteen checks, each printing what it measured.
- [x] Apply each break to the built `desktop/dist` renderer, one per run, and record the result; rebuild afterwards.
- [x] Update [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]: add [[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]] to `covers:`, the three zoom tasks to `tasks:`, a "Zoom" bullet under "What it covers", and the runs under Evidence.

## Outcome

**Done 2026-09-11.** `recordZoom()` in `desktop/src/main/smoke-glass.ts` drives the zoom with real wheel events (`mouseWheel` through `sendInputEvent`), keys and clicks: fourteen checks, the thirteen listed and the double-click. **Each was seen to fail with its break**, one break per run or grouped where they touch different checks: zoom about the middle (check 1), no scale clamp (2), the pane not excluded (4), Shift ignored (5), no settle after the wheel (6), `whereIs` unzoomed (7), the dots recorded unzoomed (8, after the check was strengthened to read the canvas where the dot is recorded, since the click and the sample share one list), no text-field guard (9), the compass not wired (10), the zoom sent to the store (11), one shared zoom (12), the ease under reduced motion (13), no double-click reset (14). **Two did not behave as the plan expected.** A passive listener (check 3's break) left Electron's page zoom at 1, so check 3 cannot see it; the break was caught instead by the double-click and orbit checks, which found no zoom at all. And a zoom kept in session storage survived no reload in the harness, so that variant of check 11's break was not caught; the plan's own break, the zoom in the store, was.
