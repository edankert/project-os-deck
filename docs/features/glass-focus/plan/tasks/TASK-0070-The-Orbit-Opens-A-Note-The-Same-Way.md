---
type: "[[task]]"
id: TASK-0070
aliases: ["TASK-0070"]
title: "The orbit opens a note the same way: the note in the middle, its direct links on the ring as mini notes, the orbit dimmed and still behind, and back at the same pixel after leaving"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "Edwin 2026-09-11: 'when selecting something in orbit the main item should open up and all the directly connected items show as mini notes'"]
parent: "FEAT-0017"
effort: "S"
due: ""
depends: ["TASK-0069"]
blocks: ["TASK-0071"]
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[TASK-0003-The-Field-Renders-And-Flies]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The orbit opens a note the same way

## Objective

A click on a dot or a card in the orbit opens the note in the middle, with the notes it links to and the notes linking to it on the ring as mini notes. This is Edwin's first sentence about selection, for the orbit. The orbit stays behind it, dimmed and still, and comes back exactly as it was when the note leaves the middle.

## Detail

**The same focus.** A landing in the orbit is already a lift (`tap()` and `lift()` in `desktop/src/renderer/glass.ts`, [[TASK-0004-Landing-Opens-The-Note]]), so it turns the middle on through [[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]'s switch. Stage one grows the pane from the dot's position, or from the card's rectangle for the most linked-to notes the orbit draws as cards. The ring's neighbours start from their dots or cards and come from the same context read as in the bands, so one note shows the same ring on both surfaces ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]], decision 18).

**The orbit behind.** Dimmed and drawn at 0.85 of the zoom like the bands. The orbit has no deal and no pane obstacles (`redealOrbit()`), so nothing needs to be kept still except the drift: the slow turn that starts after four seconds untouched (`scheduleIdle()`, `IDLE_AFTER_MS`) does not start while a note is in the middle. After leaving, the drift waits its four seconds again.

**Leaving.** The panes return to their stored places, the mini notes return to their dots and cards, and every dot and card is at the pixel it was at before the lift, with the same turn and the same zoom.

**The line's sentence** comes from the orbit's edge list, already in memory, with no extra request.

**"Show this in the link graph"** (◎ or `O` on a pane) switches surface, which leaves the focus by decision 2, and then flies as it does today.

**What the orbit may show of a note.** [[TASK-0004-Landing-Opens-The-Note]] allows no note content in the field beyond id, title, status and a link's sentence. A mini note shows id and title; the pane is the desk's reader, as before.

## Acceptance

- A real click on an orbit dot opens its note in the middle, with its direct links as mini notes on the ring over the dimmed orbit.
- The ring for a note is the same set of ids in the orbit as in the bands.
- While a note is in the middle, the orbit's turn does not change over six seconds untouched; after leaving, the drift resumes after `IDLE_AFTER_MS`.
- After Escape, every drawn dot and card is within 0.5 px of where it was before the lift, and the turn and zoom are unchanged.
- Resting on a line shows its sentence without a new graph request.
- A mini note carries only an id and a title.
- Under reduced motion the orbit's focus is a cut and is highlighted.

## Steps

- [x] Start stage one from the dot or the card in the orbit.
- [x] Stop the drift while a note is in the middle; resume the idle timer on leaving.
- [x] Check that leaving restores every position exactly, and that ◎ leaves the focus before it flies.
- [x] Leave the smoke checks to [[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]].
- [x] Append to [[FEAT-0001-The-Corpus-Has-An-Inside]], at the end of "Where this stands", this paragraph: "**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** At Edwin's request, landing on a note in the orbit now opens it in the middle of the screen, with the notes it links to and the notes linking to it on a ring around it as mini notes that show only id and title. The orbit stays behind, dimmed and without drifting, and every dot is back at the same place when the note leaves the middle. Landing is still a lift onto the desk, and the pane is still the desk's reader."
- [x] Append to [[TASK-0004-Landing-Opens-The-Note]], at the end of its Outcome, this paragraph: "**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** Landing now also puts the note in the middle of the screen with its direct links on a ring around it. The acceptance above still holds: landing routes through the desk and the address, the ring's mini notes show only id and title, and nothing in the field discharges a verb."

## Outcome

**Done 2026-09-11.** Landing on a dot in the orbit opens the same middle over the dimmed orbit, growing from the dot, with the ring from the same context read the bands use. The orbit's drift stops while a note is in the middle (both the idle timer and the frame loop check it) and resumes after it. Leaving puts every dot back at the same pixel with the same turn and zoom. The amendments are on [[FEAT-0001-The-Corpus-Has-An-Inside]] and [[TASK-0004-Landing-Opens-The-Note]].
