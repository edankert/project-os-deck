---
type: "[[issue]]"
id: ISS-0059
aliases: ["ISS-0059"]
title: "The front band hides what a hand or a lift asked for: a pull into a full band vanishes, a push on a neighbour is announced and not done, and most shared notes overflow"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["The independent review of FEAT-0009, FEAT-0010 and FEAT-0014, 2026-09-10"]
severity: medium
component: renderer
parent: ""
related: ["[[TASK-0053-Pull-Forward-And-Push-Behind]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]", "[[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]]"]
tests: ["[[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The front band hides what a hand or a lift asked for

## Problem

**A pull into a full front band does nothing a person can see.** On Your Trainer's Issues view the front band is full of owed notes, which the notes call the normal case. The reviewer pulled ISS-0070 over `fixtures/nav/your-trainer-issues.json`: it left the field, front overflow went from 27 to 28, the hand count stayed 0, and the front plane said "pulled into the front band".

**A push on a neighbour is announced and not done.** A card in front because it is joined to a held note stays in front when pushed, because the joined rule comes before the push rule, and the front plane says "pushed behind you".

**Most of what two held notes share is off the field.** The smoke run showed "8 joined to more than one of them" and marked 2 cards: the twelve front slots give a shared note no priority, so six overflowed. And TASK-0036's acceptance, every neighbour in front, cannot hold past twelve neighbours; the line was not amended.

**Two counts are unguarded.** Counting a pulled owed note as placed by hand, and a pushed finished note as pushed, both survived [[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]].

## Fix

Deal shared notes first among the neighbourhood. Give pulled notes the front band's spare slots, so a pull is seen even when owed notes fill the band, and say so when even the spares are full. Refuse a push on a neighbour in words, as a push on an owed note is refused. Amend TASK-0036's line to what the band can hold. Add the two counting tests.

## Acceptance

- [x] A pull into a full front band puts the note in front, and the hand count says so.
- [x] A push on a neighbour is refused, and the front plane says why.
- [x] With two notes held, the shared notes are dealt before the other neighbours.
- [x] TST-0040 fails when a pulled owed note is counted as placed by hand, or a pushed finished note as pushed.

## Fixed, 2026-09-10

`dealField` in `desktop/src/shared/field.ts` now deals the notes two held notes share before the other neighbours, and lets a pulled note take one of the front band's eight spare slots when the band is full, without pushing an owed note out of view. A pull the spares cannot take either is counted, and the front plane says so in words instead of "pulled into the front band". A push on a neighbour is refused like a push on an owed note: "stays in front while you hold a note it is joined to; put that note back first". TASK-0036's line is amended to what the band holds: every neighbour up to the band's twelve, the rest counted and listed in the navigator.

**Evidence.** [[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]], now 12 tests: a pull into Your Trainer's full front band stands in front and is counted by hand while the owed overflow is unchanged; past the spares, the rest are counted; shared notes are dealt first; a neighbour's push is refused; and the two counts the review found unguarded are tested. Six mutations of the fix are caught. The smoke run requires every neighbour the band can hold to be in front, 11 of 11.
