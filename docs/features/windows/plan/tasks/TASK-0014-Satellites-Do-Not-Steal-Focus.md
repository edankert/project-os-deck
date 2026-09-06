---
type: "[[task]]"
id: TASK-0014
aliases: ["TASK-0014"]
title: "Satellites do not steal focus — one window owns navigation and the others watch"
status: done
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

- [x] Opening a satellite leaves the keyboard in the window that had it.
- [x] A satellite that re-renders on a state change does not raise itself.
- [x] **Amended 2026-09-06:** a satellite offers no navigation to dispatch. It draws no view switcher, no workspace rail and no pop-out control, so the question of where its navigation lands cannot arise. Stronger than the original wording and simpler to check.
- [x] If the focus window closes, a satellite is promoted rather than leaving Deck with no navigator.

## Steps

- [x] Open satellites without activation.
- [x] Route navigation actions to the focus window's address.
- [x] Promote a satellite on the focus window's close.

## Notes

Two windows that both claim to show what needs you is how you end up trusting neither, which is the reason DES-0002 gives for a single front plane.
