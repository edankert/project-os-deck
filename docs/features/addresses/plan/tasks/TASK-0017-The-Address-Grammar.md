---
type: "[[task]]"
id: TASK-0017
aliases: ["TASK-0017"]
title: "The address grammar — one string covering the workspace, the view, the desk and the note, parsed strictly"
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

# The address grammar

## Objective

One module formats Deck's state as an address and parses an address back into state, refusing what it cannot read.

## Definition of Done

- [x] Formatting a state and parsing the result returns the same state, for every state the renderer can reach.
- [x] An address naming an unknown view or desk is refused with the name it could not resolve.
- [x] A malformed address is refused with the reason and never resolves to a default.
- [x] The grammar is documented in the feature note, with an example of each form.

## Steps

- [x] Define the grammar and write it down.
- [x] Write the formatter and the parser as pure functions.
- [x] Test the round trip over a table of states, and the refusals over a table of bad inputs.

## Notes

Refusing rather than defaulting is the lesson of the cockpit's silent mode fallback, which made a view look broken for thirty-three hours because an unknown mode quietly became the default one.
