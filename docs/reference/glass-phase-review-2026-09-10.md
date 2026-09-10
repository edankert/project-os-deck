---
type: "[[reference]]"
id: REFERENCE-GLASS-PHASE-REVIEW
aliases: ["REFERENCE-GLASS-PHASE-REVIEW"]
title: "Glass phase review before the build: as planned on 2026-09-08 the phase is a reading surface with one verb, and five additions make it a surface a person arranges"
status: active
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
scope: "project"
source:
  - "Edwin 2026-09-10: 'review the next planned phase Glass to see if anything needs to change. Note the functionality for the phase is not just a one to one replacement skin it is considerably more, the goal is to create a real minority report style UX'"
  - "docs/phases/PHASE-0002-Glass.md as it stood on 2026-09-08, with FEAT-0009, FEAT-0010, FEAT-0001 and their fourteen tasks"
  - "docs/designs/DES-0002-The-Glass-Cockpit.md rev 9 and docs/reference/des-0002-glass-cockpit-review-2026-09-05.md"
  - "desktop/src/renderer/host-bridge.ts, desktop/src/main/host.ts, desktop/src/shared/types.ts, read on 2026-09-10"
related:
  - "[[PHASE-0002-Glass]]"
  - "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"
  - "[[FEAT-0010-Lifting-A-Note]]"
  - "[[FEAT-0014-The-Hands]]"
  - "[[FEAT-0001-The-Corpus-Has-An-Inside]]"
  - "[[FEAT-0008-One-Renderer-Two-Hosts]]"
  - "[[DES-0001-Nine-Ways-To-Read-The-Record]]"
  - "[[DES-0002-The-Glass-Cockpit]]"
  - "[[REFERENCE-DES-0002-REVIEW]]"
  - "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]"
  - "[[ADR-0002-Glass-Is-The-Main-View]]"
  - "[[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]]"
tags: [reference, review, glass, phase]
---

# Glass phase review before the build, 2026-09-10

## Purpose

Edwin asked on 2026-09-10 for [[PHASE-0002-Glass]] to be reviewed before it starts, with one instruction that changes what the phase is judged against: the phase is not a one-to-one replacement skin over Spread, it is considerably more, and the goal is a real Minority Report style user experience. This note records what the phase planned as of 2026-09-08, what that phrase means once the film is set aside, where the plan falls short of it, and what was added. Nothing was built. The additions are [[FEAT-0014-The-Hands]], its five tasks and one acceptance walk, and three new exit criteria on the phase.

## The short version

**As planned, Glass was a reading surface with one verb.** A person could turn the field, switch view, click a card to lift it, put it back, reach a card from the navigator and paste an address. Everything else about the picture was computed from the record: which band a note stood in, where it sat, what came forward. That is a faithful build of the narrow slice the DES-0002 review recommended, and it is good work. It is also a skin in the sense Edwin means, because the person watches an arrangement rather than making one.

**Five things separate a skin from the surface the film shows, and the plan had one of them.** The hands arrange. Space is continuous across screens. Motion carries meaning. Reaching for a thing shows what it is joined to before you take it. The instrument says what mode it is in. The plan had the third and part of the fifth. The other three, and the rest of the fifth, are now [[FEAT-0014-The-Hands]].

**One finding in the code changes the tablet story.** The served page never sees the shell's store. Without the preload bridge, `Host.start()` in `desktop/src/renderer/host-bridge.ts` fetches only the capability set and keeps a fresh, local state. So the tablet today shows its own desk, not the Mac's, and it cannot be a screen a note is thrown to. A read-only state feed over Deck's host fixes that without touching [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]], because reading state is a read. That is [[TASK-0057-The-Served-Page-Follows-The-Store]].

**Two things the phase already promised and did not carry.** The DES-0002 review said the question "does anyone turn to look behind after a week" should be an acceptance criterion rather than a remark, and [[TASK-0031-The-Field-Renders-And-Turns]] says the phase asks it. The phase's exit criteria did not. They do now. And [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] is carried by this phase on the premise that the smoke run is not in continuous integration. Since 2026-09-09 it is: `.github/workflows/deck-smoke.yml` ran green on `main`. The issue's premise has changed and grooming should re-read it; what remains true is that the smoke is the only gate the renderer has.

## Part 1: what the phase planned, as of 2026-09-08

Three features and fourteen tasks. [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] builds the field: a band function from the view description's band section, a slot geometry on a cylinder, a hybrid renderer with near bands as real cards and the quiet band on one canvas, a view switch that moves the same cards, the surface in the address with Glass the default, and a frame-time measurement on Your Trainer. [[FEAT-0010-Lifting-A-Note]] lifts a note onto the desk Spread already has, brings its neighbourhood to the front band while it is held, and marks what several held notes share. [[FEAT-0001-The-Corpus-Has-An-Inside]] is the orbit arrangement of the same field, behind an endpoint the cockpit owns.

Read as a list of what a person can do, rather than what the field draws, the plan is short:

| the person does | the field answers |
| --- | --- |
| drags, or holds an arrow key | turns |
| switches view | re-deals the same cards |
| clicks a card | lifts it; its neighbourhood comes to the front |
| presses ×, ⌥× or esc | puts one, the others or all back |
| chooses a row in the navigator | flies to it |
| copies and pastes an address | restores the view, the surface and the note |
| taps a far card on the tablet | flies to it, then opens it |

Every position, every band and every promotion is the record's opinion. The person never places anything and never overrules the arrangement. The one thing they arrange is the desk, and in Glass the plan did not say a held note could be moved at all: [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]] lifts and puts back, and the plan's open question about the reader's width was left to the design.

## Part 2: what "Minority Report" means for a mouse, a keyboard and a tablet

The interface in the film was designed by John Underkoffler, who later built it for real as g-speak and the Mezzanine product at Oblong. Edwin dropped the headset and hand tracking on 2026-09-05, and DES-0002 dropped them too. What survives without gloves is not the gesture vocabulary but five properties of the surface, and each has a plain form on Deck's inputs.

1. **The hands arrange.** The person pulls a thing toward them, pushes one away, throws one aside, and the arrangement stands until they change it. The arrangement is theirs, beside the record's. In Deck: a card can be pulled into the front band or pushed behind for the session, a held note is a pane that is moved, resized and stacked, and the desk record keeps where the panes are.
2. **Space is continuous across screens.** A thing flicked off one display lands on the next, because the displays are one room. Deck has the pieces already: one store in the main process, windows placed by display, a panel address for what a window carries, and a served page for the tablet. What was missing is the gesture that crosses the gap, and a tablet that sees the store.
3. **Motion carries meaning.** Things fly rather than cut, so the person watches where something went. The plan has this: fly-then-open, transform transitions of about a second, cross-fade never cross-morph, and a reduced-motion substitute for each.
4. **Reach before commit.** Approaching a thing shows what it is joined to before it is taken. In the plan the neighbourhood arrives only after a lift. On a desktop, hovering is reaching; on a tablet, press-and-hold is.
5. **The instrument says its mode.** The plan has the front plane's label changing while a note is held, from the DES-0002 review's Sarter and Woods finding. Hand placement is a second mode of the same axis, and the label and the compass must say how much of what is in front, and behind, was placed by hand.

Two things the film had that Deck should not borrow. The film's operator stood and gestured for minutes at a time, which the literature on "gorilla arm" says nobody sustains; Deck's gestures are short drags with a rest position. And the film's surface had no record behind it; Deck's does, and the front plane's meaning as what the record says needs a person must survive a hand's rearrangement. So a pushed note that the record says is owed stays owed, and the push is refused with a reason.

## Part 3: the gaps, and what was added for each

| property | the plan had | the gap | added |
| --- | --- | --- | --- |
| the hands arrange | lift, put back; held notes drawn but not movable | nothing a person places persists; the band is the record's alone; DES-0002's "put behind me" was dropped between the design and the plan | [[TASK-0053-Pull-Forward-And-Push-Behind]]; [[TASK-0054-A-Held-Note-Is-A-Pane]] |
| space across screens | pop-out windows carrying one panel; Glass on the focus window only | nothing crosses from the field to another window; the tablet holds its own local state and cannot receive anything | [[TASK-0055-Throw-To-A-Screen]]; [[TASK-0057-The-Served-Page-Follows-The-Store]] |
| motion carries meaning | fly-then-open, one-second transitions, reduced-motion substitutes | none; the throw needs a flight of its own, written into TASK-0055 | nothing new |
| reach before commit | neighbourhood on lift only | hovering a card shows nothing about it | [[TASK-0056-Reach]] |
| the instrument says its mode | the front label changes while a note is held; the owed count keeps its place | the label and compass say nothing about hand placement | written into TASK-0053; the band function's reserved columns become inputs |

The DES-0002 review proposed exactly the boundary these additions honour: yaw and the pushed set are session state and never in the address; the desk and the focused note are in the address. Pull and push therefore die with the session and are dropped by the persister, while pane positions live in the desk record and survive a restart the way a Spread desk does. The rule that every reachable state has an address is kept, because a pushed set is not a state a person reopens tomorrow; it is where their hands were today.

## Part 4: what the exit criteria missed

The phase had ten exit criteria. Eight are about what the field draws and two are numbers. None judged Glass as a surface a person manipulates, and one the design review demanded was absent. Three are added to the phase note:

- A person arranges the field by hand and the arrangement behaves as stated: pulls and pushes stand across a view switch and vanish on restart, panes keep their place across a restart, the front plane says how many notes are hand-placed, and nothing was written to the record. Walked in [[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]].
- A note flicked toward a second display opens in the reader window there, or opens a new one, and the tablet shows the desk the Mac holds. Same walk.
- After a week of daily use in Glass, Edwin records how often he turned to look behind and whether anything was lost there. That is the DES-0002 review's own test of the quiet band as a forgetting machine, and either answer is a result.

The tablet criterion is also amended: it read "Glass opens in Safari on the tablet", and it now also asks that the tablet follows the Mac's desk.

## Part 5: what was considered and not adopted

These are candidates for grooming, written here so the decision is visible rather than forgotten.

- **A threshold dial.** Furnas's degree-of-interest displays and DOITrees carry a slider that moves the boundary between what is shown large and small. In Deck it would move the boundary between the front and mid bands, so a person could ask for "the twenty most pressing" rather than the twelve that fit. Cheap once the band function exists, and it is a real control rather than a decoration. Not adopted now because pull and push give a person the same power one note at a time, and the dial's meaning for the owed band, which must stay unavoidable, needs a design answer first.
- **The workspace ring.** DES-0002 drew the workspace picker as a slow ring at the same mechanic as the field. Deck uses Spread's rail. The ring is part of the whole-surface feel and it would be the first Glass chrome that is not a panel. Not adopted because it changes nothing a person can do, and the rail is walked and passing.
- **A time scrub.** DES-0001's REEL scrubs the project through time. A cheap form exists on Deck's own index, where every note carries `updated`: a dial that recedes everything untouched since a date. Not adopted because the one view whose axis is age, Recent, was retired by the cockpit with a stated reason, and reviving it is an argument to have in the open, not a task.
- **The tablet as a controller.** Oblong's Mezzanine used a tablet as the wand: pointing on the tablet moved things on the wall. In Deck that means the served page sending store actions to the shell, and Deck's host answers 405 to every method that is not a read by [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]. A store-only channel that never touches the record would be a new decision, not a task, and it is Edwin's. TASK-0057 makes the tablet follow; it does not make the tablet steer.
- **Wires for every edge, and the console as furniture.** The first is [[FEAT-0001-The-Corpus-Has-An-Inside]]'s overlay and the second is [[PHASE-0004-Parity]]'s. Neither moves.
- **A light-mode Glass.** No design has drawn it. Unchanged.

## Part 6: what the additions cost, and the hazards

Five tasks and one walk, inside one new feature. The order inside the phase: [[TASK-0053-Pull-Forward-And-Push-Behind]] after the renderer, because it needs a card to drag; [[TASK-0054-A-Held-Note-Is-A-Pane]] after [[TASK-0035-A-Note-Is-Lifted-And-Put-Back]], because it needs a held note; [[TASK-0056-Reach]] after [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]], because it reuses that task's context read and cache; [[TASK-0057-The-Served-Page-Follows-The-Store]] any time, because it touches the host and the served page only; [[TASK-0055-Throw-To-A-Screen]] last, after TASK-0054 and TASK-0057, because a throw needs somewhere to land.

The risk scan found no new dependency, no new environment variable, no path change and no new long-running step. One contract grows: Deck's host gains two read routes, `/deck/state` and `/deck/events`, both answering only `GET` and `HEAD`, and the smoke run on the network address asserts the refusal of everything else. The hazard that is new is not a dependency but a meaning: the front band stops being purely the record's opinion once a hand can pull a note into it. The mitigation is written into TASK-0053 rather than into a risk note: a pulled note carries a mark, the label counts hand-placed notes, an owed note cannot be pushed out, and one verb lets everything go.

One thing the store must decide, and TASK-0053 decides it: session state that several windows share but that must not survive a restart. The store today persists everything it holds. The pulled and pushed sets are the first thing that is shared and not kept, so the persister learns to drop a named part of the state. The flow cursor slot reserved in [[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]] may want the same treatment later.

## Maintenance

This note describes PHASE-0002 as it stood on 2026-09-08 and the code on 2026-09-10. A task in Part 3 landing, or a decision on a candidate in Part 5, makes the corresponding row historical; add a dated line here saying what changed rather than editing the findings.
