---
type: "[[issue]]"
id: ISS-0058
aliases: ["ISS-0058"]
title: "A card can be drawn under a pane: the field keeps cards clear of where a pane is stored, not where it is drawn, and its margin is too small off to the side"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["The independent review of FEAT-0009, FEAT-0010 and FEAT-0014, 2026-09-10"]
severity: medium
component: renderer
parent: ""
related: ["[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0030-The-Slot-Geometry]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0041-The-Slot-Geometry-Places-Every-Note-And-Keeps-Obstacles-Clear]]"]
tests: ["[[TST-0041-The-Slot-Geometry-Places-Every-Note-And-Keeps-Obstacles-Clear]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# A card can be drawn under a pane

## Problem

**Two things put cards under panes.** First, `paneObstacles()` in `desktop/src/renderer/glass.ts` keeps cards clear of the pane's STORED position, while `paintPane()` draws the pane clamped into the field. The reviewer stored a pane at x=3000 in a real window; it was drawn at 1000–1320 px with FEAT-0006, FEAT-0007 and FEAT-0008 under it. That happens whenever the reading column narrows the field, or a card placed in Spread sits past the field's width. Second, `obstaclesFor` in `desktop/src/shared/slots.ts` widens the sector by half a card at the scale of a card straight ahead, and a card off to the side is drawn larger: over 20,000 random pane placements, 8% left a visible card up to 22.5 px under the pane.

## Why neither was found before

[[TST-0041-The-Slot-Geometry-Places-Every-Note-And-Keeps-Obstacles-Clear]] tests one pane position, on the left third of the screen. [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] checks for overlap before the reading column opens, and closes the column before its reload, so the clamped case never runs.

## Fix

Compute the obstacle from the rectangle the pane is drawn at. Widen the sector by half a card at the scale the card would have at that edge, not straight ahead. Test random placements, and check overlap in the smoke run with the reading column open.

## Acceptance

- [x] No card is drawn under a pane that was clamped into a narrow field.
- [x] Over many random pane placements and yaws, no visible card's box crosses a pane.
- [x] The smoke run checks for overlap with the reading column open.

## Fixed, 2026-09-10

`paintPane` and `paneObstacles` now take the pane's rectangle from one function, `paneRect`, which clamps the stored place into the field, so the field keeps cards clear of the pane a person sees. `obstaclesFor` finds each end of the sector where a card's own edge meets the pane's edge, at the scale that card is drawn at, by halving over the visible arc.

**Evidence.** [[TST-0041-The-Slot-Geometry-Places-Every-Note-And-Keeps-Obstacles-Clear]] places 3,000 seeded random panes in fields 700 to 1,600 pixels wide at random yaws and checks more than 10,000 visible cards; none crosses a pane, and putting the straight-ahead margin back fails it. The smoke run stores a pane at x=3000 with the reading column open: it is drawn inside the field and no card is under it.
