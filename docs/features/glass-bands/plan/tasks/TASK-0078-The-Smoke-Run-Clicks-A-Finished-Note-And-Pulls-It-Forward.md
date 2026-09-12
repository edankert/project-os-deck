---
type: "[[task]]"
id: TASK-0078
aliases: ["TASK-0078"]
title: "The smoke run clicks a finished note with a real pointer, pulls it forward, walks the shelf with the keyboard, and finds a note in the fourth band that used to be drawn nowhere"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]"]
parent: "FEAT-0018"
effort: "M"
due: ""
depends: ["TASK-0075", "TASK-0076", "TASK-0077"]
blocks: ["TASK-0079"]
related: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TASK-0066-The-Smoke-Run-Zooms-With-A-Real-Wheel]]", "[[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The smoke run clicks a finished note and pulls it forward

## Objective

Every acceptance line of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]] that needs a real window is driven in one, by a real pointer and a real keyboard, in `desktop/src/main/smoke-glass.ts`. The check that matters most is the one that fails today: click a finished note and find it on the desk.

## Detail

**The checks, each shown to fail with its fix removed.**

- **A finished note is clicked and lands on the desk.** Turn to face the quiet band, click a tile at a real screen position, and assert the note is held. This is [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]'s repro, and it must be seen to fail against the code as it stands today.
- **A finished note is pulled forward and stays there.** Pull it, switch view, and assert it is still in the front band. No new gesture: this is [[FEAT-0014-The-Hands]]'s pull reaching a note it could not reach before.
- **The keyboard walks the shelf.** Tab to the quiet band, arrow along it, Enter, and assert the note is held. Assert the band contributes one tab stop and not one per tile.
- **A note in the fourth band exists and is reachable.** On a view whose middle overflows, assert that a note past the middle's capacity has a drawn position, is clicked and lifts.
- **Every remainder is on screen.** Read the bar and the compass and assert the four counts, against the numbers `dealField` reports.
- **Zoom adds detail.** Zoom a mid-band card and assert its face line and owed verb become visible; zoom further and assert the status and progress appear.
- **A tile promotes and demotes.** Zoom into the quiet band until a tile is an element, assert it is clickable as a card, zoom out and assert it is painted again.
- **The orbit is unchanged.** Every existing orbit check still passes, at 1× and zoomed.
- **The shape does not move underneath a person.** Change one note's status while the field is on screen and assert no band's geometry changed; switch view and assert it did.

**Run it the way this repository now runs it.** [[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times]] is Edwin's: the smoke run defaults to not taking focus. Window-opening runs wait until he says, and the node suites are what runs while he is working.

## Acceptance

- Each new check is seen to fail with its fix removed, and which check caught which break is recorded in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].
- `bash tools/scripts/run-smoke.sh both` passes.
- The quiet-band click check fails against the code as it stands before this feature, and that run is recorded.
- No check steals the keyboard by default.

## Steps

- [ ] Add the checks above to `desktop/src/main/smoke-glass.ts`.
- [ ] Add whatever the page has to report for them — where a tile is on screen, which notes are promoted, what the bar reads — beside the existing `whereIs` and `dotFor`.
- [ ] Run each break, one per run, and record the results in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].
- [ ] Ask Edwin before the first window-opening run.

## Notes

`TST-0045` is an existing note and gains these checks rather than being replaced.
