---
type: "[[test]]"
id: TST-0045
aliases: ["TST-0045"]
title: "Glass is driven with a real pointer in a real window: the field, the lift, the hands, the panes, the reach, the throw and the keyboard, with the store read back and git status unchanged"
status: passing
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[PHASE-0002-Glass]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: integration
entrypoint: "desktop/src/main/smoke-glass.ts"
command: ""
last_verified: 2026-09-10
automation: "one command, run manually or by the deck-smoke CI job; not by run-tests.py, which has no sidecar"
covers: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]"]
issues: []
tasks: ["[[TASK-0031-The-Field-Renders-And-Turns]]", "[[TASK-0032-A-View-Switch-Re-Arranges]]", "[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]", "[[TASK-0035-A-Note-Is-Lifted-And-Put-Back]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]", "[[TASK-0053-Pull-Forward-And-Push-Behind]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0055-Throw-To-A-Screen]]", "[[TASK-0056-Reach]]"]
artifacts: ["tools/scripts/run-smoke.sh"]
adequacy: "Not measured by mutation: each run takes about four minutes. What it has caught is recorded instead. It found five defects in Glass on 2026-09-10 before a person saw them: a transition cut short by a broadcast, a raised pane covering another’s header, a pane hidden behind the reading column, a target strip that vanished as the pointer reached for a name, and a reach cancelled by a focus that arrived late. Each has a check here that failed before its fix and passes after."
mutation_score: "not measured (the run takes four minutes); five defects found and fixed on 2026-09-10"
reviewed_by: ""
review_date: ""
review_verdict: ""
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
- **Nothing is written.** `git status` in the workspace is the same before and after.

## Where this test's verdict comes from

`bash tools/scripts/run-smoke.sh both`, like [[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]], and the `deck-smoke` CI job. `DECK_SMOKE_ONLY=glass` runs this section alone while developing and says so in its verdict, so a partial run can never read as a whole one.

## What the harness had to learn

Three things about `sendInputEvent`, each of which made a correct renderer look broken. A press must carry `leftButtonDown`, or the browser refuses pointer capture without a word. A drag sent in two calls must remember the button between them, or the second call's first move is a release. And on macOS the application must be asked for the keyboard with `app.focus({ steal: true })`, or Chromium holds back every element's focus event.
