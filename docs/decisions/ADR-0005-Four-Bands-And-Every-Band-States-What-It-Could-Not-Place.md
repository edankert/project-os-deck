---
type: "[[adr]]"
id: ADR-0005
aliases: ["ADR-0005"]
title: "The Glass field has four bands, every band places only what fits and states the rest on screen, and each band's shape is derived from how much it holds"
status: proposed
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source:
  - "Edwin 2026-09-12: 'Not sure now I know what the quiet band was supposed to be used for. Maybe we need more bands and allow cards to be brought up to the active front band????'"
  - "Edwin 2026-09-12, on the plan and on [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]: 'Fully agree, plan the full solution and on ISS-0078: do as suggested.'"
  - "Edwin 2026-09-12, on [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]: 'I think we need to make the ring size adaptive based on the number of notes in a project (review and suggest).'"
  - "[[DES-0002-The-Glass-Cockpit]] review, 2026-09-05: 'past 40 mid slots a subject note falls into \"the quiet\", which then means both finished and did not fit. Both need a stated rule.'"
decided_option: "Option 1"
decision: "The Glass field gains a fourth band, the far band, between the middle and the quiet band, and it holds the view's own active work that the middle had no room for. Every band, the quiet one included, places at most its own capacity and states on screen how many of its notes it could not place. Each band's shape — its depth, its rows and columns, and the size of what stands in it — is a pure function of how many notes that band holds in this deal, recomputed when the view or the workspace changes and never inside a deal that moved one note."
context: "A note the view's rule sends to the middle, past the middle's 64 slots, is drawn nowhere at all: `dealField` counts it as `midOverflow` and drops it. On Your Trainer's Issues view that is hundreds of active notes with no position in a field whose whole claim is that depth carries priority. Finished work at least has a shelf. At the same time the quiet band is the one band that draws every note it holds, up to 286 canvas tiles, and its shape is a frozen constant sized for the largest workspace on the fleet — a repository of 261 notes puts 35 tiles on a shelf built for a thousand."
alternatives:
  - "Let the middle overflow into the quiet band, as the DES-0002 prototype did: the quiet band then means both 'finished' and 'did not fit', which are different things a person needs to tell apart"
  - "Page the middle: keep 64 slots and let a person step through the rest, which adds a control and a piece of state and makes 'everything has a place' false in a different way"
  - "Stop drawing the quiet band and keep only its count: withdrawn in [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]], because DES-0002 promised the band stays one gesture away, which argues for fixing the gesture"
  - "Delete the quiet band outright, and push-behind with it: retires a gesture [[FEAT-0014-The-Hands]] built and a premise DES-0002 rests on"
consequences:
  - "[[DES-0002-The-Glass-Cockpit]] is amended: the field has four bands rather than three, and 'anything visible is clickable' is carried to the canvas as well as to elements"
  - "[[PHASE-0002-Glass]] exit criterion 1 says 'the quiet band is behind you with its count on screen'; the count stays and now sits beside a remainder, so the wording is amended rather than answered"
  - "[[PHASE-0002-Glass]]'s frame-time criterion is re-opened and retaken on all three workspaces, throttled as well as not, because a fourth band and promoted tiles put more on screen"
  - "`BandName` in `desktop/src/shared/slots.ts` and `Band` in `desktop/src/shared/description.ts` gain a fourth value; `BandTable` gains a capacity per band"
  - "The orbit assigns its own slots and paints through `paintOrbit`, so it does not read the band geometry and is untouched"
  - "[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] stays open behind the measurement: the free list is built only if the numbers ask for it"
supersedes: ""
superseded: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]]", "[[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]", "[[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "[[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]", "[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]"]
---

# Four bands, and every band states what it could not place

## Rule

Every band of the Glass field places at most its own capacity and states on screen how many of the notes dealt to it it did not place.

## Domain

The four bands of the Glass field, named once as `BandName` in `desktop/src/shared/slots.ts` and as `Band` in `desktop/src/shared/description.ts`: `front`, `mid`, `far` and `deep`. The rule ranges over bands, not over views: a view chooses which notes go to which band through its description's `band` rows, and the capacities belong to the field.

## Conformance

[[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]] is the discharge. It deals each of the three measured workspaces and asserts that the four band lists plus the four remainders add up to the number of notes the view holds, for every band table the repository has. **The suite is authoritative when it and a band disagree**: a band that draws more than its capacity is a defect in the band, not in the test, because the frame-time number the phase measures is only meaningful if a capacity means something.

## Context

**A note the middle had no room for is drawn nowhere.** `dealField` in `desktop/src/shared/field.ts` fills the front band to `frontCapacity`, fills the middle to `midCapacity`, and for anything past that increments `midOverflow` and drops the entry. The deep band takes only the notes whose band rule says `deep`. So there is no path from a full middle to anywhere. On Your Trainer's Issues view — 409 notes, 34 of them owed — hundreds of active notes have no position at all, and the bar's sentence "and 300 more in the middle — all listed in the navigator" is the entire treatment.

This was seen once before. DES-0002's own review said it on 2026-09-05, of the prototype: past 40 mid slots a subject note falls into the quiet band, which then means both finished and did not fit, and both need a stated rule. Deck answered half of it — the overflow is counted out loud, which the prototype never did — and left the note placeless.

**The quiet band has the opposite problem.** It draws every note it holds, as up to 286 canvas tiles, and its shape is a frozen constant: forty columns by twenty-five rows, a thousand tiles to a layer, at depth 760. That was sized for Your Trainer's 2,734 notes. This repository holds 261 and never puts more than 35 tiles on screen, so its finished work sits on a shelf built for thirty times as much, further away and smaller than anything requires.

## Options

1. **A fourth band for the remainder, with every band's shape derived from what it holds.** The view's own work that did not fit stands at its own depth, between the middle and the quiet band, smaller than a mid card and larger than a quiet tile. Priority then runs front, middle, far, quiet, and nothing falls out. Four hand-written sets of constants would be worse than three, so the geometry is derived rather than listed.
2. **Let the middle overflow into the quiet band.** Cheapest, and it is what the prototype did. The review already named the cost: the quiet band then means both "finished" and "did not fit", and a person cannot tell them apart without a mark that distinguishes them.
3. **Page the middle.** Keep 64 slots and let a person turn or step through the rest. It keeps the geometry and adds a control and a piece of state, and it makes "everything has a place" false in a different way.

## Decision

**Option 1**, in three parts.

**A fourth band.** `BandName` gains `far`, between `mid` and `deep`. It holds the view's own active work past the middle's capacity. Its notes are drawn as cards, smaller than a mid card, so a person can read what they are; its depth is behind the middle and in front of the quiet band, so depth still carries priority for every note in the view.

**Every band has a capacity and states its remainder.** The front and middle bands already do this. The far band and the quiet band gain the same. A quiet band with a capacity is still drawn and still holds the finished work; it simply stops promising to draw all of it, exactly as the front band stops at twenty. Edwin agreed to this on 2026-09-12: "on ISS-0078: do as suggested". It is a capacity and never a deletion.

**Every band's shape is derived from its own population.** One pure function turns "how many notes are in this band in this deal" into the band's depth, rows, columns and box size. Today's constants are its value at the large end. The band that adapts does so by **size and detail and not by depth**: a small quiet band's tiles grow until they are readable, and the band stays behind the person, because done work must not read as active. The shape is recomputed when the view or the workspace changes, and never inside a deal that moved one note, or the field would never sit still.

## Alternatives

- Overflow into the quiet band (option 2), rejected because it conflates finished work with work that did not fit.
- Paging the middle (option 3), rejected because it adds state and still leaves notes with no place.
- Removing the drawn quiet band, proposed in ISS-0078 and withdrawn there the same day.
- Deleting the quiet band and push-behind with it, rejected in ISS-0078.

## Consequences

- **DES-0002 is amended** on two points: the field has four bands, and its rule "anything visible is clickable" now covers what is painted on the canvas, not only what is an element.
- **PHASE-0002 exit criterion 1 needs its wording amended.** It reads "the quiet band is behind you with its count on screen". The count stays, and it now sits beside a remainder — "N in the quiet band, M not placed" — so the criterion should say so. This is Edwin's to word; see the feature's open questions.
- **PHASE-0002's frame-time criterion is re-opened.** A fourth band of cards and promoted quiet tiles put more on screen than the number measured on 2026-09-10. The measurement is retaken on all three workspaces, throttled as well as not.
- **The week-of-use criterion is not answered by this.** It asks whether anything was lost behind the person. A reachable quiet band is the condition under which that question is worth asking at all.
- **`BandTable` gains a capacity per band** (`farCapacity`, `deepCapacity`) beside `frontCapacity` and `midCapacity`. `BandTable.rows` is already data, so the fourth band costs a value, a capacity and a geometry, not a new rule engine.
- **The orbit is untouched.** It assigns its own slots with `band: near.has(id) ? 'front' : 'deep'` and paints through `paintOrbit`, so it never reads the band geometry or the deal.
- **[[ISS-0077-Glass-Draws-One-Element-Per-Note-And-Never-Uses-The-Pool]] is not decided here.** The free list is built only if the retaken measurement asks for it.
