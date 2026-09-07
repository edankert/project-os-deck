---
type: "[[task]]"
id: TASK-0037
aliases: ["TASK-0037"]
title: "What these share: with several notes on the desk the field marks what is joined to more than one of them, and the desk bar counts it"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0010-Lifting-A-Note]]"]
parent: "FEAT-0010"
effort: ""
due: ""
depends: ["TASK-0036"]
blocks: []
related: ["[[FEAT-0010-Lifting-A-Note]]", "[[DES-0002-The-Glass-Cockpit]]"]
tests: []
---

# What these share

## Objective

Put two or more notes on the desk and the field answers what they have in common. Every field card joined to more than one held note carries a mark, and the desk bar says how many there are.

## Detail

This is the capability DES-0002 found only because the desk and the field were split: the neighbours stay in the field, so with several notes held the field can show which notes are joined to more than one of them. It is asked constantly at triage and close-out. Three issues on the desk: which feature do they all touch. A phase and its unresolved children: which test covers more than one.

The computation needs no whole graph. TASK-0036 already fetches a context per held note. The intersection of those contexts, counted per note, is the answer: a note appearing in two or more held notes' neighbourhoods is joined to more than one. The mark is on the field card and the count is in the desk bar, and the count says what it counts.

## Acceptance

- With one note held, no card carries the shared mark and the desk bar shows no count.
- With two or more notes held, every field card that appears in at least two of their neighbourhoods carries the mark, and no other card does.
- The desk bar shows the number of marked cards, labelled so that a reader knows what the number counts.
- Putting a note back recomputes the marks from the notes still held.
- The marked cards are listed in the navigator so a keyboard user can reach them.

## Steps

- [ ] Compute the shared set from the held notes' contexts as a pure function in `shared/`, tested over fixtures with zero, one, two and three held notes.
- [ ] Draw the mark on field cards and the count in the desk bar.
- [ ] Recompute on every lift and put-back.
- [ ] Surface the shared set as a group in the navigator.

## Notes

A note that is shared and also owed is both marked and in the front band; the mark says what it is joined to, and the band says what it wants. The two must not compete for the same pixel.
