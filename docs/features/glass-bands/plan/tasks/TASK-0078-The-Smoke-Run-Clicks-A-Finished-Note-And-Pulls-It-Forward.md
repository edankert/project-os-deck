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

## Where this stands

**2026-09-12: the checks are written and have never been run.** `desktop/src/main/smoke-glass.ts` gains a FEAT-0018 section with fourteen checks, `desktop/src/renderer/glass.ts` gains `bandState()` for them to read, and both typechecks are clean. Nothing about them is proven until a window opens.

**They are deliberately not run yet.** This task's own last step is "Ask Edwin before the first window-opening run", and the run takes the keyboard away from whatever he is doing 23 times ([[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times]], which he has decided and which is not built). The node suites are what has been run: 465 checks, all passing.

**What the checks cover**, each needing a real pointer or a real window:

1. Every note the view holds is in a band or counted, read off the page rather than off `dealField`.
2. The bar names every non-zero remainder and no other.
3. The compass says what the quiet band holds.
4. **A real click on a quiet-band tile puts that note on the desk.** This is [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]'s repro and the check that must be seen to fail against the code before this feature.
5. The quiet band adds one tab stop; an arrow key walks the shelf; Enter lifts.
6. Nothing is promoted at 1x; zooming promotes; no note is painted and drawn as an element in the same frame; zooming out paints them again. The third of those is the break [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]] recorded that nothing in node could catch.
7. Zooming a mid-band card shows more of its note — [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]'s repro.
8. Lifting a note leaves every band's shape where it was.

**Owed before this task is done:** the run itself, each break one per run, and the results written into [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].

## Four runs, 2026-09-12, and why they stopped

**Run on Edwin's word ("run both now"), and stopped on his word four runs later: "I am using the computer keyboard at the same time! This is not working for me!"** The smoke run takes the keyboard 23 times ([[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times]]), and a person typing takes it back, so the two fight for it.

### What the runs proved

**The check this feature exists for passes.** A real pointer click on a quiet-band tile puts that note on the desk — [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]'s repro, green. So does the conservation line, the bar's remainders, the compass, the one tab stop and the arrow walk.

**Three defects were found by running it, all real, all now fixed.**

1. **The quiet band's tab stop swallowed the click on its own tile.** It is a `<button>` drawn over the tile the keyboard cursor is on, and the field's `pointerdown` ignores anything inside a `button`, so the first tile a person clicked lifted nothing. It now takes no pointer events at all: the mouse reaches a tile through `tileAt`, and Enter and Space still reach a focused button. Found on the first run; no node check could have seen it.
2. **The conservation check counted four notes twice.** `dealField`'s remainder ("the band was full") and `assignSlots`'s ("a pane took the slot") are different reasons a note is not drawn, and a note in the second is still in its band's list. `bandState` now reports them as two fields, the check uses the deal's, and the bar goes on printing the sum because a person only wants to know how many they are not seeing.
3. **The check picked tiles standing behind panes and cards.** Facing the quiet band, the middle band's outer columns are in sight and the sections above leave panes open. A tile under one is correctly unclickable, so the check swept the desk first and now takes only a tile the field itself is topmost over.

### What the runs could not settle

**The results are not repeatable while a person is using the machine.** Four runs gave four different failure sets, and the failures moved around checks that need the window to hold the keyboard: "the window had lost the keyboard", a flight measured as a cut, Enter reaching nothing, a ring drawn with no neighbours. None is in this feature's section; all are older checks that assume focus. [[ISS-0068-The-Throw-Checks-Sometimes-Draw-No-Strip-And-Everything-After-Fails]] is the same shape of problem already on the record.

**So this task is not done, and the reason is [[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times]].** Its decision was taken on 2026-09-12 — "default the run to no-focus" — and building it is what makes this run mean anything. Owed after that: the run itself, each break one per run, and the results in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].
