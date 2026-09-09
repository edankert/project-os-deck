---
type: "[[issue]]"
id: ISS-0022
aliases: ["ISS-0022"]
title: "The smoke run's popped-out desk window shows no cards at all: one put on the desk from another window never appears, and the focused note is never highlighted there"
status: fixed
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["`npm run smoke`, 2026-09-08, the first run against the build of 2026-09-07"]
severity: high
component: tests
parent: ""
related: ["[[FEAT-0003-One-Store-In-The-Main-Process]]", "[[FEAT-0004-Windows-On-Any-Screen]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[ISS-0018-A-Needs-You-Panel-Follows-The-Focus-Windows-View]]", "[[CHG-20260907-Nine-Defects-Before-The-Phase-Closes]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
tests: ["[[TST-0036-The-Smoke-Run-Opens-A-Workspace-Or-Says-What-It-Skipped]]"]
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

## Neither candidate. The defect was in the smoke run, 2026-09-09

**`npm run smoke` never opened a workspace, and then ran the panel checks anyway.** The command in `desktop/package.json` is `electron . --smoke`, with no `--workspace`; the command in `docs/ARCHITECTURE.md` is `electron . --smoke --workspace <path>`. Two commands, two different smoke runs, and only one of them was ever green.

`prepareWorkspace()` returned `null` when no `--workspace` was given. Everything that needs a workspace sat inside `if (prepared !== null)` and was skipped silently — the navigator, the desk, the drag, the reload. The panel section that follows it was **not** inside that guard. It built its address from `prepared?.id ?? 'deadbeef'`, opened a satellite on a workspace Deck does not know, and then asserted that a card put on that workspace's desk reached it. With no workspace open, `put-on-desk` is a change to a state whose `workspaceId` is `null`, so the reducer returns the state unchanged and the count stays at zero. Both failures follow from that one line, and so does the "zero cards *before* the dispatch" that made them look like a rendering defect.

**Both candidate causes are wrong, and it is worth saying which.** The desk does not drop cards that are not in the pinned view — the satellite loads its own view from its address and reconciles against it. A satellite does repaint on a change from another window; that is [[FEAT-0003-One-Store-In-The-Main-Process]]'s claim and it holds. Running `electron . --smoke --workspace ..` against this repository on 2026-09-09, on the build both fixes are in, reports `ok: true` with no failures, the two checks included.

## The fix, in two halves

**One: the two commands become one.** `--workspace` now defaults to this repository, computed from the built module's own location, so `npm run smoke` and the documented form run the same checks. A folder that is refused prints the reason and the path it tried.

**Two: a check that cannot run says so and is never counted as a pass.** The panel section, the cross-window change and the promotion check are inside the workspace guard now, and the run's verdict carries a `skipped` list beside `failures`. A truncated run can no longer read as a full one, in either direction: it cannot fail for the wrong reason, and it cannot pass while checking half of Deck.

**What this leaves standing.** [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] is unchanged and is the reason this cost a day: the smoke run is the only thing that drives the renderer, it is not in CI, and nothing checks the smoke run itself. [[TST-0036-The-Smoke-Run-Opens-A-Workspace-Or-Says-What-It-Skipped]] now checks the part of it that can be checked without Electron.

## Next Actions
- [x] Tell the two causes apart — neither; the smoke run asserted against a workspace it had not opened, 2026-09-09
- [x] Scope the fix — the smoke run, not the renderer; it does not block [[PHASE-0001-Deck]] closing, 2026-09-09
