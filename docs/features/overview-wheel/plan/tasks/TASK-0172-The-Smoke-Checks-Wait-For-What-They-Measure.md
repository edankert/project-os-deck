---
type: "[[task]]"
id: TASK-0172
title: "The smoke checks that raced the machine wait for what they measure: the opening is held still over the row for the second press, and five checks look again until their state arrives"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16: 'go ahead and fix the document-growth check and other possible timing checks as suggested'", "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"]
parent: "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[TASK-0171]]"]
tests: []
---

# The smoke checks wait for what they measure

## Problem

**Once the smoke run's notes were pinned ([[TASK-0171]]), what still failed on CI was timing.** Each failing check either raced the machine or waited a fixed time:

- **The second press through a growing document.** The document lies over the row below for about 60 ms. The run looked at the page until it saw that, then pressed; each look and each press took several milliseconds on CI, so the press arrived after the document had moved on, or the looks missed the window.
- **"A surface switch each leave the focus"** and **"V on its header gives it back to Features alone"** read the state once, a fixed 700 to 1,500 ms after acting, and failed on one host and passed on the other.
- **"A pinch zooms the field"** read the zoom 60 ms after the last wheel event, and **"resting on the link shows the sentence"** read the callout once, 900 ms after resting, while the orbit can drift the link away; both had failed before.

## What changes

- **The opening is held still over the row.** The opening is a Web Animation: as soon as the first press starts it, the run pauses it at the first moment the document lies over the row below, presses there, and lets it finish. The document is still opening at the press, so the check proves what it did: a press made during the opening goes through to the row under it.
- **`eventually(holds, ms)`** in `desktop/src/main/smoke-glass.ts` looks again every 100 ms until the state arrives, for up to four seconds, and fails only if it never does. The lift before each way out of the focus, each way out, V on the header and its pane leaving Issues, and the pinch's zoom use it.
- **The quiet band's shape after a view switch** is read once the band holds the shape its own count earns, waited for up to four seconds: CI's first run on these fixes (`463b339`) passed everything on the network and failed only this check on loopback, read 900 ms after the switch with no notes of the new view counted yet.
- **The link callout** is retried up to three times, each time on a link looked up afresh, waiting up to 1.5 s for the callout.

## Definition of Done

- [ ] `cd desktop && npm test` passes.
- [ ] CI's `deck-smoke` passes, or what it still fails is named in ISS-0092.

## Verification
