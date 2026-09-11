---
type: "[[task]]"
id: TASK-0067
aliases: ["TASK-0067"]
title: "The ring is a pure layout: the pane's place, up to sixteen places that never overlap it, who gets one, the order they take, and a path by angle and distance"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[REFERENCE-FOCUS-ZOOM-AND-VERBS]]"]
parent: "FEAT-0017"
effort: "M"
due: ""
depends: []
blocks: ["TASK-0068"]
related: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[TASK-0030-The-Slot-Geometry]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[DES-0002-The-Glass-Cockpit]]"]
tests: ["[[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]"]
---

# The ring is a pure layout

## Objective

A new module, `desktop/src/shared/focus-ring.ts`, decides where the note in the middle stands, where each of its neighbours goes, which neighbours get a place, and how they travel there. It has no DOM in it and is tested in node, so the promises that DES-0002 rev 5 found broken in a ring (a neighbour lying over the open note) are checked as arithmetic.

## Detail

The names are the implementer's choice; these are the jobs ([[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]], decisions 3 to 6).

**The pane's place.** Given the field's size and the dock's width (zero when no other note is held), the rectangle the focus pane is drawn in: centred in the field to the right of the dock, at a readable size, never smaller than a pane's minimum of 280 by 160 px ([[TASK-0054-A-Held-Note-Is-A-Pane]]). As large as the ring allows, up to a maximum chosen here; 640 by 480 px is a starting value.

**The ring's places.** Up to 16 centres for mini notes, evenly spaced by angle on an ellipse around the pane. The ellipse's half-width and half-height are chosen so every mini note's rectangle clears the pane by a gap, and every mini note lies inside the field and outside the dock. When the field cannot hold 16 without overlap, fewer places are returned. The places start at the top and run clockwise.

**Who gets a place.** Given the neighbours, each with whether it is the note the person came from, held, joined to another held note, owed, and linked from the focus or linking to it: when there are more than the places, the last place is a "+N more" card and the others go to the neighbours in this order (decision 4): the note the person came from, held notes, notes joined to another held note, owed notes, notes the focus links to before notes linking to it, then by id. N is the count of neighbours left out, so the places plus N always equal the neighbours.

**The order on the ring.** Each neighbour that gets a place has an angle around the middle of the field (decision 5):

- from where it was drawn before the lift, when it was drawn;
- from its bearing on the cylinder when it has a slot but was not drawn: left of the person is the left of the ring, right is the right;
- at the bottom, in order of id, when it has no slot at all because it comes from outside the view.

Sorted by those angles, the neighbours keep that circular order on the ring. The ring is turned to whichever assignment moves them least in total. When a note the person came from is given (a mini note clicked in the previous ring), the turn is instead fixed so that note lands opposite the direction the new focus came from, within half the spacing of two places.

**The path.** A position between a start and an end point at time `t`, moving by angle around the middle (the short way round) and by distance from it, never in a straight line. Also the easing, slow at both ends (the reference: most of the movement in the middle third), and the two stage lengths, 300 ms and 700 ms, whose sum is the `MOVE_MS` of 1000 ms Glass already uses.

**Mini note size.** Chosen here; about 168 by 44 px, for a line of id and a line of title. Written in the Outcome with the pane's maximum, the gap and the dock's width (a starting value of 240 px).

## Acceptance

- For fields from 700 by 480 to 2560 by 1300 px, docks of 0 and 240 px, and 1 to 16 neighbours: no mini note's rectangle overlaps the pane or another mini note, and every one lies inside the field and outside the dock.
- 16 neighbours get 16 places. 17 get 15 and "+2 more". 40 get 15 and "+25 more". A small field gets fewer places, and the places plus N equal the neighbours.
- The priority order above decides who is left out; a test gives one neighbour of each kind and more neighbours than places.
- The circular order of the neighbours by their angle before equals their circular order on the ring.
- With a note the person came from, it lands opposite the new focus's direction, within half a place's spacing.
- A neighbour with only a bearing goes on its side; neighbours from outside the view sit at the bottom by id; the same input always gives the same output.
- The path returns the exact start at `t = 0` and the exact end at `t = 1`, moves the short way round, and its distance from the middle never falls below the smaller of the two end distances.
- The easing is 0 at 0 and 1 at 1, symmetric, and slow at both ends: below 0.1 at 0.1 and above 0.9 at 0.9.
- The two stages add up to 1000 ms.
- `desktop/tests/focus-ring.test.mjs` asserts all of the above, and [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]] names it.

## Steps

- [x] Write `desktop/src/shared/focus-ring.ts` with the jobs above.
- [x] Write `desktop/tests/focus-ring.test.mjs` against the built module (`bash tools/scripts/run-desktop-tests.sh focus-ring`).
- [x] Break the module on purpose, one break per run, and record which checks fail in [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]: a circle sized from the pane's width only; the order by id instead of by angle; straight-line paths; the "+N more" card dropped with its notes uncounted.
- [x] **Commit the suite and [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]] together**, for the same reason as [[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]] ([[ISS-0028-A-Test-Note-Names-A-Suite-That-Does-Not-Exist]]).
- [x] Write the chosen sizes in the Outcome below.

## Notes

Why an ellipse and not a circle: a pane is wider than it is tall, and a circle wide enough to clear its corners leaves large gaps above and below, while one that fits above and below cuts through its sides. That second case is the defect DES-0002 rev 5 recorded.

## Outcome

**Done 2026-09-11.** `desktop/src/shared/focus-ring.ts`. **The choices made here:** a mini note is 168 by 44 px; the pane in the middle is at most 640 by 480 and at least 280 by 160; the gap is 16 px; the dock is 240 px. **The ring is a superellipse, not an ellipse:** its places lie on |x/a|⁴ + |y/b|⁴ = 1 with half-axes 2^¼ times the box a mini note must stay outside, and on that curve every place clears the pane on one axis or the other; an ellipse through the same points overlaps the pane's corners. **Places are spaced by distance along the curve**, clockwise from the top; spaced by the curve's parameter they bunched at the corners and a 1920 by 1080 field held only 12. The ring may stand up to twice as far out when the places need room, and in a field too narrow for a whole ring it keeps the places that land on the field. **A readable pane beats a full ring:** the largest pane whose ring holds six places (`ENOUGH`), or every neighbour when there are fewer, is chosen, and "+N more" takes the rest. **With a note the person came from, the ring starts opposite the way they came**, so that note sits exactly there even on a ring of one. Places keep clear of rectangles drawn over the field (the compass). [[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]: 11 of 11, and each of its four named breaks fails a check.
