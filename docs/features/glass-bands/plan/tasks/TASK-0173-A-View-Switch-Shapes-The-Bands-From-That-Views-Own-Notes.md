---
type: "[[task]]"
id: TASK-0173
title: "A view switch shapes Glass's bands from that view's own notes, not from the last view's still on screen while the new ones are read"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["The smoke run in its container, 2026-10-16: 'after a view switch the quiet band's shape is the one its 0 notes earn (14x11 at 140, owed 8x6 at 140)'", "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"]
parent: "[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[TASK-0172]]"]
tests: []
---

# A view switch shapes the bands from that view's own notes

## Problem

**After switching from Issues to Features, Glass's quiet band could keep the shape Issues' notes earned, though Features had none for it.** Glass works out each band's shape once, when the view changes, so a deal that moves one note does not re-lay the field (ADR-0005, FEAT-0018 decision 5). `loadView` in `desktop/src/renderer/renderer.ts` sets the new view before it has read the new view's notes, and anything that draws Glass in between hands it the new view with the old view's notes. Glass took the shapes from that deal and kept them when Features' notes arrived, because the view had not changed again. The smoke run in its container showed it every time: "the quiet band's shape is the one its 0 notes earn (14x11 at 140, owed 8x6 at 140)". On CI it showed on one host and not the other, which made it look like timing.

## Definition of Done

- [x] `GlassInput.ready` says whether the groups are the view's own; the renderer passes false while the view is still loading, and Glass works out the shapes only from a ready deal.
- [ ] The smoke check passes in the container and on CI.

## Verification

In the smoke container (`bash tools/scripts/run-smoke.sh loopback`) the check failed on every run before the change and passed on the two runs after it. 792 node tests pass. CI not yet run on it.
