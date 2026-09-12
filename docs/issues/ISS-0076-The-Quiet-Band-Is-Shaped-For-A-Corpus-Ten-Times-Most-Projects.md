---
type: "[[issue]]"
id: ISS-0076
aliases: ["ISS-0076"]
title: "The quiet band's shape is a constant sized for the largest workspace on the fleet, so a project of three hundred notes puts its finished work on a shelf built for a thousand and pushes it further away than it needs to be"
status: open
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["Edwin 2026-09-12, on ISS-0073: 'I think we need to make the ring size adaptive based on the number of notes in a project (review and suggest).'"]
severity: medium
component: renderer
parent: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "[[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]", "[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# The quiet band is shaped for a corpus ten times most projects

## Problem

**Every workspace gets the same field geometry, and it was sized for the biggest one.** The quiet band is forty columns by twenty-five rows — a thousand notes to a layer — standing at depth 760 across 156 degrees behind the person. Your Trainer has 2,734 notes and needs that. This repository has 261 and never puts more than 35 tiles on screen at once, so its finished work is spread across a shelf built for thirty times as much and is further away, and smaller, than anything requires. Edwin's suggestion, on [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]], is that the geometry follow the size of the project.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "I think we need to make the ring size adaptive based on the number of notes in a project (review and suggest)."

## Cause

`desktop/src/shared/slots.ts` states `FRONT`, `MID` and `QUIET` as frozen constants with a comment explaining the choice: "Forty tiles to a row across 156 degrees centred behind the person, and twenty-five rows to a layer: a thousand tiles a layer. A larger quiet band steps back a layer at a time, so 2,660 notes are three layers deep."

That is the only adaptivity there is, and it runs one way. A bigger corpus moves **further back**. A smaller one does not come forward; it occupies a fraction of a shelf sized for somebody else's repository.

## Evidence — what the three measured workspaces actually hold

From [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]], "Measured", 2026-09-10:

| Workspace | Notes | Most tiles on screen | Elements in the document |
|---|---|---|---|
| Your Trainer | 2,734 | 286 | 2,303 |
| project-os-cockpit | 1,570 | 229 | 1,390 |
| This repository | 261 | 35 | 729 |

The spread is eight to one in tiles. One geometry serves all three.

## Expected

The field's shape is derived from how much it has to hold. A quiet band of forty notes stands near enough to read, in a few rows of something card-sized. A quiet band of a thousand is today's shelf. Nothing about the arrangement changes except its numbers.

## Suggestion

**Derive the shape from the band's own population, not from the project's note count.** A view is what a person is looking at, and the Issues view's quiet band and the Phases view's quiet band differ by two orders of magnitude inside the same repository. The input is "how many notes are in the deep band of this view", which the deal already knows before it places anything.

One pure function beside the constants — call it `quietShapeFor(count)` — returning depth, columns, rows and tile size, with the constants becoming its value at the large end. Pure, so its whole behaviour is a table in a test: 40 notes, 300 notes, 1,000 notes, 2,700 notes, and the two ends clamped. The same argument applies to `FRONT` and `MID`, and they should be looked at in the same pass rather than left as the one thing that does not adapt.

**Three things to settle, and they are why this is a suggestion and not a plan:**

1. **What "closer" means for a band whose whole point is being behind you.** Depth is priority in Glass, and a finished note is meant to read as finished. Bringing a small band forward must not make done work look active. The honest lever is probably **size and detail, not depth**: the band stays behind the person and its tiles grow until they are readable, rather than the band walking toward them.
2. **Whether the shape may change while a person is using it.** Marking one issue fixed moves a note between bands and would reshape the whole quiet band underneath them. A shape recomputed on every deal is a field that never sits still. Recommend recomputing on a view switch and on a workspace change, and never inside a deal that only moved one note.
3. **What it buys [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]], which is a lot.** On this repository, 35 visible tiles as cards is about 245 more elements on a base of 729 — nothing. On Your Trainer, 286 tiles is about 2,000 more on 2,303 — the document doubles. So an adaptive band does not merely make finished notes readable; it makes "every finished note is an ordinary card" affordable on the corpora Edwin actually works in, and leaves the hard case to one workspace. That reframes ISS-0073 from a yes-or-no into a threshold.

## Repro

1. `cd desktop && npm start` on this repository, Glass surface, Issues view.
2. Turn until the quiet band is in front of you. The tiles occupy a small part of a wide shelf and are smaller than they need to be.
3. Do the same on the cockpit's workspace: the same shelf, nearly full.

## Risk scan

No trigger applies: no new dependency, env var, path or exposure. The shape feeds the measured frame rate, so any change to it re-opens [[PHASE-0002-Glass]]'s frame-time criterion and the numbers in [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] must be taken again.

## Next Actions

- [ ] Edwin confirms the reading above: adapt by **size and detail** with the band staying behind the person, rather than by walking the band forward.
- [ ] Then a task under [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]: `quietShapeFor` as a pure function with a table test, recomputed on a view or workspace change only, and the measurement retaken on all three workspaces.
- [ ] **Settle [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]] first.** If the shelf is not drawn there is no shape to adapt and this issue dissolves.
## Planned, 2026-09-12

**Edwin confirmed the reading this note asked him to confirm: adapt by size and detail, with the band staying where it is.** Planned into [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]] as [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]], and recorded in [[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]].

The shape function is driven by the deal's population per band, as this note suggested, and not by the project's note count. It covers all four bands rather than the quiet one alone, because there are now four and hand-writing four sets of constants would be worse than three. No band's depth varies with its population: a small quiet band's tiles grow and the band stays behind the person, because depth carries priority and done work must not read as active. The shape is recomputed on a view change and on a workspace change only.

**This issue's third next action is answered.** It said to settle [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]] first, because a shelf that is not drawn has no shape. That issue's recommendation was withdrawn: the quiet band is still drawn and it gains a capacity, so there is a shape to derive.
