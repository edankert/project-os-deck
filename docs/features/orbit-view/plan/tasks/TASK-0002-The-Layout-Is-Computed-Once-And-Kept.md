---
type: "[[task]]"
id: TASK-0002
aliases: ["TASK-0002"]
title: "The layout is computed once and kept — and a new note takes a place without moving its neighbours"
status: backlog
phase: ""
owner: user:edwin
created: 2026-09-05
updated: 2026-09-05
source: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
parent: "FEAT-0001"
effort: ""
due: ""
depends: ["TASK-0001"]
blocks: ["TASK-0003"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]"]
tests: []
---

# The layout is computed once and kept

## Objective

Positions are solved once, stored, and stable across sessions. Opening the view twice shows the same field.

## Detail

A force simulation over 16148 edges cannot run on every open, and a field that re-settles differently each time cannot be learned. Both problems have the same fix: solve, store, and treat the result as data.

**The hard half is growth.** This corpus added 634 notes in one month. A new note must be placed near its links without displacing what is already there — otherwise every remembered position is wrong the next morning, which is worse than never having offered stability. [[DES-0001]]'s ATLAS objection is the same problem stated for a map, and the answer is likely the same: allocate with room, and spill at the edge rather than re-solving the interior.

## Acceptance

- Two consecutive loads produce identical positions
- Adding a note moves no existing node by more than a stated tolerance
- The stored layout survives a restart and is invalidated only when the edge list changes materially

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `TASK-0593` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).
