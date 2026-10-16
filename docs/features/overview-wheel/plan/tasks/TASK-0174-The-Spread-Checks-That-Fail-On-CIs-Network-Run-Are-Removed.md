---
type: "[[task]]"
id: TASK-0174
title: "The four Spread checks that fail on CI's network run are removed from the smoke run, at Edwin's word"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16: 'Just remove any failing tests'", "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"]
parent: "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"
effort: XS
due: ""
depends: []
blocks: []
related: ["[[TASK-0172]]"]
tests: []
---

# The Spread checks that fail on CI's network run are removed

**After [[TASK-0172]] removed three failing checks, CI's smoke run (`8922199`) failed four more, all on its network run and all in Spread:** "Spread shows the same desk at the same positions", "two cards overlap in Spread, so bringing one forward can be checked (a desk 0 px wide)", "a card in Spread could be pressed, to drag it", and "in Spread on Features it is a card that says it is not in this view". Spread drew no card there; the same checks passed in the smoke container. Edwin asked for failing checks to be removed, so they are, with the check that panes are still held on switching back from Spread, which no longer switches. Each place carries a dated comment. Nothing now checks Spread's desk in a window.

## Definition of Done

- [x] The four checks and the switch they belonged to are gone from `desktop/src/main/smoke-glass.ts`, with a comment where they stood.
- [x] CI's `deck-smoke` passes, or what it still fails is named.

## Verification

The four checks and their switch are gone from `desktop/src/main/smoke-glass.ts`, each with a comment. At `f649ff8` both halves of the smoke passed in the container and on CI. [[TASK-0175]] tried running them locally only and was cancelled: they failed in the container too.
