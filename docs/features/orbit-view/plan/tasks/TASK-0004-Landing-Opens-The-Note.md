---
type: "[[task]]"
id: TASK-0004
aliases: ["TASK-0004"]
title: "Landing opens the note in the reader that already exists, so the field never becomes a second document pane"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-05
updated: 2026-09-11
source: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
parent: "FEAT-0001"
effort: ""
due: ""
depends: ["TASK-0003", "TASK-0035"]
blocks: []
related: ["[[project-os-cockpit#ADR-0020]]", "[[FEAT-0010-Lifting-A-Note]]", "[[PHASE-0002-Glass]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Landing opens the note

## Objective

Landing on a node lifts that note onto the desk and opens it in Deck's reader, the pane Spread already opens notes in. Any note can send you the other way — "show this in the field" — with the camera flying to it rather than cutting.

## Detail

**Landing is lifting.** [[FEAT-0010-Lifting-A-Note]]'s TASK-0035 defines how a note leaves the field for the desk: a click lifts it, its slot stays behind ghosted, and three non-destructive verbs put it back. Landing in the orbit uses that same mechanic, so a note reached by flying and a note reached by clicking a row end up in the same place and are closed the same way.

The temptation is a panel inside the field showing a summary of the note. That panel becomes a second, worse renderer, and this project has a rule about second parsers ([[project-os-cockpit#ISS-0151]]) for exactly this reason.

**No verb is discharged in the field.** What is owed on a note appears where the note is ([[project-os-cockpit#ADR-0020]]). The field may show *that* something is owed — a halo, a mark — and landing is how you act on it.

## Acceptance

- Landing routes through the existing navigation and the desk, so the address, the desk and the reader all show the landed note
- A note offers "show this in the field" and the camera flies rather than cuts, so the reader keeps their bearings
- No note content is rendered inside the field beyond id, title, status and the edge sentence
- Nothing in the field discharges a verb

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `TASK-0595` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).

## Outcome

**Done 2026-09-10.** Landing on a dot or a card in the orbit is a lift: the note goes onto the desk through the same `put-on-desk` action, becomes a pane, and is focused, so the address, the desk and the reader all name it. A pane carries ◎, "show this in the link graph", and O on its header does the same: Deck switches to the orbit and flies to the note rather than cutting. In the orbit the navigator lists every card it draws and every note with no link, so each is reached by keyboard. Nothing of a note is drawn in the field but its id, title, type, status and a link's sentence; the pane is the desk's reader, and the verbs stay in the reading column.

**Evidence.** [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]: a real click on a dot lifts it, opens it and names it in the store; ◎ turns the orbit to face it, with frames in between, so it flew.

**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** Landing now also puts the note in the middle of the screen with its direct links on a ring around it. The acceptance above still holds: landing routes through the desk and the address, the ring's mini notes show only id and title, and nothing in the field discharges a verb.
