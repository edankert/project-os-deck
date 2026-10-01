---
type: "[[task]]"
id: TASK-0099
title: "Walk the Glass desktop at real scale"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: ["[[TASK-0098-Keep-Collection-Document-And-Field-In-Sync]]"]
blocks: []
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]", "[[PHASE-0002-Glass]]"]
tests: ["[[TST-0063-A-Collection-And-Full-Note-Share-Glass]]"]
---

# Walk the Glass desktop at real scale

## Definition of Done

- [ ] The automated Glass smoke drives collection and full-document interactions with a real pointer and keyboard, including refresh and multiple windows.
- [ ] The acceptance walk covers the current real workspaces, a narrow window or tablet, an accessible route, exact counts and an opened long note.
- [ ] Foreground measurements with the collection and document open report frame work and reachability against PHASE-0002's existing budget; failures are recorded, not hidden by population caps.

- [ ] Record before/after task completion time, mistaken selections and lost-context incidents for find, open, follow link and return; retain the observations rather than assert animation improves usability.
- [ ] Capture interrupted transitions, reduced motion, high-degree neighbours, shared neighbours, scroll boundaries and an unplaced member reached through the exact collection.
- [ ] Record build, fixture, window/display, refresh state, input sequence, timing endpoint, foreground frame cadence, script/render work, stalls and memory with full documents present.

## Steps

- [ ] Extend real-pointer checks and update the stale owed-card smoke precondition.
- [ ] Run [[TST-0063-A-Collection-And-Full-Note-Share-Glass]] and save evidence.
- [ ] Measure the full corpus with on-stage objects present.

## Notes

This task measures the Electron experience being delivered here. The native comparison that TASK-0092 planned was dropped on 2026-10-01.
