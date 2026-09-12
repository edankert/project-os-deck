---
type: "[[test]]"
id: TST-0045
aliases: ["TST-0045"]
title: "Glass is driven with a real pointer in a real window: the field, the lift, the hands, the panes, the reach, the throw and the keyboard, with the store read back and git status unchanged"
status: passing
owner: user:edwin
created: 2026-09-10
updated: 2026-09-11
source: ["[[PHASE-0002-Glass]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: integration
entrypoint: "desktop/src/main/smoke-glass.ts"
command: ""
last_verified: 2026-09-11
automation: "one command, run manually or by the deck-smoke CI job; not by run-tests.py, which has no sidecar"
covers: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]"]
issues: []
tasks: ["[[TASK-0031-The-Field-Renders-And-Turns]]", "[[TASK-0032-A-View-Switch-Re-Arranges]]", "[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]", "[[TASK-0053-Pull-Forward-And-Push-Behind]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0055-Throw-To-A-Screen]]", "[[TASK-0056-Reach]]", "[[TASK-0001-The-Whole-Edge-List-Is-One-Payload]]", "[[TASK-0003-The-Field-Renders-And-Flies]]", "[[TASK-0004-Landing-Opens-The-Note]]", "[[TASK-0060-Hide-Notes-And-Show-Them-Again]]", "[[TASK-0061-Glass-And-Spread-Draw-The-Views-Own-Desk]]", "[[TASK-0062-Desk-Panels-Throws-And-The-Tablet-Use-The-Right-Views-Desk]]", "[[TASK-0063-The-Smoke-Run-Drives-Desks-Per-View-And-Hide]]", "[[TASK-0065-The-Wheel-And-Three-Keys-Zoom-The-Field]]", "[[TASK-0066-The-Smoke-Run-Zooms-With-A-Real-Wheel]]", "[[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]", "[[TASK-0069-The-Neighbours-Gather-On-A-Ring-As-Mini-Notes]]", "[[TASK-0070-The-Orbit-Opens-A-Note-The-Same-Way]]", "[[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]]"]
artifacts: ["tools/scripts/run-smoke.sh"]
adequacy: "Measured by breaking each fix on purpose, one break per run of the Glass section. After the second review, seven breaks each made their check fail (ISS-0065 lists them); the second reviewer's four breaks failed five checks. One check cannot fail when its fix is reverted, and says so: the reduced-motion lift from a turned field (ISS-0064), because a second deal hides the first. Before any review the run found five defects in Glass before a person saw them."
mutation_score: "about 60 breaks run against the Glass section on 2026-09-10 and 2026-09-11, each seen to fail a check or recorded where one did not; not a full mutation run, which takes eight minutes a mutant"
reviewed_by: model:claude-opus-5
review_date: 2026-09-10
review_verdict: changes-requested
related: ["[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]", "[[TST-0036-The-Smoke-Run-Opens-A-Workspace-Or-Says-What-It-Skipped]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
---
# Glass is driven with a real pointer

## Purpose

`node --test` cannot load the renderer, so everything Glass does with a hand is checked in the smoke run, in a real Electron window over this repository. Every pointer goes through `webContents.sendInputEvent`, which the browser hit-tests the way it hit-tests a person's pointer. DES-0002 lost two revisions to a synthetic click that never hit-tested, and the tasks ask for a real pointer in so many words. What each gesture did is read back from the store as well as from the page.

## What it covers

- **The field.** An address with no surface opens in Glass; the near bands are elements and the quiet band has none; the toggle offers Glass, Spread and List; the same address with `surface=spread` shows the desk.
- **Lifting.** The hit test at a front card's centre finds the card; a real click lifts it, draws the ghost and the pane, changes the front label, keeps the owed count still, and asks for one context. A second lift is counted and the shared notes are marked and listed. ×, ⌥×, Escape and a background click each do exactly what they say.
- **Turning.** A drag and an arrow key turn the field and deal nothing; the compass counts what is out of sight.
- **The hands.** A pull, a refused push with its sentence, a push, the counts on the bar and the compass, the pull surviving a view switch, and let go.
- **Reach.** A pass asks nothing, a rest reaches with at most one request, moving off clears it, a second rest asks nothing, and no element is added.
- **Panes.** Drag, resize to the minimum, snap below a header, raise by the covered header, widen and replace, move by keyboard, a reload, and the same positions in Spread.
- **The keyboard.** Positions in the whole view, a lift by Tab, arrows and Enter, and the reduced-motion arrival as a highlight and a cut.
- **The view switch and a held change.** No delay per card, a transition, elements kept and moved, none reused; a held change counted on the chip and dealt only when it is clicked.
- **The throw.** The strip at the edge naming the windows that way; a throw into a reader window, onto a desk panel, onto a display with no Deck window when the machine has one, and send to by keyboard.
- **The orbit.** One request returns the whole graph and a POST is refused; every node's band is the band the sidecar's status gives the same note; Deck's links for twelve notes match the sidecar's own context; the orbit opens from the switcher; the most linked-to notes are cards and the rest dots; resting on a link shows its sentence; landing on a dot lifts the note, opens it and names it in the store; "show this in the field" flies to it; each of the three treatments draws the same notes and blocks draw no links; left alone the orbit drifts, and under reduced motion it does not.
- **After the review (ISS-0058 to ISS-0063).** A pane stored past the narrowed field is drawn inside it with no card under it; a lift under reduced motion highlights its neighbours and does not turn; a view switch under reduced motion highlights the note a person was on; a change arriving mid-view is driven on its real path; the compass counts the quiet band; a throw reaches the tablet, flies toward its edge, and under reduced motion is a cut that names its target.
- **After the second review (ISS-0064, ISS-0065).** Every shared note is dealt into the front band; the compass's quiet count equals the notes dealt there; a lift under normal motion flies the field to its neighbours; the reduced-motion cut is checked from a yaw away from the note; a reach's wire is read back from the canvas as a pixel, and the pixel is clear once the reach ends; a reduced-motion view switch highlights the card and the row; a reduced-motion landing highlights the target's name; a reduced-motion lift from a turned field leaves no card under a pane, looked at on the first turn of the event loop after the cut. Overlap is judged over every near card drawn, with no hit test.
- **After Edwin's evaluation (ISS-0066, ISS-0067).** A raised pane covers the header of the pane it lies on; a press on a pane's body raises it; in Spread a click on a card lying under another brings it forward, and a dragged card is on top where it lands.
- **Desks per view and Hide notes (FEAT-0015).** A note lifted on Issues has no pane on Features and is back in place on Issues; the bar names the other view that holds notes; Hide notes hides the panes, leaves the store's desk alone, reads "Show 2 notes", lets the field deal into the panes' space, and `H` shows them again; a reload shows them; `h` typed in the search box hides nothing; Spread's cards hide and show; the mark keeps a note on every view, drawn with its body and status on Features and as a "not in this view" card in Spread, and `V` gives it back; a press raises a note on every view above the view's own pane; Escape leaves the notes on every view and says so; a desk panel keeps its view and a throw onto it lands there; the tablet draws the Mac's current view's desk and follows a switch; an old state file draws the same panes on two views, marked.
- **Zoom (FEAT-0016).** Real wheel events: the card under the pointer stays under it; the zoom stops at 2.5× and 0.6×; a pinch zooms the field and not the page; the wheel over a pane scrolls it; Shift turns; no card is left under a pane when the wheel stops; a click at a zoomed card lifts it; in the orbit a zoomed link rests and a zoomed dot lands where it is drawn; the keys, and the keys as letters in the search box; the compass reading; a double-click resets; the bands and the orbit keep their own zoom; nothing is stored; a key's step is a cut under reduced motion.
- **The note in the middle (FEAT-0017).** The pane grows where the card stood and moves to the middle while the store keeps its place; the ring's mini notes clear the pane and each other; they keep their circular order; solid and dashed lines; resting on a line shows its sentence; the field is not dealt; a mini note is a door and the note it came from sits opposite; the dock swaps on a click and ignores a drag; Tab reaches the ring and Enter opens; Escape leaves, then sweeps; every other way out leaves and does not come back; "+N more" and the navigator's group; a cut and a highlight under reduced motion; the orbit opens a note the same way and holds still; nothing is kept across a reload.
- **Nothing is written.** `git status` in the workspace is the same before and after.

## Evidence

2026-09-10, on a Mac Studio with four displays, on the build that closed ISS-0058 to ISS-0063: `electron . --smoke` reported `ok: true` with 120 checks printed by `DECK_SMOKE_DEBUG=1` in the Glass section, none failed, none skipped; `electron . --smoke --lan` reported `ok: true` with nothing skipped or not applicable. The throw to a display with no Deck window ran because this machine has more than one display; on a single display it is reported not applicable, and [[TST-0044-The-Neighbourhood-Is-Read-Once-And-A-Throw-Is-Recognised]] carries the recogniser and the landing.

**2026-09-10, after ISS-0064 and ISS-0065**, on the same Mac Studio with four displays: `npm test`, 397 of 397; the Glass section alone, clean, four times with no check failed; `electron . --smoke` and `electron . --smoke --lan` both `ok: true`, the network run printing 125 Glass checks with `DECK_SMOKE_DEBUG=1`. The second reviewer saw the reduced-motion cut check fail once in a full loopback run; that check now waits for the earlier lift to settle and starts from a yaw away from the note, and it did not fail again here.

**2026-09-11, after ISS-0066 and ISS-0067:** `npm test`, 397 of 397; `bash tools/scripts/run-smoke.sh both` passed on loopback and failed once on the network run, at "clearing the search restores the list (14 then 0)" in the older navigator section, which waits a fixed 600 milliseconds. The network run then passed twice in a row. Each of the four new checks failed with its fix removed.

**2026-09-11, after FEAT-0015:** `npm test`, 410 of 410. The Glass section alone, clean, three times with no check failed, 150 checks. `bash tools/scripts/run-smoke.sh both` failed once in three: the loopback run's throw section drew no target strip and every later check failed in a cascade, which [[ISS-0068-The-Throw-Checks-Sometimes-Draw-No-Strip-And-Everything-After-Fails]] records; the other two passed in both configurations, as did a full loopback run with `DECK_SMOKE_DEBUG=1`. **Each of the ten new checks was seen to fail with its fix removed**, one break per run: the Glass field not told to hide (check 1), Spread's hiding rule removed (2), `H` acting inside text fields (3), every new note put on one shared desk as before (4), no lookup in Deck's index for a note outside the view (5), a raise that ignores notes on every view (6), Escape clearing every list (7), a popped-out window following the focus window's view (8), the tablet drawing its own view's desk (9), and an old desk read as the current view's only (10).

**2026-09-11, after FEAT-0016 and FEAT-0017**, on the same Mac Studio: `npm test`, 428 of 428; the Glass section alone, clean, 185 checks with none failed; `bash tools/scripts/run-smoke.sh both` exited 0. **Every new check was seen to fail with its break**, in sixteen grouped runs and eight reruns: the breaks and what caught each are in [[TASK-0066-The-Smoke-Run-Zooms-With-A-Real-Wheel]] and [[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]]. Four checks had to be strengthened first because their break passed: the orbit's dot is now checked against the canvas pixel where it is recorded, the lifted card is turned off the middle before the pane's first stage is measured, Hide notes and `W` are undone to see the middle does not come back, and × holds two notes. Two breaks are caught only through other checks, and the notes say which: a passive wheel listener (Electron never zooms the page, so check 3 cannot see it) and a view switch that does not leave the middle (an empty desk on the other view closes the middle anyway). The older checks rewritten for the middle each still fail with their original fix removed. One run hung for 75 minutes on a break that stopped a view switch leaving the middle; later runs had a 15-minute watchdog.

## Where this test's verdict comes from

**Why `command:` is empty.** `tools/scripts/run-tests.py` runs every test's `command:`, and the job that runs it has no sidecar and no display, so a smoke command there would fail for want of both. A test with a `command:` also holds no verdict of its own (`STATUSES.md`). So this note, like [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]], is a manual-verdict test: its status and `last_verified:` come from the runs recorded under Evidence, and it goes stale like any manual test.

`bash tools/scripts/run-smoke.sh both`, like [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]], and the `deck-smoke` CI job. `DECK_SMOKE_ONLY=glass` runs this section alone while developing and says so in its verdict, so a partial run can never read as a whole one.

## What the harness had to learn

Three things about `sendInputEvent`, each of which made a correct renderer look broken. A press must carry `leftButtonDown`, or the browser refuses pointer capture without a word. A drag sent in two calls must remember the button between them, or the second call's first move is a release. And on macOS the application must be asked for the keyboard with `app.focus({ steal: true })`, or Chromium holds back every element's focus event.

## Independent review, 2026-09-10

**Verdict: changes requested.** Reviewed by model:claude-opus-5 in a fresh context that started from the notes and the diff (3045a42..c283128). It ran as a subagent launched from the authoring session (the commits' `Claude-Session` trailer names the session this reviewer runs under), so what is independent is the context, not the session tree or the model family. What the reviewer ran: `npm test`, 391 of 391; the six Glass suites, 50 of 50; `DECK_SMOKE_ONLY=glass electron . --smoke`, 113 checks and none failed, on a Mac with four displays; `bash tools/scripts/run-smoke.sh lan`, exit 0; `git status` unchanged in this repository and the cockpit's after every run. Mutants were run against `desktop/dist`, which was rebuilt afterwards. R marks a finding reproduced by a command; N marks one not reproduced.

1. R — The run passes. The Glass section ran 113 checks and none failed (`DECK_SMOKE_ONLY=glass`, on four displays); `run-smoke.sh lan` exited 0; `git status` was unchanged after both.
2. R — Two checks cannot fail for the defect they name, measured with mutants in `dist/web/renderer/*.js` over one run. The held-change check passed with the real change path disabled, because it injects the change through `__deckHoldChange`. The neighbourhood check passed with 2 of 11 neighbours in front, because it accepts any count of one or more.
3. R — The pane-overlap check runs before the reading column opens, and the pane section closes the column before its reload "so ... no pane is clamped". The clamped case, where cards are dealt under a pane (FEAT-0009's review, finding 1), is the one the run does not check.
4. R — The note records no evidence from a run: not the mode, the number of checks, or the number of displays. The throw to an empty display is `notHere` on a machine with one display, so what this test verifies depends on the machine. With `command: ""`, the validator files it as a manual feature test.
5. N — In the mutated run, "under reduced motion, choosing a row highlights it" failed once. It passed in both unmutated runs, so the cause is not known: the mutants, or a flaky check.
6. N — Some checks are weaker than their labels. "The change was dealt, the card still bound to its note" accepts any status that is not null, and printed "none". The reach checks read `reaching()` rather than the canvas the wires are drawn on.
7. Not reviewed: TST-0045 also covers FEAT-0001's orbit checks. They passed in the runs above, but the orbit is outside this review.

## Second independent review, 2026-09-10

**Verdict: changes requested.** The checks added for ISS-0058, ISS-0061 and ISS-0063 each fail when their fix is reverted. But two checks this note lists still cannot fail for the defect they name, and the full run failed once on this machine while the note records it as passing.

**Who reviewed, and how independent it was.** model:claude-opus-5, the same model as the author, in a fresh context that started from the notes and the code at cd95528 (diffed against 3045a42) and has no memory of authoring the work. It is not a separate session tree: it was launched as a subagent from the authoring session (its commit trailer names the same `Claude-Session` as the commits), and its scratchpad directory is shared with the author's and the first reviewer's. Of the files already there it read only the `panes`, `reaching` and turn fields of two measurement logs, and one grep line.

**What it ran.** `npm test`: 396 of 396. Fourteen mutations of the built `dist/shared` modules, run against their suites. The Glass section of the smoke run (`DECK_SMOKE_ONLY=glass DECK_SMOKE_DEBUG=1 electron . --smoke`): once clean, 120 checks and none failed, on four displays; once with seven renderer mutations in `dist/web/renderer`. `bash tools/scripts/run-smoke.sh both`: the loopback run failed one Glass check and the network run passed. A second full loopback run: `ok: true`, 120 Glass checks. `electron . --measure --measure-workspaces <this repository>`, twice. Node probes over the built slot and field modules. `dist` was rebuilt after every mutation, and `git status` in this repository was unchanged after every run. R marks a finding reproduced by a command; N marks one that was not.

1. R — The run mostly passes, but not every time. The Glass section alone: 120 checks, none failed. The full loopback run: `ok: true` once, and once `FAILED smoke loopback: and the field cut to it rather than flying (yaw held at -1.187)`. The network run passed. That check passed only at yaw 0.000, where it tests nothing, and failed in the one run where the cut went to a card off to the side. The cause is not known; FEAT-0009's second review, finding 1, gives a likely one. The Evidence section records `ok: true` without saying the run can fail.
2. R — The new checks guard what they name. With four mutations in the built renderer, the smoke run failed five checks and passed 115. Obstacles from the stored `x` failed "and no card is drawn under it (TASK-0009)". The reduced-motion lift without its highlight failed with "(0)". `prepareChange()` disabled failed "0 notes changed" and the dealt status. The view-switch highlight removed failed with "row false, card false". This is the measurement the `adequacy` field could now cite instead of "not measured".
3. R — Two checks this note lists still cannot fail for the defect they name. "The shared notes are marked": with the renderer's `first` set removed, the run read "8 joined to more than one" with 2 marked and passed, because the check compares marks only with the shared cards that are drawn. "The compass counts the quiet band": with the count forced to 0, the run printed "0 in the quiet band" and passed, because the check is a regular expression for any digits.
4. R — The reduced-motion lift check starts from a front card at yaw 0. So it cannot see the case FEAT-0010's second review reproduces, a lift from a turned field that leaves cards under the pane.
5. N — The reduced-motion view-switch check requires only the row (`marked.row && !marked.animate`); the card's highlight is printed and not required. Found by reading; no mutation was run.
6. R — This note is `passing` while its latest review verdict is `changes-requested`, and the independent-review skill says to keep an item out of terminal status until the loop closes. `command:` is still empty (the first review's finding 4).
7. N — The reach checks still read `reaching()` rather than the canvas the wires are drawn on (the first review's finding 6, second half, unaddressed).

**The first review's findings.** Finding 2 is addressed and guarded, and so is finding 3. Finding 4 is partly addressed: the run is now recorded, but `command:` is still empty. Finding 5 is addressed by a retake when the window has lost the keyboard; in this reviewer's runs it was never needed. Finding 6's dealt check is fixed, and its reach half is not (finding 7 above).

## FEAT-0018's checks, added 2026-09-12

Fourteen checks for four bands, every remainder stated, and a reachable quiet band, in the same suite this note names.

**Green on an isolated display**: `run-smoke.sh both`, run 34698491628, `ubuntu-latest` under `xvfb`, 12m12s, loopback and LAN. The check that matters is "a click on the quiet band's <id> puts it on the desk", which is [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]'s repro driven by a real pointer.

**Three defects the run found before it went green**, none of which any node check could have seen: the quiet band's tab stop swallowed the click on its own tile, because it is a `<button>` and the field's `pointerdown` ignores anything inside one; the conservation check added two different overflow counts and so counted four notes twice; and the check picked tiles standing behind panes and cards, which are correctly unclickable.

**The breaks are still owed.** Each new check has to be seen to fail with its fix removed, one break per run, and the quiet-band click has to be seen to fail against the code as it stood before FEAT-0018. Those runs wait on a local display that is not the one Edwin is typing on.

## The breaks, 2026-09-12

Three, one run each, in [[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]]'s container. Each was confirmed present in the tree before its run, and in every case the break's own check was **the only new failure**.

| The break | What failed |
|---|---|
| The field stops consulting `tileAt` on `pointerup` — [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]'s defect | "a click on the quiet band's ISS-0027 puts it on the desk (ISS-0073)" |
| `paintCanvas` stops skipping a promoted note | "no note is painted and drawn as an element in the same frame (8)" |
| Detail keyed to the band rather than the drawn width — [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]'s defect | "zooming a mid-band card shows more of its note (brief to brief)" |

The second closes a gap [[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]] recorded rather than hid: no node check can see a note painted and drawn as an element in the same frame.

Eleven of the fourteen checks have no break of their own. A run in the box costs about half an hour, and the three chosen are the ones nothing else covers; the deal, the shapes and the thresholds underneath them are pure and are each broken deliberately in their own suites, where a break costs seconds.
