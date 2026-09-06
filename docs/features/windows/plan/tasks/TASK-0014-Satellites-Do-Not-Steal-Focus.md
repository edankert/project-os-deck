---
type: "[[task]]"
id: TASK-0014
aliases: ["TASK-0014"]
title: "Satellites do not steal focus — one window owns navigation and the others watch"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
parent: "FEAT-0004"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0004-Windows-On-Any-Screen]]"]
tests: []
---

# Satellites do not steal focus

## Objective

A satellite window opens and updates without taking the keyboard. Navigation belongs to the focus window.

## Definition of Done

- [ ] Opening a satellite leaves the keyboard in the window that had it.
- [ ] A satellite that re-renders on a state change does not raise itself.
- [ ] Navigation actions dispatched from a satellite move the focus window rather than the satellite.
- [ ] If the focus window closes, a satellite is promoted rather than leaving Deck with no navigator.

## Steps

- [ ] Open satellites without activation.
- [ ] Route navigation actions to the focus window's address.
- [ ] Promote a satellite on the focus window's close.

## Notes

Two windows that both claim to show what needs you is how you end up trusting neither, which is the reason DES-0002 gives for a single front plane.
