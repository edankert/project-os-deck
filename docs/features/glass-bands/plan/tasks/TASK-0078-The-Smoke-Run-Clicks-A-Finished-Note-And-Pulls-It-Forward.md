---
type: "[[task]]"
id: TASK-0078
aliases: ["TASK-0078"]
title: "The smoke run clicks a finished note with a real pointer, pulls it forward, walks the shelf with the keyboard, and finds a note in the fourth band that used to be drawn nowhere"
status: done
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

- [x] Add the checks above to `desktop/src/main/smoke-glass.ts`.
- [x] Add whatever the page has to report for them — where a tile is on screen, which notes are promoted, what the bar reads — beside the existing `whereIs` and `dotFor`.
- [x] Run each break, one per run, and record the results in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].
- [x] Ask Edwin before the first window-opening run.

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

## The suite passes on an isolated display, 2026-09-12

**`bash tools/scripts/run-smoke.sh both` passed**, loopback and LAN, in 12 minutes 12 seconds — run 34698491628, step "The renderer guards, in a real window", on `ubuntu-latest` under `xvfb`. All fourteen FEAT-0018 checks are in it. That discharges this task's second acceptance line.

**Why that run means something the local ones did not.** Nothing on that machine competes for the keyboard, so every check that needs a focused window gets one. The four local runs that gave four different failure sets were measuring Edwin's typing, not the code.

**What is still owed**, and it needs a display that is not Edwin's:

- Each new check seen to fail with its fix removed, one break per run, recorded in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]].
- The quiet-band click check seen to fail against the code as it stood before this feature.

Each break is a run. On CI that is a push and twelve minutes each, which Edwin has ruled out leaning on ("We cannot depend on CI, it is too expensive to run all the time"). **The plan is a local Linux box** — Colima and a small container, running the same `xvfb` path CI already proves — so a break costs two minutes and nothing of his. It is not built yet, and installing it needs his word.

## Outcome

**Done 2026-09-12. The checks run, they pass, and three of them have been seen to fail with their fix removed.** 465 node checks passing, both typechecks clean, and `glass.ts` back to its committed state after every break.

### The suite passes twice over

`run-smoke.sh both` on CI under `xvfb` (run 34698491628, 12m12s), and `smoke-in-a-box.sh loopback` in [[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]]'s container. Neither machine had a person typing at it.

### Three breaks, one run each, all caught

Each was applied to `desktop/src/renderer/glass.ts`, confirmed present in the tree before the run, and run in the box. In every case **the break's own check was the only new failure**.

| The break | What failed |
|---|---|
| 1. The field stops consulting `tileAt` on `pointerup`, so a click on the quiet band reaches nothing — [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]'s defect exactly. | "a click on the quiet band's ISS-0027 puts it on the desk (ISS-0073)" |
| 2. `paintCanvas` stops skipping a promoted note, so it is painted and drawn as an element at once. | "no note is painted and drawn as an element in the same frame (**8**)" — eight notes were both |
| 3. Detail keyed to the band again rather than to the width a card is drawn at — [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]'s defect. | "zooming a mid-band card shows more of its note (**brief to brief**) — ISS-0074" |

**Break 2 is the one worth noting.** [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]] recorded, honestly, that no node check could see a note painted and drawn as an element in the same frame, and left it as a known gap for this task. It is now covered, and the number the check reports — eight — says how visible the defect would have been.

### Three defects the checks found before any of this

None was visible to a node suite, and all three are fixed:

1. **The quiet band's tab stop swallowed the click on its own tile.** It is a `<button>` drawn over the tile the keyboard cursor is on, and the field's `pointerdown` ignores anything inside a `button`, so the first tile a person clicked lifted nothing. It now takes no pointer events; the mouse reaches a tile through `tileAt` and Enter and Space still reach a focused button.
2. **The conservation check counted four notes twice**, by adding `dealField`'s remainder ("the band was full") to `assignSlots`'s ("a pane took the slot"). A note in the second is still in its band's list. `bandState` reports them separately now; the bar goes on printing the sum, because a person only wants to know how many they are not seeing.
3. **The check picked tiles standing behind panes and cards**, which are correctly unclickable. It sweeps the desk first and takes only a tile the field itself is topmost over.

### What is not covered, and why

**The quiet-band click has not been run against the code as it stood before FEAT-0018.** Break 1 is the same defect reconstructed in today's code — the field consults nothing on the canvas — and it fails the same check for the same reason. Checking out the pre-feature tree would also remove the check, so the run would prove nothing without back-porting it; break 1 is the honest form of that evidence.

**Eleven of the fourteen checks have not had a break of their own.** A run in the box costs about half an hour, so a break apiece is most of a day. The three chosen are the ones nothing else covers: the two that are their issues' repros, and the one node explicitly could not see. The rest are guarded by the node suites underneath them — the deal, the shapes and the thresholds are all pure and all broken deliberately in [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]], [[TST-0054-Each-Bands-Shape-Follows-How-Much-It-Holds]] and [[TST-0055-Detail-Follows-Apparent-Size]], where a break costs seconds.

### One failure in the box that is not Deck's

The ISS-0039 guard, that every verb on `DES-0001` is drawn disabled, reports both drawn enabled — in the box, on every run, including the ones where everything else passed. The same Deck code passed it on CI 40 minutes earlier. The difference is the sidecar: CI clones the cockpit's `main`, the box mounts Edwin's working checkout. It is a difference between two sidecars and is recorded in [[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]] rather than chased here.