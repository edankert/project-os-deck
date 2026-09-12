---
type: "[[issue]]"
id: ISS-0079
aliases: ["ISS-0079"]
title: "A note the view's own rule puts in the mid band, past that band's sixty-four slots, is drawn in no band at all — not even behind the person — so on a large view most of the active work is missing from the field and only a count says so"
status: triage
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["Edwin 2026-09-12: 'Maybe we need more bands and allow cards to be brought up to the active front band????'", "DES-0002 review note, 2026-09-05: 'past 40 mid slots a subject note falls into \"the quiet\", which then means both finished and did not fit. Both need a stated rule.'"]
severity: high
component: renderer
parent: ""
related: ["[[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "[[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0014-The-Hands]]", "[[DES-0002-The-Glass-Cockpit]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# Active work past the mid band's capacity is drawn nowhere

## Problem

**The field's real hole is not the quiet band; it is the notes that reach no band at all.** The front band holds 20 slots and the mid band 64. A note the view's rule sends to the mid band, past those 64, is counted as `midOverflow` and left out of the deal — it is not demoted behind the person, it is simply not placed. On Your Trainer's Issues view, 409 notes with 34 owed, that is hundreds of **active** notes with no position in a field whose whole claim is that depth carries priority. The bar says "and 300 more in the middle — all listed in the navigator", and that is the entire treatment.

Finished work at least has somewhere to be. Work in progress that did not fit has nowhere.

> [!quote] As reported — 2026-09-12 (user:edwin)
> "Not sure now I know what the quiet band was supposed to be used for. Maybe we need more bands and allow cards to be brought up to the active front band????"

His question is about more bands. This is the band that is missing.

## This was seen once and never fixed

[[DES-0002-The-Glass-Cockpit]]'s own review said it on 2026-09-05, of the prototype: "Front band overflow is silent: 23 of the 80 notes carry an owed status and Overview shows 10 at the front, the other 13 in the mid band unmarked; **past 40 mid slots a subject note falls into 'the quiet', which then means both finished and did not fit. Both need a stated rule.**"

Deck answered half of it. The overflow is no longer silent — the bar states both counts, and that is a real improvement on the prototype. But the note still has no place, and in Deck it does not even fall into the quiet band: `dealField` increments `midOverflow` and drops the entry.

## Cause

`dealField` in `desktop/src/shared/field.ts`:

```
} else if (band === 'mid') {
  if (mid.length < table.midCapacity) mid.push(entry);
  else midOverflow += 1;
}
```

`deep` is filled only by notes whose band rule says `deep`. There is no path from a full mid band to anywhere else. The front band has one — a pulled note takes a spare slot (ISS-0059) — and the mid band has none.

The capacities come from the geometry: `MID` is 4 rows by 8 columns a side, 64 slots, and `FRONT` is 4 by 5, 20. Both are constants in `desktop/src/shared/slots.ts`.

## Expected

Every note the view holds has a position in the field, or the field says plainly that it is showing a selection and on what rule. A note that is active and did not fit must not be less visible than a note that is finished.

## Three ways

1. **A fourth band for the remainder.** Between the mid band and the quiet one: the view's own work that did not fit, at its own depth, smaller than a mid card and larger than a quiet tile. This is the direct answer to Edwin's "more bands", and it makes the field's claim true again — priority runs front, mid, remainder, quiet, and nothing falls out. It also needs [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]: four hand-written sets of constants is worse than three, so the geometry has to be derived rather than listed.
2. **Let the mid band overflow into the quiet band**, which is what the DES-0002 prototype did. Cheapest, and the review already named what is wrong with it: the quiet band then means both "finished" and "did not fit", which are different things a person needs to tell apart. Only acceptable with a mark that distinguishes them.
3. **Page the mid band.** Keep 64 slots and let a person turn or step through the rest. Keeps the geometry, adds a control and a piece of state, and makes "everything has a place" false in a different way.

Recommend 1, with the geometry derived. It is the only one where depth still carries priority for every note in the view.

## What this changes about [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]

That issue recommended dropping the drawn quiet band because it buys nothing. The argument does not survive this one. Once there is a fourth band for the remainder, the quiet band stops being the odd one out — it becomes the far end of a gradient that every note in the view sits somewhere on, and the reason to draw it is the same reason to draw the remainder band. The recommendation in ISS-0078 is withdrawn there.

## Repro

1. `cd desktop && npm start` on a large workspace, Glass surface, Issues view.
2. Count the cards in front and to the sides: at most 84.
3. Read the bar: "and N more in the middle — all listed in the navigator", where N is in the hundreds. Turn all the way round; none of them is anywhere.

## Evidence

- `desktop/src/shared/field.ts`, `dealField`: `midOverflow += 1` with no demotion, and the `FieldDeal` comment "Mid-band notes past its capacity. Counted, never sent behind."
- `desktop/src/shared/slots.ts`: `FRONT` 4 rows by 5 columns, `MID` 4 rows by 8 columns a side.
- `desktop/src/renderer/glass.ts`: the overflow line, `and ${n} more in the middle`, joined into "— all listed in the navigator".
- `desktop/src/shared/description.ts`, `BandTable`: `rows` is data — `{when, band}` per view — so a fourth band costs a `Band` value and a geometry, not a new rule engine.
- [[DES-0002-The-Glass-Cockpit]], review note "focus", 2026-09-05.

## Sibling search

No sibling found (searched `docs/issues/` for "overflow", "capacity", "mid band", "band"). [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] is about reaching a note that has a place; this is about a note that has none.

## Risk scan

No trigger applies: no new dependency, env var, path or exposure. A fourth band puts more notes on screen, so [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]'s measurement is retaken and [[PHASE-0002-Glass]]'s frame-time criterion re-opens.

## Next Actions

- [ ] Edwin confirms the fourth band, and whether it is drawn as small cards or as tiles.
- [ ] Then tasks under [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]], taken with [[ISS-0076-The-Quiet-Band-Is-Shaped-For-A-Corpus-Ten-Times-Most-Projects]]: the geometry is derived from what each band holds rather than listed per band, `dealField` places the remainder, and the measurement is retaken on all three workspaces.
