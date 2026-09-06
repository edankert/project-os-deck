---
type: "[[task]]"
id: TASK-0015
aliases: ["TASK-0015"]
title: "Notes become cards — the sidecar's list, drawn as several cards at once, each carrying its status band"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
parent: "FEAT-0005"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
tests: []
---

# Notes become cards

## Objective

A view's notes are drawn as cards rather than rows. A card shows the note's id, title, type and status band.

## Definition of Done

- [ ] A view renders its notes as cards, several visible at once.
- [ ] A card's status band is the band the sidecar reports; Deck defines no second vocabulary of its own.
- [ ] Cards are drawn from a pool rather than one element per note, so a view of a thousand notes does not create a thousand elements.
- [ ] A card opens its note in the reader.

## Steps

- [ ] Map the nav payload's items to a card model.
- [ ] Render the cards, reusing elements from a pool as the visible set changes.
- [ ] Wire a card's activation to the focused note in the store.

## Notes

Pooling is here rather than in Glass because the same list can be long in Spread, and adding it later means rewriting the renderer that assumed one element per note.
