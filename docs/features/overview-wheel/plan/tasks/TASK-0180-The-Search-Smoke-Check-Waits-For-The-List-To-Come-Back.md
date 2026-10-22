---
type: "[[task]]"
id: TASK-0180
title: "The smoke check that clears the navigator's search waits for the list to come back, instead of counting the rows after a fixed 600 ms"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]", "Container smoke run of 2026-10-22, the network half: 'clearing the search restores the list (30 then 0)'; the same half passed on a rerun with no change"]
parent: "[[ISS-0092-The-Glass-Smoke-Check-Of-A-Press-Through-A-Growing-Document-Fails-Half-The-Time-In-CI]]"
effort: XS
due: ""
depends: []
blocks: []
related: ["[[TASK-0172]]"]
tests: []
---

# The search smoke check waits for the list to come back

**The smoke run's check that clearing the navigator's search restores the list failed once with 0 rows, and passed on a rerun with no change.** It counted the rows a fixed 600 ms after clearing the box; under load the list had not been drawn again yet. No application code had changed since the last green run. This is the same kind of race [[TASK-0172]] fixed for five other checks.

## Definition of Done

- [x] Both waits in the check (the search that matches nothing, and the clearing) look again until the list is in the state they measure, up to four seconds, and then report what they found.
- [x] Both halves of the smoke pass in the container.

## Verification

The check now looks again every 100 ms, up to four seconds, until the list holds no row after the empty search and every row after clearing it. Both halves of the smoke passed in the container on 2026-10-22 with the change, and `cd desktop && npm test` passes (799).
