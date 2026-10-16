---
type: "[[task]]"
id: TASK-0170
title: "The Glass smoke run takes a note with neighbours and a row to lift, whatever issue happens to be at triage"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["CI deck-smoke on c4f1c70 and 30f7f43", "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"]
parent: "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[TASK-0167]]"]
tests: []
---

# The Glass smoke takes a note with neighbours, whatever is at triage

## Problem

**The window smoke run on main went red with fourteen keyboard and lift checks on `c4f1c70`, a commit that changed only notes.** That commit filed ISS-0092 at triage, the only issue at triage. Two choices in `desktop/src/main/smoke-glass.ts` depend on what is at the top of the Issues view:

- **The keyboard check** focuses the navigator's first heading and presses Down twice, expecting a row. A one-row Triage group at the top makes the second Down land on the next group's heading: "the keyboard is on nav-group of null".
- **The lift checks** take the first card of the Issues view's front band. Triage stands first, so that was ISS-0092, which links to one note, and the checks that need its neighbours found none: "0 marked of 0 shared".

## Definition of Done

- [ ] The keyboard check presses Down until the keyboard is on a row, at most eight times.
- [ ] The lift checks take the first front card that is not at triage, and the first of all only if every one is.
- [ ] CI's `deck-smoke` no longer fails those checks; whatever else it fails is named.

## Verification
