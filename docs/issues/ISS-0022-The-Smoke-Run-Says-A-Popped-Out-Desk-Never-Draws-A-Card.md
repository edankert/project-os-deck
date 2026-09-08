---
type: "[[issue]]"
id: ISS-0022
aliases: ["ISS-0022"]
title: "The smoke run's popped-out desk window shows no cards at all: one put on the desk from another window never appears, and the focused note is never highlighted there"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["`npm run smoke`, 2026-09-08, the first run against the build of 2026-09-07"]
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0003-One-Store-In-The-Main-Process]]", "[[FEAT-0004-Windows-On-Any-Screen]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]]", "[[CHG-20260907-Nine-Defects-Before-The-Phase-Closes]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
tests: []
---

# The smoke run's popped-out desk window draws no cards

## Problem

**A popped-out window carrying a desk shows an empty desk, and a card put on that desk from the main window never arrives.** The smoke run says so twice, and this is the first time it has been run against the eleven fixes of 2026-09-07 — the close-out commit records that it could not be executed in that session. Every other one of its checks passes, the 165 unit tests pass, and the two that fail are both about the same window.

Not yet diagnosed. It is filed at `triage` so the reopened walks are not held up by it, and because the fix depends on which of two things is true, which nobody has established yet.

## Repro

```
cd desktop && npm run smoke
```

## Expected

The smoke opens a satellite on `deck://<workspace>/features?panel=desk`, then dispatches `put-on-desk` in the main process and expects the satellite's card count to rise by one; it then dispatches `focus-note` and expects the satellite to mark that card current.

## Actual

```
{
  "ok": false,
  "failures": [
    "a card added elsewhere reached the satellite (0 then 0)",
    "the satellite REDREW when the focused note changed (null then null, wanted FEAT-0002)"
  ]
}
```

The counts are the tell. The satellite drew **zero** visible cards *before* the dispatch as well as after, so the failure is not only that a change did not arrive: that window was showing nothing to begin with.

## Two candidate causes, and how to tell them apart

1. **The desk drops every card that is not in the pinned view.** `drawDesk` calls `reconcileDesk(onDesk, currentCards)`, and `currentCards` is whatever the satellite's own view loaded. The satellite is pinned to `features`; the card the main window had on the desk came from whatever view it was on. If `features` did not load in the satellite, or loaded empty, every desk card is dropped and the count is zero for ever. Read the satellite's status line and its "N cards not in this view" label to see this one.
2. **A satellite does not repaint on a change from another window.** That is the claim [[FEAT-0003-One-Store-In-The-Main-Process]] exists to make and [[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]] touched last, and it would be the more serious of the two.

The check to run first is the cheap one: pop a desk out by hand, watch the count in the popped-out window, and put a card on the desk from the main window.

## Evidence

- `desktop/src/main/main.ts`, the two `record(...)` calls after `const onDesk = await visible(satellite)`.
- `desktop/src/renderer/renderer.ts`, `drawDesk` and `narrowed`.
- Suites: 165 tests, all passing, on the same build. This is exactly the gap [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] describes — no suite can see this, and the smoke run is not in CI.

## Next Actions
- [ ] Tell the two causes apart by hand, in the running application
- [ ] Then scope the fix, and decide whether it blocks [[PHASE-0001-Deck]] closing
