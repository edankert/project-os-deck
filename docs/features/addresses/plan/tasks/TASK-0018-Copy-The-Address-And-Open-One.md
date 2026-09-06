---
type: "[[task]]"
id: TASK-0018
aliases: ["TASK-0018"]
title: "Copy the address and open one — the round trip a person can actually perform"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
parent: "FEAT-0006"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
tests: []
---

# Copy the address and open one

## Objective

A person copies Deck's current address to the clipboard and pastes one in to go there.

## Definition of Done

- [x] A command copies the current address to the clipboard.
- [x] A command accepts a pasted address and moves Deck to it.
- [x] Opening an address that names another workspace switches workspace first, then resolves the rest.
- [x] An address that cannot be resolved leaves Deck where it was and reports what failed.

## Steps

- [x] Add the copy action and the open action to the renderer.
- [x] Resolve a parsed address against the workspaces, the provider's views and the saved desks.
- [x] Report failures in the interface rather than only in the console.

## Notes

This is the fifth exit criterion of [[PHASE-0001-Deck]], and it is also how a window restores itself in [[FEAT-0004-Windows-On-Any-Screen]].
