---
type: "[[feature]]"
id: FEAT-0014
aliases: ["FEAT-0014"]
title: "The hands: a person arranges the field, throws a note to another screen, and reaches for a card to see what it is joined to"
status: planned
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["Edwin 2026-09-10: 'the functionality for the phase is not just a one to one replacement skin it is considerably more, the goal is to create a real minority report style UX'", "[[REFERENCE-GLASS-PHASE-REVIEW]]", "[[DES-0002-The-Glass-Cockpit]]", "[[DES-0001-Nine-Ways-To-Read-The-Record]]"]
goal: "Glass stops being a picture the record paints and becomes a surface a person arranges: a note is pulled forward or pushed behind for the session, a held note is a pane that is moved, resized and stacked, a card is thrown off the field to a window on another screen or to the tablet, and reaching for a card shows what it is joined to before it is lifted. Nothing a hand does writes to the record."
requirements: []
tasks: ["[[TASK-0053-Pull-Forward-And-Push-Behind]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0055-Throw-To-A-Screen]]", "[[TASK-0056-Reach]]", "[[TASK-0057-The-Served-Page-Follows-The-Store]]"]
release: ""
acceptance_exception: ""
design: "[[DES-0002-The-Glass-Cockpit]]"
related: ["[[PHASE-0002-Glass]]", "[[REFERENCE-GLASS-PHASE-REVIEW]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[FEAT-0004-Windows-On-Any-Screen]]", "[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]]"]
---

# The hands

## Goal

**As planned before 2026-09-10, a person could only look at Glass and pick from it.** Every band, every position and every promotion was the record's opinion, and the one verb was lift. Edwin's instruction that day was that Glass is not a skin over Spread but a real Minority Report style surface, and [[REFERENCE-GLASS-PHASE-REVIEW]] reduced that to five properties a mouse, a keyboard and a tablet can carry. This feature is the three the plan lacked and the half of a fourth: the hands arrange, space is continuous across screens, reaching shows what a thing is joined to, and the instrument says how much of what it shows was placed by hand.

Four words are used throughout. **Pull** brings a card into the front band by hand; **push** sends it behind you; both last for the session and never write. A **pane** is a held note drawn on the front plane, with a header that is always readable and a body that can be moved, resized and stacked. A **throw** is a drag that leaves the field's edge toward another window, and the note lands there. **Reach** is hovering a card on the desktop or pressing and holding it on the tablet, and it shows what the card is joined to without lifting it.

## Scope

**In scope.** Pull and push as short drags with a stated threshold, held in the store beside the flow cursor as session state that several windows share and the persister drops, never in the address; the band function's reserved columns become the inputs `pulled` and `pushed`; the front label counts hand-placed notes and the compass counts pushed ones; an owed note cannot be pushed out of the front band and the refusal says why; one verb lets everything go ([[TASK-0053-Pull-Forward-And-Push-Behind]]). A held note as a pane: moved, resized and stacked with DES-0002's overlap rule, its header always readable and a click on it raising the pane, a stated minimum width and a verb that widens it to a reading column; the pane's place and size kept in the desk record Spread already saves, so the two surfaces show one arrangement ([[TASK-0054-A-Held-Note-Is-A-Pane]]). The throw: a drag that leaves the field toward a window on any display lands the note in that window's reader, or on the desk it carries, or opens a new reader window on that display when nothing is there; a target strip at the edge names the windows in that direction while the drag is near it; the flight goes toward the screen the note went to; a keyboard verb sends a note to a named window ([[TASK-0055-Throw-To-A-Screen]]). Reach: after a short hover, or a press-and-hold on touch, wires are drawn on the canvas from the card to every neighbour on screen and the compass counts those behind you; one request per note per index revision, cached with [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]'s context read ([[TASK-0056-Reach]]). The served page follows the store: Deck's host gains `/deck/state` and `/deck/events`, both reads, so a tablet shows the desk the Mac holds, follows the shell's focus when asked, and is a screen a note can be thrown to ([[TASK-0057-The-Served-Page-Follows-The-Store]]).

**Nothing a hand does writes.** Pull, push, move, resize, stack, throw and reach leave the record exactly as it was, and `git status` after a walk is the check.

**The tablet follows and never steers.** The served page reads the store over Deck's host and sends nothing back, because Deck's host answers 405 to every method that is not a read ([[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]). A tablet that steers the Mac's field would be a new decision and it is not made here.

**Out of scope.** Hand tracking, a headset and voice. The tablet as a controller. A threshold dial that moves the band boundary, the workspace ring and a time scrub, all recorded as candidates in [[REFERENCE-GLASS-PHASE-REVIEW]] Part 5. Wires for every edge of the corpus, which is [[FEAT-0001-The-Corpus-Has-An-Inside]]. The console as furniture, which is [[PHASE-0004-Parity]]. A pull or push that survives a restart, or that enters the address.

## Acceptance

- A card dragged toward the person past the pull threshold is in the front band with a hand mark, and stays there across a view switch; a card dragged away past the push threshold is in the quiet band; both are gone after a restart and neither appears in the address.
- An owed note cannot be pushed out of the front band; the gesture is refused and the front plane says why.
- The front label reads how many notes in the front band were placed by hand, the compass reads how many notes behind you were pushed by hand, and one verb lets all of them go.
- A held note is a pane that can be dragged, resized and stacked; its header stays readable in a stack of any depth and a click on the header raises it; after a restart the panes are where they were, and Spread shows the same positions.
- A drag that leaves the field toward a second display lands the note in the reader window on that display, or on the desk panel there, or opens a new reader window there when no window is; the target strip named the candidates while the drag approached the edge; under reduced motion the landing is a cut with the target highlighted.
- Hovering a card for the stated time, or pressing and holding it on the tablet, draws wires to every neighbour on screen and counts those behind you, makes at most one request per note per index revision, and clears when the pointer leaves.
- Deck's host answers `GET /deck/state` with the store's state and `GET /deck/events` with a change stream, answers 405 to every other method on both, and a note lifted on the Mac is on the tablet's desk within a second.
- After a walk of all of the above, `git status` in the workspace is unchanged.

## Links

- Phase: [[PHASE-0002-Glass]]
- Review that created it: [[REFERENCE-GLASS-PHASE-REVIEW]]
- Tasks: [[TASK-0053-Pull-Forward-And-Push-Behind]], [[TASK-0054-A-Held-Note-Is-A-Pane]], [[TASK-0055-Throw-To-A-Screen]], [[TASK-0056-Reach]], [[TASK-0057-The-Served-Page-Follows-The-Store]]
- Acceptance walk: [[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]]
- Plan: `docs/features/glass-hands/plan/PLAN.md`
- Design: [[DES-0002-The-Glass-Cockpit]], whose "put behind me", pane overlap rule and three-screen section this feature builds; reviewed in [[REFERENCE-DES-0002-REVIEW]]

## Where this stands

**2026-09-10: planned, from a review and nothing built.** Edwin asked for the Glass phase to be reviewed against a real Minority Report style surface rather than a skin. [[REFERENCE-GLASS-PHASE-REVIEW]] found that the plan let a person look and lift and nothing else, that the served page never sees the store so the tablet cannot receive anything, and that two promises the phase had made were not in its exit criteria. This feature carries the additions. It depends on [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] for a field to arrange and on [[FEAT-0010-Lifting-A-Note]] for a held note to move; only [[TASK-0057-The-Served-Page-Follows-The-Store]] can start before either.
