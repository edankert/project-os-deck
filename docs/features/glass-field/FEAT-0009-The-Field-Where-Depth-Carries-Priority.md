---
type: "[[feature]]"
id: FEAT-0009
aliases: ["FEAT-0009"]
title: "The field where depth carries priority: Glass is the view Deck opens, and what needs you is in front"
status: review
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-07
updated: 2026-09-10
source: ["Edwin 2026-09-07: 'I am still very much thinking that glass should be the main view, so let's build glass now first, iron out issues and then work on parity'", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]"]
goal: "Deck opens on Glass: the notes of the current view arranged in a field where distance says how much a note needs you, with what is owed in front, the view's own subject in the middle and the quiet work behind you. Switching view moves the same cards rather than loading a page, and the navigator beside the field stays the route for the keyboard and the screen reader."
requirements: []
tasks: ["[[TASK-0029-The-Band-Function]]", "[[TASK-0030-The-Slot-Geometry]]", "[[TASK-0031-The-Field-Renders-And-Turns]]", "[[TASK-0032-A-View-Switch-Re-Arranges]]", "[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]", "[[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0002-The-Glass-Cockpit]]"
related: ["[[PHASE-0002-Glass]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0001-The-Corpus-Has-An-Inside]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[FEAT-0007-Views-Come-From-A-Provider]]", "[[FEAT-0006-Every-State-Has-An-Address]]", "[[DES-0002-The-Glass-Cockpit]]", "[[REFERENCE-DES-0002-REVIEW]]", "[[TST-0023-Glass-Opens-First-And-A-Days-Notes-Are-Read-In-It]]"]
reviewed_by: model:claude-opus-5
review_date: 2026-09-10
review_verdict: changes-requested
---

# The field where depth carries priority

## Goal

**Deck opens on Glass, and in Glass the notes that need you are the ones nearest to you.** The **field** is the notes of the current view arranged in depth. Cards in the **front band** are the notes the sidecar says are owed to a person. Cards in the **mid band** are the view's own subject, grouped the way the navigator already groups them. The **quiet band** is the finished and suppressed work, placed behind you, small, counted, and one turn away. Switching from Features to Issues does not load a page: the same cards move to their new places, so a person watches a note change importance instead of finding it somewhere else.

Glass is a surface over the views Deck already has. The view provider still decides which views exist ([[FEAT-0007-Views-Come-From-A-Provider]]), and the view still decides which notes it holds and how they are grouped, exactly as the navigator draws them today. Glass only decides where those groups stand. The navigator stays beside the field and remains the route for the keyboard and the screen reader.

## Scope

**In scope.** The **band function**, one table from the groups the sidecar already sends to the three bands, per view, with overflow stated on screen rather than dropped ([[TASK-0029-The-Band-Function]]). The **slot geometry**, a cylinder of slots dealt from the bands, with a shape for a thousand quiet tiles and obstacles that are sectors of the cylinder ([[TASK-0030-The-Slot-Geometry]]). The **renderer**: near cards are real elements bound to their notes and drawn with the faces Spread already has, the quiet band is one canvas of id tiles, distance is drawn with fog and less detail rather than blur, and a card can be hit with a real pointer ([[TASK-0031-The-Field-Renders-And-Turns]]). **View switching as re-arrangement**, and a change arriving while a person looks is announced rather than applied ([[TASK-0032-A-View-Switch-Re-Arranges]]). **The address and the default**: a state says whether it is shown as Spread or Glass, Glass is what opens when the address does not say, and the navigator beside the field is the keyboard route ([[TASK-0033-Glass-Is-Addressed-And-Opened-First]]). **The measurement**: the frame time while turning on the fleet's largest workspace, written into this note as numbers ([[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]).

**Out of scope.** The console as furniture in the field, and the carousel of consoles and sessions. Those need a terminal Deck does not have, and the terminal is [[PHASE-0004-Parity]]. Discharging a verb in the field: Deck reads, and the reader carries the verbs when it has them. Lifting a note onto the desk and the neighbourhood that comes with it, which is [[FEAT-0010-Lifting-A-Note]]. The orbit arrangement, where distance is connectedness rather than obligation, which is [[FEAT-0001-The-Corpus-Has-An-Inside]]. A light-mode Glass, which no design has drawn. A new sidecar endpoint: this feature reads the navigation payload Deck already reads, and the sidecar is not changed for Deck.

## Acceptance

- Opening a workspace in Deck shows Glass for the workspace's default view, unless the address asks for Spread.
- Every note the sidecar's Needs-you group holds for the current view is in the front band, or the front band shows a count of how many more there are. No owed note is silently placed further back.
- The mid band holds the view's own groups in the navigator's order, and the quiet band holds the suppressed group, behind the person, with its count on screen at all times.
- Switching view moves the cards that stay in the view to their new places, and a card that leaves fades out rather than sliding into another note's place.
- A change to the notes that arrives while the field is on screen is announced with a count, and the field re-deals only when the person acts on it.
- Every card in the front and mid bands can be reached and opened from the navigator using the keyboard only, and a screen reader says a row's position in the whole view rather than in the drawn window.
- With reduced motion requested, arriving at a note is shown by a highlight and a scroll, never by nothing.
- No element that sits over the moving field carries a backdrop filter, and no card carries a blur.
- The median frame time while turning, measured on Your Trainer in a foreground window, is written in this note as a number, together with the count of elements in the document and the count of tiles on the canvas.
- The same address opened in Safari on a tablet, served by Deck's own host, shows the same field, and a far card is opened by flying to it first.

## Links

- Phase: [[PHASE-0002-Glass]]
- Decision: [[ADR-0002-Glass-Is-The-Main-View]]
- Tasks: [[TASK-0029-The-Band-Function]], [[TASK-0030-The-Slot-Geometry]], [[TASK-0031-The-Field-Renders-And-Turns]], [[TASK-0032-A-View-Switch-Re-Arranges]], [[TASK-0033-Glass-Is-Addressed-And-Opened-First]], [[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]]
- Acceptance walk: [[TST-0023-Glass-Opens-First-And-A-Days-Notes-Are-Read-In-It]]
- Plan: `docs/features/glass-field/plan/PLAN.md`
- Design: [[DES-0002-The-Glass-Cockpit]], reviewed in [[REFERENCE-DES-0002-REVIEW]]

## Measured

**2026-09-10, on a Mac Studio (Apple M2 Max, 12 cores, 34 GB, macOS 26), with `electron . --measure`.** The window was brought in front and focused, the page confirmed it had focus, and the meter recorded a frame only while the document was visible and focused; every run held both, over about 300 frames of a five-second turn through the quiet band of the Issues view. **Two notes were held as panes and a reach was drawn from a card while it turned**, which is the field a person will use; the first measurement had neither, which the review found (ISS-0063), and these numbers replace it. The renderer is the review's hybrid: bound cards for the near bands, one canvas for the quiet band.

| Workspace | Notes | Frame time, median / 95th percentile | Script work per frame, median / 95th | The same work at 4× CPU cost | Most tiles on the canvas | Elements in the document |
|---|---|---|---|---|---|---|
| Your Trainer | 2,734 | 16.7 / 17.0 ms | 2.2 / 3.2 ms | 6.6 / 8.2 ms | 286 | 2,303 |
| project-os-cockpit | 1,570 | 16.7 / 17.4 ms | 1.8 / 2.5 ms | 4.7 / 5.9 ms | 229 | 1,390 |
| This repository | 261 | 16.7 / 17.0 ms | 1.1 / 1.8 ms | 1.8 / 2.9 ms | 35 | 729 |

**How to read it.** The display refreshes at 60 Hz, so no frame is shorter than 16.7 ms; the frame time says the field kept up on every workspace, and the 95th percentile says it rarely missed. The script work is the turn, the redraw of the cards and the canvas paint, measured around them; it leaves out the browser's own style, layout and compositing, so it is the part Deck controls rather than the whole cost. "4× CPU cost" is Chromium's CPU throttling, a stand-in for a slower machine and not a laptop.

**The hybrid is kept.** Nothing here asks for the pool DES-0002 proposed.

**The laptop question is still open.** [[ADR-0002-Glass-Is-The-Main-View]] keeps Glass as the default while it holds a usable frame rate on a laptop. This machine is a desktop; the same command on the laptop answers it, and Edwin judges the numbers.

## Where this stands

**2026-09-10: built and measured.** The field, the bands, the geometry, the renderer, the view switch, the address and the measurement are in; every task is done. What is left is Edwin's: the walk [[TST-0023-Glass-Opens-First-And-A-Days-Notes-Are-Read-In-It]], including Safari on the tablet, and the measurement on a laptop.

**2026-09-07: planned, and first in line.** Edwin decided the order on 2026-09-07: *"I am still very much thinking that glass should be the main view, so let's build glass now first, iron out issues and then work on parity."* Until that day the phase plan held Glass behind two gates: Spread had to be judged in a real task first, and [[FEAT-0001-The-Corpus-Has-An-Inside]] had to measure the link graph before any arrangement was built. Both gates are gone. Spread is built and walked, its judgement moves to [[PHASE-0004-Parity]], and FEAT-0001's measurements become exit criteria of [[PHASE-0002-Glass]] rather than a precondition for starting it. [[ADR-0002-Glass-Is-The-Main-View]] records the decision.

**What the review said had to change before a build, and where each point is answered.** [[REFERENCE-DES-0002-REVIEW]] read DES-0002 at rev 9 and named five things.

- **The founding count is smaller than the design says.** Six of the seven views receive a Needs-you group, not eleven, and three of those six already gather what is owed. [[TASK-0029-The-Band-Function]] writes the band per view as one table, so the views without a Needs-you group are rows in it rather than exceptions in code.
- **The performance argument was never tested against the design.** The bench spread every card round one cylinder and the stage held 122 slots at 80 notes. [[TASK-0030-The-Slot-Geometry]] gives the quiet band a shape for a thousand tiles, and [[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]] measures the real thing on Your Trainer in a foreground window.
- **The blur came back as a backdrop filter.** [[TASK-0031-The-Field-Renders-And-Turns]] draws distance with fog and less detail, puts nothing with a backdrop filter over the moving field, and scopes layer promotion to the near bands.
- **Glass state had no address.** [[TASK-0033-Glass-Is-Addressed-And-Opened-First]] puts the surface into the grammar [[FEAT-0006-Every-State-Has-An-Address]] built, with Glass as the default and the yaw kept out of the address.
- **The field was unreachable without a mouse.** The navigator Spread already has is the keyboard and screen-reader route, and [[TASK-0033-Glass-Is-Addressed-And-Opened-First]] gives it the focus order, the roles and the reduced-motion substitute.

**2026-09-10: reviewed before the build, and what a hand does with the field is a feature beside this one.** Edwin's instruction that Glass is a real Minority Report style surface and not a skin over Spread led to [[REFERENCE-GLASS-PHASE-REVIEW]], which found that this feature and [[FEAT-0010-Lifting-A-Note]] let a person look and lift and nothing else. This feature is unchanged: the field, the bands, the renderer, the view switch, the address and the measurement stand as written. What changes around it is [[FEAT-0014-The-Hands]]: the band function reads two more inputs, `pulled` and `pushed`, which [[TASK-0029-The-Band-Function]] records as an amendment; the compass counts pushed notes beside the count behind; and [[TASK-0034-The-Field-Is-Measured-On-The-Largest-Workspace]] measures a field with panes and wires on it, because that is the field a person will use.

**What is deliberately taken from Spread rather than rebuilt.** The groups ([[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]), the card faces ([[TASK-0028-A-Card-Face-Per-Type]]), the search and filters ([[TASK-0027-Search-And-Filter-In-The-Renderer]]) and the desk ([[FEAT-0005-Spread-Cards-On-A-Desk]]) all carry over. Glass is a different arrangement of the same model, which is why it can be built now.

## Independent review, 2026-09-10

**Verdict: changes requested.** Reviewed by model:claude-opus-5 in a fresh context that started from the notes and the diff (3045a42..c283128). It ran as a subagent launched from the authoring session (the commits' `Claude-Session` trailer names the session this reviewer runs under), so what is independent is the context, not the session tree or the model family. What the reviewer ran: `npm test`, 391 of 391; the six Glass suites, 50 of 50; `DECK_SMOKE_ONLY=glass electron . --smoke`, 113 checks and none failed, on a Mac with four displays; `bash tools/scripts/run-smoke.sh lan`, exit 0; `git status` unchanged in this repository and the cockpit's after every run. Mutants were run against `desktop/dist`, which was rebuilt afterwards. R marks a finding reproduced by a command; N marks one not reproduced.

1. R — A card is dealt under a pane whenever the pane is drawn somewhere other than its stored `x`. `paneObstacles()` in `glass.ts` builds the sectors from `card.x`, but `paintPane()` clamps the pane into the field. In a real window, a pane stored at x=3000 was drawn at 1000–1320 px and FEAT-0006, FEAT-0007 and FEAT-0008 were visible cards under it (a probe added to the built smoke run). This happens whenever the reading column narrows the field or a card placed in Spread sits past the field's width. The smoke run's own overlap check runs only before the reading column opens. It breaks TASK-0035's and TASK-0054's acceptance too.
2. R — The obstacle's half-card pad in `obstaclesFor` uses the scale straight ahead, so an off-axis card, which is drawn larger, can reach under an unclamped pane. Over 20,000 random pane placements against the built `slots.js`, 8% left a visible near card up to 22.5 px under the pane. TST-0041 tests one pane position, the left third of the screen, and passes.
3. R — Deck does not always open in Glass when the address names no surface. The store keeps `surface` across a restart and across opening another workspace (`normaliseState` keeps `spread`, and the launch window is created with no address), so a person who last chose Spread reopens in Spread. The first acceptance line says Glass "unless the address asks for Spread"; either the line or the behaviour should change.
4. N — The quiet band's own count is not on screen at all times, as the third acceptance line asks. The compass shows how many dealt notes are out of sight, which, facing the quiet band, is the near bands' count (read in `drawInstrument`).
5. R — The measurement was not taken on "a field with panes and wires", as this note's 2026-09-10 paragraph and PHASE-0002's order paragraph say. `measure.ts` dispatches `clear-desk` and never reaches for a card before it turns the field.
6. R — The check that a change arriving mid-view is announced does not guard the real path. The smoke run injects a pending change through `window.__deckHoldChange`. With `void prepareChange()` in the built renderer replaced by a no-op, the chip check still passed. Nothing exercises the real sequence: the index changes, the view is read again in the background, the notes are counted.
7. R — Two rules in `dealField` are unguarded. Counting an owed pulled note as placed by hand, and counting a suppressed pushed note as pushed, each survived TST-0040. Twenty other mutants across TST-0039, 0040, 0041, 0043 and 0044 were killed, including every mutant those notes list that the reviewer re-ran.
8. R — TASK-0033's refusal of an unknown surface in an address is guarded by `panel-registry.test.mjs`, not by the TST-0043 and TST-0045 it cites as evidence. The mutant survived the `hands` and `address` suites and was killed by `panel-registry`.
9. R — TASK-0031 is `done` with its Safari acceptance line unmet and not amended (the step is marked `[~]`). The note says so, but QUALITY.md asks for a criterion the work departed from to be amended or narrowed, not left standing.
10. N — Under reduced motion, TASK-0032 asks that a view switch highlight the newly focused card and scroll it into view in the navigator. Nothing checks that; the smoke run checks only an arrival from the navigator.

## Second independent review, 2026-09-10

**Verdict: changes requested.** The fixes for this feature do what ISS-0058, ISS-0060, ISS-0061 and ISS-0063 say, and each has a check that fails when it is reverted. What is left is one intermittent failure in the command this feature's verdict comes from, a count the screen shows but no check can fail on, and a measurement tool that records the reach without requiring it.

**Who reviewed, and how independent it was.** model:claude-opus-5, the same model as the author, in a fresh context that started from the notes and the code at cd95528 (diffed against 3045a42) and has no memory of authoring the work. It is not a separate session tree: it was launched as a subagent from the authoring session (its commit trailer names the same `Claude-Session` as the commits), and its scratchpad directory is shared with the author's and the first reviewer's. Of the files already there it read only the `panes`, `reaching` and turn fields of two measurement logs, and one grep line.

**What it ran.** `npm test`: 396 of 396. Fourteen mutations of the built `dist/shared` modules, run against their suites. The Glass section of the smoke run (`DECK_SMOKE_ONLY=glass DECK_SMOKE_DEBUG=1 electron . --smoke`): once clean, 120 checks and none failed, on four displays; once with seven renderer mutations in `dist/web/renderer`. `bash tools/scripts/run-smoke.sh both`: the loopback run failed one Glass check and the network run passed. A second full loopback run: `ok: true`, 120 Glass checks. `electron . --measure --measure-workspaces <this repository>`, twice. Node probes over the built slot and field modules. `dist` was rebuilt after every mutation, and `git status` in this repository was unchanged after every run. R marks a finding reproduced by a command; N marks one that was not.

**What the fixes got right.** The pane geometry holds: over 20,000 random layouts (fields 360 to 2,760 pixels wide, one to three panes, any yaw), 125,372 visible cards were checked and none was under a pane. Putting the straight-ahead margin back fails TST-0041, and taking obstacles from the stored `x` again fails the smoke run's clamped check, which printed "and no card is drawn under it (TASK-0009)". Reading the surface back from the state file fails TST-0043, and so does keeping it when a workspace opens. Disabling `prepareChange()` fails the mid-view change check ("0 notes changed"). Removing the view-switch highlight fails its check ("row false, card false"). The notes ISS-0063 lists are corrected: TASK-0033 cites TST-0034, TASK-0031's Safari line is amended, and the change note lists the developer's variables and `store.ts`.

1. R — The gate command failed once on a Glass check. `bash tools/scripts/run-smoke.sh both` printed `FAILED smoke loopback: and the field cut to it rather than flying (yaw held at -1.187)`; the network run passed, and a second full loopback run reported `ok: true`. In every passing run the yaw was 0.000, so this check tests something only when the focused row sits off to the side, and in the one run where it did, it failed. The cause is not known. N — A likely cause, not reproduced: the Enter lift just before this check turns the field to face its neighbours once their context arrives. If the context arrives after reduced motion is switched on, `redeal` cuts to yaw 0 while the check is sampling the yaw. TST-0045's evidence says the full run reported `ok: true`; on this machine that happened in 1 of 2 runs.
2. R — The quiet band's count is now on screen, which answers the first review's finding 4, but no check can fail for a wrong number. With `const quiet = 0` in the built `glass.js`, the smoke run printed "0 in the quiet band · 14 out of sight" and passed; the check is a regular expression that accepts any digits.
3. R — `measure.ts` records the reach but never requires it. Both of this reviewer's measure runs over this repository returned `panes: 2, reaching: null`, so they turned with no wires drawn. The author's run behind the table did hold a reach in all three workspaces: its log reads `reaching: "ISS-0058 8"`, `"ISS-0181 20"` and `"ISS-0070 2"`, and its values match the table. So the numbers stand, but their evidence exists only in a temporary directory, and the laptop measurement, which is still owed, can lose the reach without anyone noticing.
4. N — The renderer half of ISS-0060 is unguarded. `applyAddress` now selects the surface after the workspace, which matters only when the address names a workspace that is not open, and every address in the smoke run names the open one. Found by reading; no mutation was run.
5. R — This feature is `planned` while this note says it is built and every task is `done`. STATUSES.md's path is planned, doing, review, done. FEAT-0010 and FEAT-0014 are the same.
6. R — The header of `desktop/src/shared/field.ts` still says the band rule is applied by `bandCards`. Since cd95528, `dealField` has its own copy of the capacity loop, and `bandCards` is called only by `band-and-face.test.mjs`. The copy is guarded: sending mid overflow behind you, or demoting an owed note past the capacity, each fail TST-0040.
7. R — The focus note in `SNAPSHOT.yaml` says ISS-0058 to ISS-0063 are "being fixed now"; all six are `fixed`.

**The first review's findings.** Findings 1, 2, 3, 5, 6, 7, 8, 9 and 10 are addressed and checked. Finding 4 is addressed on screen and unguarded (finding 2 above).

## Review stopped, 2026-09-10

**Edwin stopped the review loop after two rounds, so this feature stays at `review`.** Both reviews requested changes. The first's findings are ISS-0058 to ISS-0063 and the second's are [[ISS-0064-A-Reduced-Motion-Lift-And-A-Pull-Beside-A-Pane-Still-Misplace-Cards]] and [[ISS-0065-Five-Checks-Still-Cannot-Fail-And-Four-Notes-Are-Stale]]; all eight are fixed. No third review was run, so no review has approved the feature. The quality gate needs an approved review for `done`, so moving it there is Edwin's decision, not the agent's.
