---
type: "[[issue]]"
id: ISS-0069
aliases: ["ISS-0069"]
title: "The approve and decline buttons take a full-height column of their own between the desk and the reader in Spread and List, because their container sits in the window's row of columns instead of in the reader"
status: triage
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["Edwin 2026-09-11: 'On spread an list when selecting an item which needs to be approved or declined it opens a huge vertical area on the right, this should probably be handled differently and shown as just a strip somewhere??? Review and suggest.'", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]"]
severity: medium
component: renderer
parent: ""
related: ["[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "[[FEAT-0013-The-First-Write]]", "[[TASK-0049-The-Actuator-Row-And-One-Transition]]", "[[ISS-0045-A-Dead-Verb-Is-Drawn-Exactly-Like-A-Working-One]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# The approve and decline buttons take a full-height column beside the reader

## Problem

**In Spread and List, selecting a note that can be approved or declined opens a column as tall as the window between the desk and the reader, holding only a few buttons.** The buttons belong in a single line with the note. The column is a layout mistake, not a design: the buttons' container was placed in the window's row of columns instead of inside the reader. How to show them instead is Edwin's choice between three options, below; nothing is built until he picks one.

> [!quote] As reported — 2026-09-11 (user:edwin)
> "On spread an list when selecting an item which needs to be approved or declined it opens a huge vertical area on the right, this should probably be handled differently and shown as just a strip somewhere??? Review and suggest."

## Cause

In `desktop/src/renderer/index.html` the verbs live in `<div class="actuators" id="actuators">`, which is a direct child of `<div class="body">`. `.body` is a flex row (`display: flex` in `desktop/src/renderer/deck.css`) whose children are the window's columns: rail, navigator, desk, verbs, reader. When a note offers verbs the div loses its `hidden` attribute and becomes a flex item of its own, stretched to the row's full height. Its own style, padding and a bottom border, shows it was meant as a strip above the note. [[TASK-0049-The-Actuator-Row-And-One-Transition]]'s step reads "Draw the rows in the reader", and the div was put beside the reader instead.

## Repro

1. `cd desktop && npm start`, open a workspace with an issue at `triage` or a design at `proposed`.
2. Switch the surface to Spread or List and click that note.
3. A column appears between the desk and the reader, the full height of the window, holding the verb buttons at its top.

## Expected

The buttons take one line where the person is reading the note, and the reader keeps its width.

## Actual

A full-height column of its own, which narrows the desk or the list.

## Three ways to show the verbs, from [[REFERENCE-FOCUS-ZOOM-AND-VERBS]], recommendation 3

1. **One line at the top of the reader** (the reference recommends this). The buttons sit in a single row above the note's text, and stay visible while the note scrolls. It is where the person is already looking, it takes one line instead of a column, and it fixes the defect by moving one element. Two things to settle if this is chosen:
   - The reference puts a disabled verb's reason in its tooltip rather than as text. [[ISS-0045-A-Dead-Verb-Is-Drawn-Exactly-Like-A-Working-One]]'s fix shows the reason beside the disabled button, and [[TASK-0049-The-Actuator-Row-And-One-Transition]] asks for "the row's own reason". A tooltip is not reachable by touch and is slow by keyboard, so the reason should stay visible (a short line under the buttons, say) or those two notes should be amended.
   - `openCard()` in `desktop/src/renderer/renderer.ts` replaces the reader's whole contents with the note (`el.reader.replaceChildren(article)`). The strip must live in its own element that the note's content does not replace, or it disappears each time a note opens.
2. **On the pane's header in Glass.** The note in the middle ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]) would carry the verbs as buttons beside ↗, ⇥ and ×. Right for Glass, but Spread and List have no pane, so it does not fix what was reported. It also needs a decision: [[PHASE-0002-Glass]] states that "the reader carries the verbs", and a pane is not the reader.
3. **A decision bar across the bottom of the window**, like the status line: "ISS-0012 is owed: approve · decline". Always visible, but far from the note, and it competes with the status messages.

The reference suggests the first now, and the second in Glass once the note in the middle exists.

## Evidence

- `desktop/src/renderer/index.html`: `.actuators` between `#field-area` and `#reader`, inside `.body`.
- `desktop/src/renderer/deck.css`: `.body { display: flex; ... }` and `.actuators { display: flex; padding: 8px 12px; border-bottom: 1px solid var(--line); ... }`.
- Read on 2026-09-11 by the main session ([[REFERENCE-FOCUS-ZOOM-AND-VERBS]], "What Deck does today") and again at planning.

## Sibling search

No sibling found (searched `docs/issues/` for "actuators", "column", "verb", "approve", "decline"). [[ISS-0039-Deck-Draws-Two-Verbs-On-A-Design-Note-That-It-Cannot-Perform]], [[ISS-0040-The-Reason-Is-Asked-For-Only-On-A-Verb-That-Confirms]] and [[ISS-0045-A-Dead-Verb-Is-Drawn-Exactly-Like-A-Working-One]] concern which verbs are drawn and how they behave, not where.

## Phase

Inherited from [[FEAT-0013-The-First-Write]], which built the verbs, so this is one more open item under [[PHASE-0001-Deck]] until it is resolved. If Edwin chooses option 2, the issue moves to [[PHASE-0002-Glass]].

## Risk scan

No trigger applies: the fix moves an element and adds no dependency, setting, path or exposure. The write path itself ([[FEAT-0013-The-First-Write]]) is untouched.

## Next Actions

- [ ] **Edwin chooses one of the three options.** This waits on him.
- [ ] Then a task under [[FEAT-0013-The-First-Write]] (or under FEAT-0017 for option 2) moves the verbs and adds a smoke check that the verb strip's height is one line and that the reader's width is unchanged when a note offers verbs, shown to fail with the old placement.
