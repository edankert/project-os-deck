---
type: "[[issue]]"
id: ISS-0061
aliases: ["ISS-0061"]
title: "Reduced motion is missing from a lift and a view switch: neither highlights what it arrived at, and nothing checks either"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["The independent review of FEAT-0009, FEAT-0010 and FEAT-0014, 2026-09-10"]
severity: low
component: renderer
parent: ""
related: ["[[TASK-0032-A-View-Switch-Re-Arranges]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Reduced motion is missing from a lift and a view switch

## Problem

**A lift under reduced motion gets no highlight.** TASK-0036 says the turn to the neighbours is replaced by a highlight on them; `faceFront()` calls `flyTo(0)` with none. **A view switch under reduced motion** is a cut, but TASK-0032's "the newly focused card is highlighted and scrolled into view in the navigator" is not built, and nothing checks either. One reduced-motion check, "choosing a row highlights it", also failed once in the reviewer's mutated run and passed in both clean runs.

## Fix

Under reduced motion, a lift highlights the neighbours it brought forward, and a view switch highlights the focused note's card and its row. Check both in the smoke run.

## Acceptance

- [x] Under reduced motion, a lift highlights its neighbours and the field does not turn.
- [x] Under reduced motion, a view switch that keeps the focused note in view highlights its card and its row.

## Fixed, 2026-09-10

Under reduced motion a lift no longer turns the field: it faces the front at once and highlights the neighbours it brought forward for 1.6 seconds. A view switch that keeps the focused note in view highlights its card and its navigator row, scrolled into view.

**Evidence.** [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]: under reduced motion a lift highlighted 11 neighbours and the field did not turn, and switching Issues to Features and back highlighted ISS-0056's card and row with no transition. The highlight check the review saw fail once now polls for up to a second and asks the window for the keyboard first; it has not failed since.
