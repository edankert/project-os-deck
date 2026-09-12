---
type: "[[task]]"
id: TASK-0072
aliases: ["TASK-0072"]
title: "Every band has a capacity and the deal places a fourth: the middle's remainder stands in the far band, the quiet band caps like the rest, and no note is counted and then dropped"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]]", "[[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]"]
parent: "FEAT-0018"
effort: "M"
due: ""
depends: []
blocks: ["TASK-0075"]
related: ["[[TASK-0029-The-Band-Function]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
tests: ["[[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]]"]
---

# Every band has a capacity and the deal places a fourth

## Objective

**A note the view holds is never counted and then dropped.** `dealField` in `desktop/src/shared/field.ts` today fills the front band to `frontCapacity`, fills the middle to `midCapacity`, increments `midOverflow` for everything past that, and lets the deep band take everyone whose band rule says `deep`. There is no path from a full middle to anywhere. This task adds the fourth band, gives every band a capacity, and makes the deal report a remainder per band.

## Detail

**The fourth `Band` value.** `Band` in `desktop/src/shared/description.ts` and `BandName` in `desktop/src/shared/slots.ts` gain `'far'`, ordered between `'mid'` and `'deep'`. The name is provisional ([[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], decision 11) and is one word in two type unions plus one sentence on the bar, so a rename before [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]] is cheap.

**A view never sends a note to the far band; the field puts it there.** `BandTable.rows` keeps describing the view's own rule — owed to the front, subject to the middle, terminal to the quiet band — and gains no new row kind. A description that names `far` explicitly is accepted and works, because `bandOf` walks the rows and returns what they say, but nothing in the repository's descriptions does that and nothing is changed to make it happen. The far band is where the field puts the middle's remainder.

**A capacity per band.** `BandTable` gains `farCapacity` and `deepCapacity` beside `frontCapacity` and `midCapacity`, read from a description's `band` section with defaults the way the existing two are (`positive(band['frontCapacity'], 12)`). The defaults are the values [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]'s shapes can actually place; until that task lands, the far band's default is the geometry's own count and the quiet band's is a thousand a layer, so this task changes no picture on its own.

**What `dealField` does.** The front band is unchanged, spare slots for a pull included ([[ISS-0059-The-Front-Band-Hides-What-A-Hand-Or-A-Lift-Asked-For]] is not disturbed). The middle fills to `midCapacity`, and what is past it goes to the far band in the order it was dealt rather than being counted. The far band fills to `farCapacity` and counts the rest as `farOverflow`. The quiet band fills to `deepCapacity` and counts the rest as `deepOverflow`. `FieldDeal` gains `far: FieldEntry[]`, `farOverflow: number` and `deepOverflow: number`, and the comment on `midOverflow` — "Counted, never sent behind" — is rewritten, because the middle's remainder is now placed.

**A pushed note keeps its place.** [[FEAT-0014-The-Hands]] pushes a note behind the person, and `pushedBehind` counts those. A hand's push must reach the quiet band and not the far band, and a pushed note must not be the one the quiet band's capacity drops. Push-behind is a person's deliberate act; the capacity drops the far end of the record's own ordering, never a hand's.

**`Bands<T>` in `slots.ts` gains a `far` list**, and `assignSlots` deals it from the far band's slots. Which slots those are is [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]; until then the far band may borrow the quiet band's generator at a nearer depth, and the task says so in its Outcome.

## Acceptance

- For every view of all three workspaces, `front.length + mid.length + far.length + deep.length + frontOverflow + midOverflow + farOverflow + deepOverflow` equals the number of entries dealt.
- A note whose band rule says `mid`, past `midCapacity`, is in `far` and not in `midOverflow`.
- `midOverflow` is only ever non-zero when the far band is also full.
- The quiet band stops at `deepCapacity` and reports the rest as `deepOverflow`.
- A note a hand pushed behind is in `deep`, and is never one of the notes `deepOverflow` counts.
- A pulled note still takes a front-band spare slot, and an owed note past the front capacity is still counted rather than demoted.
- The middle keeps the navigator's order, heading by heading, and the far band continues it.
- A description that names no capacity gets the defaults, and every existing description deals exactly as it does today except that the middle's remainder is now placed.
- `desktop/tests/field.test.mjs` asserts all of the above, and [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]] names it.

## Steps

- [ ] Add `'far'` to `Band` and `BandName`, and `far` to `Bands<T>` and `FieldDeal`.
- [ ] Add `farCapacity` and `deepCapacity` to `BandTable` and to `readBand`, with defaults and the same `positive()` guard.
- [ ] Rewrite the overflow branch of `dealField` so the middle's remainder is placed and every band counts its own.
- [ ] Deal the far band in `assignSlots`.
- [ ] Extend `desktop/tests/field.test.mjs` and `desktop/tests/band-and-face.test.mjs` where the band vocabulary is asserted.
- [ ] Break the deal on purpose, one break per run, and record which checks fail in [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]]: drop the middle's remainder again; let the far band take everyone; let the quiet band take everyone; drop a pushed note by capacity.
- [ ] Commit the suite and [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]] together.

## Notes

The orbit assigns its own slots (`band: near.has(id) ? 'front' : 'deep'`) and never calls `dealField`, so nothing here reaches it. Adding a value to `BandName` will surface every exhaustive switch over it, which is the point of adding it to the type rather than to a string.
