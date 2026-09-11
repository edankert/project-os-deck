---
type: "[[test]]"
id: TST-0049
aliases: ["TST-0049"]
title: "A desk for each view and a note on every view, in the store: an old state file reads unchanged, the mark moves a note between lists, and the tablet is told only about open workspaces"
status: active
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]]", "[[TASK-0059-A-Note-Is-Kept-On-Every-View]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/view-desks.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh view-desks"
covers: ["[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]"]
issues: []
tasks: ["[[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]]", "[[TASK-0059-A-Note-Is-Kept-On-Every-View]]", "[[TASK-0062-Desk-Panels-Throws-And-The-Tablet-Use-The-Right-Views-Desk]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0019-The-Desk-Is-Chosen-And-Arranged]]", "[[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]]", "[[TST-0039-The-Served-Page-Follows-The-Store-By-Reading]]", "[[TST-0002-The-Store-Broadcasts-And-Survives-A-Restart]]"]
---

# A desk for each view and a note on every view, in the store

## Purpose

The store is where a desk per view either holds or does not, and the reducer is pure, so this is checked in node without a window. The suite covers the three things that matter most. A state file written before this feature must draw the same notes. A note put on one view must be absent from another. And a note marked on every view must be drawn exactly once on each view.

**The suite and this note landed in one commit**, as they had to. `command:` already names `view-desks`, because the validator refuses a unit test with neither a command nor a date it was last walked. [[TASK-0058-The-Store-Keeps-A-Desk-For-Each-View]] writes `desktop/tests/view-desks.test.mjs` in the same commit as this note. Until it does, `python3 tools/scripts/run-tests.py` reports this test failing with exit 2 ("no suite called 'view-desks'"), which is the failure [[ISS-0028-A-Test-Note-Names-A-Suite-That-Does-Not-Exist]] recorded.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh view-desks`.

## Expected results

- A state holding only `deskCards`, in two workspaces, draws the same notes in the same order on every view of both.
- A note put on the desk with Issues chosen is on the Issues desk and not on the Features desk, and is back at the same place after a switch away and back.
- An action carrying a `viewId` changes that view's desk only; with no view chosen, `put-on-desk` without one changes nothing.
- `select-view` moves no card and clears the open desk's name.
- `clear-desk` leaves notes on every view; the whole-workspace reset empties every list.
- Marking moves a note to the every-view list at the same place and removes it from every other view's own list; unmarking moves it to the current view only.
- `take-off-desk` on a note on every view removes it from every view.
- A raised note on every view is drawn above a view's own notes; a newly put note is on top; a state with no stacking numbers keeps its list order.
- No drawn desk ever holds two cards in the reading column.
- Saving on one view and opening on another puts the saved notes on the second view's desk and leaves notes on every view in place; `select-view` then `open-desk` lands on the new view.
- `persistable` keeps `viewDesks`; `normaliseState` survives a malformed `viewDesks`.
- `servedState` keeps `viewDesks` only for open workspaces, and the served page draws the Mac's view's desk.
- The mark crosses the window channel and is not a tablet-local action.

## Evidence

2026-09-11: `bash tools/scripts/run-desktop-tests.sh view-desks`, 13 of 13, and `npm test` passes with it.

## Adequacy (who verifies this test?)

Measured 2026-09-11 by breaking the reducer on purpose, one break per run: each of the four below failed checks (5, 4, 1 and 1 of 13). The breaks that matter most are four. Reading an old `deskCards` as the current view's desk only. Leaving a marked note in another view's list. Putting a note on every view when no view is chosen. And letting `servedState` pass `viewDesks` for a closed workspace. Each must fail a check.
