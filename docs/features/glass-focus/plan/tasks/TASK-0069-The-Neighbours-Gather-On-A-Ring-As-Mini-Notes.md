---
type: "[[task]]"
id: TASK-0069
aliases: ["TASK-0069"]
title: "The neighbours gather on a ring as mini notes, each with a line from the pane, and a mini note is a door to the next note"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]", "Edwin 2026-09-11: 'the associated notes should show their connections and should be shown around the opened note'"]
parent: "FEAT-0017"
effort: "M"
due: ""
depends: ["TASK-0068"]
blocks: ["TASK-0070"]
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[FEAT-0010-Lifting-A-Note]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]", "[[TASK-0056-Reach]]", "[[TASK-0003-The-Field-Renders-And-Flies]]", "[[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]]", "[[PHASE-0002-Glass]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# The neighbours gather on a ring as mini notes

## Objective

While a note is in the middle, every note it links to and every note that links to it moves to a ring around it as a mini note, a small card with its id and title. A line runs from the pane to each. Clicking a mini note makes that note the one in the middle. The neighbourhood no longer spreads across the front band while this is so.

## Detail

**Where the neighbours come from.** The same context read Glass already makes at a lift (`hooks.context`, cached per note per index revision in `desktop/src/shared/neighbourhood.ts`): `linked` is what the note links to, `backlinks` is what links to it. No new request is made for the ring.

**Where they start and where they go.** For each neighbour, the start is where it is drawn: its card, its tile on the canvas, or in the orbit its dot. Its angle and whether it gets a place come from [[TASK-0067-The-Ring-Is-A-Pure-Layout]], given the flags that module asks for (came from, held, joined to another held note, owed, direction). During stage two (700 ms) each mini note moves along the module's path by angle and distance. A neighbour with nothing drawn fades in at its place. Each neighbour's own field card is hidden while its mini note is on the ring and shown again when the ring goes.

**The ring's layer.** A new layer in `desktop/src/renderer/index.html`, above the field's cards and below the panes, holds the mini notes and the lines. The lines are an inline SVG in that layer, because there are at most sixteen and each needs its own pointer target. A mini note carries its id, title, status colour, the mark for a note joined to more than one held note ([[TASK-0037-What-These-Share]]), and a "held" mark when the note is on the desk.

**The lines** ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]], decision 8). From the pane's edge, on the bearing of the mini note (the rule DES-0002 settled in rev 5 for wires), to the mini note's edge. Solid for a note in `linked`, dashed for one in `backlinks`, solid with a "both ways" mark for one in both. Resting on a line shows the edge callout Glass already has, with, for example, "TASK-0058 links to FEAT-0015" and the sentence the link sits in. The sentence comes from `hooks.sentence(edge)`, which needs the edge's offset: in the orbit the edge list is already loaded; in the bands Glass loads the same edge list the orbit loads (`loadOrbit()`'s graph request in `desktop/src/renderer/renderer.ts`), once per index revision, the first time a line is rested on.

**"+N more"** takes the last place when the ring is full. Activating it moves keyboard focus to the navigator's group of joined notes, which lists every neighbour.

**A mini note is a door** (decision 7). A click, or Enter, lifts the note, and it becomes the focus: the ring re-forms around it with the previous focus passed to TASK-0067 as the note the person came from, and the previous focus's pane joins the dock. A mini note for a held note brings that pane forward instead, and no card is added to the desk.

**The keyboard and a screen reader** (decision 17). Mini notes are buttons in ring order, clockwise from the top, reached by Tab after the pane's header. Focusing one shows the same callout as resting on its line. The ring's layer is a list named "Notes joined to" and the note's id. The navigator's group of joined notes (built in [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]) lists the focus's neighbours in ring order while a note is in the middle, under a heading such as "Around TASK-0058".

**The front band** (decision 10). While a note is in the middle, `redeal()` keeps the deal it had ([[TASK-0068-An-Opened-Note-Moves-To-The-Middle]]), so the neighbourhood is not dealt into the front band. When the middle is left, the field is dealt by today's rule and the neighbours move from the ring to their cards.

**Reach on a mini note** (decision 20). Resting on a mini note draws the reach's wires ([[TASK-0056-Reach]]) from the mini note to those of its own neighbours that are drawn, on the ring or in the dimmed field. The wires start where the mini note is drawn, not at its slot. Dimmed field cards do not reach while a note is in the middle.

**Waiting for the neighbourhood.** The context is asked for at the lift and is usually cached. Until it arrives the pane stands in the middle and the ring is empty; the mini notes then move out from their starting places. Write down here what the pane says while it waits, if anything.

**Reduced motion.** The mini notes appear on the ring at once, with no movement, and are highlighted for a moment.

## Acceptance

- After a lift of a note with 16 or fewer neighbours, each neighbour is a mini note with its id and title, none overlapping the pane or another mini note, and each has a line from the pane's edge.
- The lines to notes in `linked` are solid and those to notes in `backlinks` are dashed; a note in both is solid and marked "both ways".
- The neighbours that were drawn before the lift keep their circular order on the ring.
- A note with more than 16 neighbours shows 15 mini notes and "+N more"; activating it puts keyboard focus in the navigator's group, which lists all of them.
- Resting on a line shows the direction and the sentence the link sits in; in the bands the edge list is read at most once per index revision.
- A click on a mini note puts that note in the middle, its own neighbours gather, the previous focus is a header in the dock and, when the two are linked, sits on the new ring opposite the direction the new focus came from.
- A click on a held note's mini note brings its pane forward and adds nothing to the desk.
- A mini note joined to another held note carries the shared mark, and the desk bar's count is unchanged.
- While a note is in the middle the neighbourhood is not dealt into the front band; after Escape it is, and the field turns to face it.
- Tab from the pane's header reaches the mini notes in ring order; Enter on one puts it in the middle; the navigator lists them in the same order.
- Resting on a mini note draws wires to its drawn neighbours from where the mini note is drawn.
- Under reduced motion no mini note moves, and the ring is highlighted.
- One context request per lifted note, as today.

## Steps

- [x] Add the ring's layer and the SVG for the lines to `desktop/src/renderer/index.html` and its style to `desktop/src/renderer/deck.css`.
- [x] Place the mini notes from TASK-0067's layout; move them along its path in stage two; hide and restore each neighbour's field card.
- [x] Draw the lines by direction; wire the callout, and load the edge list once per index revision in the bands.
- [x] Add "+N more", the door, the held-note case, the keyboard order, the list semantics and the navigator's order.
- [x] Keep the neighbourhood out of the front band while a note is in the middle; deal it on leaving.
- [x] Let a mini note reach, from where it is drawn.
- [x] Leave the smoke checks to [[TASK-0071-The-Smoke-Run-Drives-The-Middle-And-The-Ring]].
- [x] Append to [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]], after its acceptance list, this paragraph: "**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** A lift now puts the note in the middle of the field and its neighbours on a ring around it, and the front band is not dealt again while a note is there. The lines above hold once the note leaves the middle: its neighbourhood then takes the front band and the field turns to face it. Under reduced motion the ring is highlighted instead of moving."
- [x] Append to [[FEAT-0010-Lifting-A-Note]], at the end of the note, this paragraph: "**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** At Edwin's request a lifted note now stands in the middle of the field with the notes it is joined to on a ring around it, each with a line to it, and the rest of the field dims. While a note is in the middle its neighbourhood forms the ring and does not take the front band; once it leaves the middle, the rules above apply unchanged. Escape first takes the note out of the middle, and a second Escape sweeps the desk. The desk, the ghosted slot, × and ⌥× are unchanged."
- [x] Amend [[PHASE-0002-Glass]]'s third exit criterion by appending: "**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]):** a lift first puts the note in the middle with its neighbourhood on a ring around it; the neighbourhood takes the front band once the note leaves the middle."
- [x] Append to [[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]], after its procedure, this paragraph: "**Amended 2026-09-11 ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]).** A lift now puts the issue in the middle of the field with its feature, its tests and its backlinks on a ring around it. Press Escape once to take it out of the middle; then watch the field turn and find the neighbourhood in the front band, as the steps above describe. Where a step says to press esc to empty the desk, press it twice."

## Outcome

**Done 2026-09-11.** `desktop/src/renderer/ring-view.ts` draws the ring: each mini note is a button with its id and title, and a line runs from the pane's edge to each, **drawn as SVG** so resting on one is a pointer over an element: solid for a link the note makes, dashed for a link made to it, thicker and marked "⇄ both ways" for both. Resting on a line shows which way it runs and the sentence it sits in, from the workspace's edge list, read once per index revision. Clicking a mini note, or Enter on it, opens that note in the middle; the note it came from joins the dock and sits on the new ring opposite the way it came. A held note's mini note brings its pane forward. Resting on a mini note draws wires to its own neighbours on the ring. "+N more" moves the keyboard to the navigator's group of joined notes, which lists them in ring order. **One departure from the plan:** Tab from the header of the note in the middle goes straight to the first mini note, rather than through every link in the note's text. The amendments are on [[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]], [[FEAT-0010-Lifting-A-Note]], [[PHASE-0002-Glass]]'s third exit criterion and [[TST-0024-A-Note-Is-Lifted-And-Its-Neighbourhood-Arrives]].
