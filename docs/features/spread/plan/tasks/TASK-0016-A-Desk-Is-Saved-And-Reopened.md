---
type: "[[task]]"
id: TASK-0016
aliases: ["TASK-0016"]
title: "A desk is saved and reopened — an arrangement with a name, and a card whose note is gone does not break it"
status: done
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

# A desk is saved and reopened

## Objective

An arrangement of cards is a desk. A desk is saved by name into Deck's store and reopens as it was left.

## Definition of Done

- [x] A desk records which notes are on it and where each card sits.
- [x] Saving a desk by name and reopening it restores the same cards in the same places, across a restart.
- [x] A desk naming a note the workspace no longer has opens without that card, and says how many it dropped.
- [x] Desks are part of the persisted state, so they survive with it.

## Steps

- [x] Declare the desk model: a name, and a list of note ids with positions.
- [x] Add save, open and list actions to the store.
- [x] Reconcile a desk against the current note list when it opens.

## Notes

A desk that refuses to open because one note was renamed is worse than a desk that opens with one card missing and says so.
