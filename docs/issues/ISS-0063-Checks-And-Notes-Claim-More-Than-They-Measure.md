---
type: "[[issue]]"
id: ISS-0063
aliases: ["ISS-0063"]
title: "Some checks and notes claim more than they measure: the frame time was taken with no panes or wires, the mid-view change skips its real path, and five notes cite or say the wrong thing"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["The independent review of FEAT-0009, FEAT-0010 and FEAT-0014, 2026-09-10"]
severity: medium
component: tests
parent: ""
related: ["[[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]", "[[TASK-0032-A-View-Switch-Re-Arranges]]", "[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]", "[[TASK-0031-The-Field-Renders-And-Turns]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[CHG-20260910-Deck-Opens-In-Glass]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Some checks and notes claim more than they measure

## Problem

- **The measurement had no panes or wires on the field.** `desktop/src/main/measure.ts` clears the desk and never reaches for a card, while [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] and [[PHASE-0002-Glass]] say it measured a field with panes and wires.
- **The mid-view change check skips its real path.** The smoke run injects the change through `__deckHoldChange`; with `prepareChange()` disabled in the built renderer, the check still passed.
- **The neighbour check passes with one neighbour.** Its condition is `=== min(...) || >= 1`; with the field mutated to keep one joined note it passed as "2 of 11".
- **One check accepts anything.** "The change was dealt" accepts any status that is not null, and printed "none".
- **TASK-0033 cites the wrong test** for refusing an unknown surface: the guard is in `panel-registry.test.mjs`, which is [[TST-0034-The-Grammar-Carries-The-New-Keys-And-The-Panel-Registry-Refuses-Strangers]].
- **TASK-0031 is `done` with its Safari line unmet**, and the line was not amended.
- **The change note is wrong twice.** It says no environment variable was added, and `DECK_SMOKE_ONLY`, `DECK_SMOKE_DEBUG`, `DECK_SMOKE_TRACE` and `--measure` are new; its impact list omits `desktop/src/main/store.ts`.
- **TST-0045 records no run.** It does not say the mode, the number of checks or the number of displays.
- **The compass never shows the quiet band's own count**, only everything out of sight; the reviewer could not reproduce this as a defect, and FEAT-0009 asks for the quiet band's count on screen at all times.

## Fix

Measure again with two panes held and a reach drawn. Drive the real mid-view change path by answering the renderer's next navigation read with one note changed. Tighten the two weak checks. Correct the five notes. Put the quiet band's count on the compass.

## Acceptance

- [x] FEAT-0009's numbers were taken with two panes held and wires drawn.
- [x] The smoke check for a change mid-view fails when `prepareChange` is disabled.
- [x] The neighbour check fails when only one neighbour is in front.
- [x] The notes say what the code and the runs show.
- [x] The compass shows the quiet band's count.

## Fixed, 2026-09-10

- **The measurement** now holds two panes and draws a reach before it turns; [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]'s numbers are from that run.
- **The mid-view change** is driven on its real path: Deck's index moves on, the renderer reads the view again, and the page answers that one navigation read with a note's status changed. The chip counted one change, nothing moved, and the click dealt the note with its new status. The `__deckHoldChange` hook is gone from the renderer.
- **The neighbour check** requires every neighbour the band can hold, 11 of 11; **the dealt check** reads the note's new status.
- **The notes**: TASK-0033 cites [[TST-0034-The-Grammar-Carries-The-New-Keys-And-The-Panel-Registry-Refuses-Strangers]]; TASK-0031's Safari line says it is the walk's; TASK-0036's front-band line is amended; the change note lists the developer's environment variables and `store.ts`; [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] records its run.
- **The compass** reads "N in the quiet band · M out of sight".
- **Two keyboard checks** that failed now and then on this machine are taken once more only when the page had lost the keyboard, and say so when they are; a failure with the keyboard held stays a failure.
