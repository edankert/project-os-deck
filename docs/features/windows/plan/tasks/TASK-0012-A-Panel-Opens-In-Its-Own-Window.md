---
type: "[[task]]"
id: TASK-0012
aliases: ["TASK-0012"]
title: "A panel opens in its own window — the same renderer, a different address, and a role that says what it is for"
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

# A panel opens in its own window

## Objective

A panel can be opened as its own window. It runs the same renderer, opened at its own address, and declares whether it is the focus window or a satellite.

## Definition of Done

- [ ] A command opens a named panel in a new window, at the address that panel represents.
- [ ] The new window runs the same renderer files as the first window.
- [ ] Every window carries a role: exactly one focus window, any number of satellites.
- [ ] Closing a satellite does not disturb the focus window.

## Steps

- [ ] Add a window factory taking a role and an address.
- [ ] Pass the role and address to the renderer at start.
- [ ] Track open windows by id and role in the main process.

## Notes

The window is not a second application: same renderer, different address. That is what makes [[FEAT-0006-Every-State-Has-An-Address]] a dependency rather than a nicety.
