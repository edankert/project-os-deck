---
type: "[[task]]"
id: TASK-0065
aliases: ["TASK-0065"]
title: "The wheel, a pinch and three keys zoom the field in Glass and the orbit, clicks still land on what is drawn, and no card is left under a pane"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]"]
parent: "FEAT-0016"
effort: "M"
due: ""
depends: ["TASK-0064"]
blocks: ["TASK-0066"]
related: ["[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0056-Reach]]", "[[TASK-0003-The-Field-Renders-And-Flies]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[TASK-0060-Hide-Notes-And-Show-Them-Again]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The wheel and three keys zoom the field

## Objective

Turning the mouse wheel over the Glass field or the orbit zooms toward the pointer, a pinch does the same, and `+`, `-` and `0` do it from the keyboard. Everything a person can click is still clicked where it is drawn, and no card is left under a pane when the zoom stops.

## Detail

**Where the zoom is applied.** `GlassField` in `desktop/src/renderer/glass.ts` keeps one zoom for the bands and one for the orbit, as plain fields beside the turn, and passes every projection through [[TASK-0064-The-Zoom-Is-A-Pure-View-Transform]]'s function before drawing it. That covers the cards (`place()`), the quiet band's tiles and the ghost outlines (`paintCanvas()`), the orbit's dots and links (`paintOrbit()`, including the `dots` and `segments` lists the hit tests read), the reach's wires (`paintWires()`), and the sectors. The positions the page reports to the smoke run, `whereIs`, `dotFor`, `edgeSample` and `wirePixel`, report where things are drawn, zoomed.

**Panes are not zoomed, and they stay obstacles.** A pane's rectangle is on the screen. `paneObstacles()` maps it back through the inverse before `obstaclesFor()` turns it into a sector of the cylinder, so the sector is the part of the field the pane really covers at this zoom. When the wheel has been still for 150 ms the field reassigns covered cards once, the same call a turn makes when it ends (`turnEnd()`), and in the orbit it does nothing, as a turn does there ([[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]], decision 3).

**The wheel.** One listener on the field, registered with `{ passive: false }` so it may stop the browser's default. It ignores an event whose target is inside a pane, the field's bar, the compass, the target strip or the edge callout, so the wheel over a pane still scrolls the pane's text. A vertical wheel zooms about the pointer; Ctrl held means a pinch and uses the pinch's step. A mostly sideways wheel, or any wheel with Shift held, turns the field by the same radians per pixel a drag uses (`TURN_PER_PX`), and the turn ends 150 ms after the last event. The listener calls `preventDefault()`, so neither the page nor Electron's page zoom moves.

**The keys.** `+` or `=` zooms in, `-` zooms out and `0` returns to 1×, each about the middle of the field, while Glass is active. They are ignored with Cmd, Ctrl or Alt held, and in an input, a text area, a select or anything editable, with the same guard `H` uses in `desktop/src/renderer/renderer.ts`. A key step eases over 150 ms and is a cut under reduced motion.

**The double-click.** A double-click on the field's background returns to 1×, only when neither click landed on a card, a pane, a dot or a button. A single click on the background still changes nothing ([[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]).

**The compass.** A button in the compass reads the zoom, for example "1.6×", and returns to 1× when pressed. It is hidden at 1×, and its label for a screen reader is "Zoom 1.6 times; press to reset".

**Nothing is stored.** No store action is dispatched for a zoom, and no field is added to `DeckState`. The zoom is lost on reload, as the turn is.

## Acceptance

- Three notches of the wheel over a card draw it larger, and the card is still under the pointer to within 1 px.
- The zoom stops at 0.6× and at 2.5×.
- A wheel event with Ctrl held zooms the field, and `webContents.getZoomFactor()` stays 1.
- The wheel over a pane's text scrolls it and leaves the zoom unchanged.
- Shift with the wheel turns the field and leaves the zoom unchanged.
- 200 ms after the wheel stops, no field card is drawn under a pane; at 1× no card has moved by a pixel compared with a build without this task.
- A real click on a card at 2× lifts that card; in the orbit at 2×, resting on a link shows its sentence and a click on a dot lands on it.
- `+`, `-` and `0` zoom in, out and back to 1×; typed into the navigator's search box they are letters and the zoom is unchanged.
- A double-click on the background returns to 1×; a double-click on a card lifts it and does not reset the zoom.
- The compass reads the zoom when it is not 1× and resets it when pressed, and is hidden at 1×.
- The bands and the orbit each keep their own zoom across a switch between them.
- A reload shows 1×; the store's state and the state file carry no zoom; no copied address mentions it.
- Under reduced motion a key's step is a cut.
- Hide notes ([[TASK-0060-Hide-Notes-And-Show-Them-Again]]) at 2× lets the field deal into the space the panes covered, as at 1×.

## Steps

- [x] Hold the two zooms in `GlassField`; route every drawn and reported position through the zoom.
- [x] Map pane rectangles through the inverse in `paneObstacles()`; reassign covered cards 150 ms after the last wheel event.
- [x] Add the wheel listener with the target exclusions, the pinch step and the Shift or sideways turn.
- [x] Add the three keys with the text-field guard, the double-click reset, and the compass button in `desktop/src/renderer/index.html` and `desktop/src/renderer/deck.css`.
- [x] Leave the smoke checks to [[TASK-0066-The-Smoke-Run-Zooms-With-A-Real-Wheel]], which lists them.
- [x] Append to [[FEAT-0001-The-Corpus-Has-An-Inside]], at the end of "Where this stands", this paragraph: "**Amended 2026-09-11 ([[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]).** This feature's scope promised 'Fly, zoom, and land', and zoom was not built with it. The wheel, a pinch and the `+`, `-` and `0` keys now zoom the orbit toward the pointer, from 0.6× to 2.5×, and the orbit keeps its own zoom for as long as the window is open."
- [x] Append to [[PHASE-0002-Glass]]'s scope bullet "Addresses, extended" the sentence: "**Amended 2026-09-11:** the zoom ([[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]) is window state like the yaw and is never in the address."

## Notes

The rev 3 lesson of DES-0002 applies: the check of every hit test must use real input through `sendInputEvent`, never a synthetic event dispatched on an element.

## Outcome

**Done 2026-09-11.** `GlassField` keeps one zoom for the bands and one for the orbit, and every position it draws or reports goes through one method, `at()`, which zooms the projection; so the cards, the quiet band, the orbit's dots and links, the wires and the positions the smoke run reads are all where they are drawn. Panes are not zoomed: `paneObstacles()` takes a pane's edges back through `unzoomPoint` before it becomes a sector, and 150 ms after the wheel stops the field moves covered cards out once, as a turn does. The wheel zooms about the pointer; Ctrl (a pinch) zooms with the pinch's rate; Shift, or a mostly sideways wheel, turns the field; over a pane, the bar, the compass or the strip the wheel does its ordinary job. `+` or `=`, `-` and `0` zoom about the middle, eased over 150 ms and a cut under reduced motion, and are letters in a text field. A double-click on the background returns to 1×. The compass shows "1.6×" when not at 1× and resets when pressed. Nothing is stored. The two amendment paragraphs are on [[FEAT-0001-The-Corpus-Has-An-Inside]] and [[PHASE-0002-Glass]].
