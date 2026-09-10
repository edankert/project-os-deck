---
type: "[[feature]]"
id: FEAT-0009
aliases: ["FEAT-0009"]
title: "The field where depth carries priority: Glass is the view Deck opens, and what needs you is in front"
status: planned
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

**2026-09-10, on a Mac Studio (Apple M2 Max, 12 cores, 34 GB, macOS 26), with `electron . --measure`.** The window was brought in front and focused, the page confirmed it had focus, and the meter recorded a frame only while the document was visible and focused; every run held both, over about 300 frames of a five-second turn through the quiet band of the Issues view. The renderer is the review's hybrid: bound cards for the near bands, one canvas for the quiet band.

| Workspace | Notes | Frame time, median / 95th percentile | Script work per frame, median / 95th | The same work at 4× CPU cost | Most tiles on the canvas | Elements in the document |
|---|---|---|---|---|---|---|
| Your Trainer | 2,734 | 16.7 / 17.3 ms | 2.2 / 2.9 ms | 6.1 / 7.5 ms | 286 | 2,081 |
| project-os-cockpit | 1,570 | 16.7 / 17.2 ms | 1.8 / 2.5 ms | 4.1 / 5.3 ms | 231 | 1,254 |
| This repository | 255 | 16.7 / 17.3 ms | 0.7 / 1.8 ms | 0.7 / 1.2 ms | 50 | 191 |

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
