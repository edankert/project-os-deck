---
type: "[[issue]]"
id: ISS-0062
aliases: ["ISS-0062"]
title: "A display holding only a Needs-you strip cannot receive a throw, unnamed displays read oddly in the strip, and three of the throw’s promises have no automated check"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["The independent review of FEAT-0009, FEAT-0010 and FEAT-0014, 2026-09-10"]
severity: low
component: renderer
parent: ""
related: ["[[TASK-0055-Throw-To-A-Screen]]", "[[TST-0044-The-Neighbourhood-Is-Read-Once-And-A-Throw-Is-Recognised]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
tests: ["[[TST-0044-The-Neighbourhood-Is-Read-Once-And-A-Throw-Is-Recognised]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# A display holding only a Needs-you strip cannot receive a throw

## Problem

`targetsToward` in `desktop/src/shared/throw.ts` counts a display as occupied when any Deck window is on it, and a Needs-you strip is never a target, so a display holding only a strip offers nothing: the reviewer's call returned `[]`. A display with no name reads "a new reader on  (2)". And three of [[TASK-0055-Throw-To-A-Screen]]'s lines have no automated evidence: the smoke run's reader and desk windows are on the focus window's display while the check says "the other screen", no throw reaches the tablet, and neither the flight's direction nor the reduced-motion cut is checked.

## Fix

Count a display as taken only by a window that can receive a throw. Name an unnamed display by its number. In the smoke run: open a served page so the tablet is a target and throw to it, check the flight goes toward the edge, and check the cut under reduced motion.

## Acceptance

- [x] A display holding only a Needs-you strip offers a new reader.
- [x] An unnamed display reads "display N".
- [x] The smoke run throws to the tablet, checks the flight's direction, and checks the reduced-motion cut.

## Fixed, 2026-09-10

A display counts as taken only by a window a note can land in, so one holding only a Needs-you strip offers a new reader. A display the system names without letters is called "display N", or "the main display". The smoke run now opens a served page, as a tablet loads it, and throws a note to the tablet target: it was on the page's desk 189 ms after the release. It checks that the thrown card flies toward the edge it left, and that under reduced motion the landing is a cut with the target named.

**Evidence.** [[TST-0044-The-Neighbourhood-Is-Read-Once-And-A-Throw-Is-Recognised]]: the strip-only display and the display names, both mutations caught. [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] for the tablet, the flight and the cut. The reader and desk windows the smoke run throws to still sit on the focus window's display; the check is labelled "the desk panel window" now, and a throw to another display is checked by the empty-display case on a machine with more than one.
