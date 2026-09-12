---
type: "[[task]]"
id: TASK-0072
aliases: ["TASK-0072"]
title: "Every band has a capacity and the deal places a fourth: the middle's remainder stands in the outer field, the quiet band caps like the rest, and no note is counted and then dropped"
status: done
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

**The fourth `Band` value.** `Band` in `desktop/src/shared/description.ts` and `BandName` in `desktop/src/shared/slots.ts` gain `'outer'`, ordered between `'mid'` and `'deep'`. Edwin chose the name on 2026-09-12 ([[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], decision 11).

**A view never sends a note to the outer field; the field puts it there.** `BandTable.rows` keeps describing the view's own rule — owed to the front, subject to the middle, terminal to the quiet band — and gains no new row kind. A description that names `outer` explicitly is accepted and works, because `bandOf` walks the rows and returns what they say, but nothing in the repository's descriptions does that and nothing is changed to make it happen. The outer field is where the field puts the middle's remainder.

**A capacity per band.** `BandTable` gains `outerCapacity` and `deepCapacity` beside `frontCapacity` and `midCapacity`, read from a description's `band` section with defaults the way the existing two are (`positive(band['frontCapacity'], 12)`). The defaults are the values [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]'s shapes can actually place; until that task lands, the outer field's default is the geometry's own count and the quiet band's is a thousand a layer, so this task changes no picture on its own.

**What `dealField` does.** The front band is unchanged, spare slots for a pull included ([[ISS-0059-The-Front-Band-Hides-What-A-Hand-Or-A-Lift-Asked-For]] is not disturbed). The middle fills to `midCapacity`, and what is past it goes to the outer field in the order it was dealt rather than being counted. The outer field fills to `outerCapacity` and counts the rest as `outerOverflow`. The quiet band fills to `deepCapacity` and counts the rest as `deepOverflow`. `FieldDeal` gains `outer: FieldEntry[]`, `outerOverflow: number` and `deepOverflow: number`, and the comment on `midOverflow` — "Counted, never sent behind" — is rewritten, because the middle's remainder is now placed.

**A pushed note keeps its place.** [[FEAT-0014-The-Hands]] pushes a note behind the person, and `pushedBehind` counts those. A hand's push must reach the quiet band and not the outer field, and a pushed note must not be the one the quiet band's capacity drops. Push-behind is a person's deliberate act; the capacity drops the far end of the record's own ordering, never a hand's.

**`Bands<T>` in `slots.ts` gains a `outer` list**, and `assignSlots` deals it from the outer field's slots. Which slots those are is [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]]; until then the outer field may borrow the quiet band's generator at a nearer depth, and the task says so in its Outcome.

## Acceptance

- For every view of all three workspaces, `front.length + mid.length + outer.length + deep.length + frontOverflow + midOverflow + outerOverflow + deepOverflow` equals the number of entries dealt.
- A note whose band rule says `mid`, past `midCapacity`, is in `outer` and not in `midOverflow`.
- `midOverflow` is only ever non-zero when the outer field is also full.
- The quiet band stops at `deepCapacity` and reports the rest as `deepOverflow`.
- A note a hand pushed behind is in `deep`, and is never one of the notes `deepOverflow` counts.
- A pulled note still takes a front-band spare slot, and an owed note past the front capacity is still counted rather than demoted.
- The middle keeps the navigator's order, heading by heading, and the outer field continues it.
- A description that names no capacity gets the defaults, and every existing description deals exactly as it does today except that the middle's remainder is now placed.
- `desktop/tests/field.test.mjs` asserts all of the above, and [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]] names it.

## Steps

- [x] Add `'outer'` to `Band` and `BandName`, and `outer` to `Bands<T>` and `FieldDeal`.
- [x] Add `outerCapacity` and `deepCapacity` to `BandTable` and to `readBand`, with defaults and the same `positive()` guard.
- [x] Rewrite the overflow branch of `dealField` so the middle's remainder is placed and every band counts its own.
- [x] Deal the outer field in `assignSlots`.
- [x] Extend `desktop/tests/field.test.mjs` and `desktop/tests/band-and-face.test.mjs` where the band vocabulary is asserted.
- [x] Break the deal on purpose, one break per run, and record which checks fail in [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]]: drop the middle's remainder again; let the outer field take everyone; let the quiet band take everyone; drop a pushed note by capacity. All four caught.
- [x] Commit the suite and [[TST-0053-Every-Note-Has-A-Band-And-Every-Band-States-Its-Remainder]] together.

## Notes

The orbit assigns its own slots (`band: near.has(id) ? 'front' : 'deep'`) and never calls `dealField`, so nothing here reaches it. Adding a value to `BandName` will surface every exhaustive switch over it, which is the point of adding it to the type rather than to a string.

## Outcome

**Done 2026-09-12. The middle's remainder is placed and every band states what it could not place; nothing on screen has changed yet, because no renderer reads the new band.** 439 checks passing, both typechecks clean.

**The middle is split after it is ordered, not while it is dealt.** The plan said the middle fills and the remainder goes to the outer field "in the order it was dealt". That order is `frontRank`'s, which exists to decide who gets front-band slots, and it would have put whichever notes happened to be ranked last in the outer field. The middle's notes are now collected whole, sorted into the navigator's order once, and only then cut at `midCapacity` — so the outer field genuinely continues the middle, which is what the acceptance line asks for and what a person reading a sector expects.

**A note past both bands is counted once, as the middle's.** `outerOverflow` exists and is zero for every description in this repository, because none of them names the outer field; it counts only what a view's own rows sent there. Counting the middle's remainder in both places would have broken the arithmetic that the whole rule rests on.

**A pushed note is held back and placed first.** [[FEAT-0014-The-Hands]]'s push is a person's deliberate act, and the quiet band's new capacity must not undo it. Pushed notes are collected separately and placed before the record's own, so the remainder is always the far end of the record's ordering.

**The capacities chosen, and why they change no picture today.** `outerCapacity` defaults to 40, the same as the middle, because the outer field is the middle again. `deepCapacity` defaults to 3000, which is the three layers the quiet band's stated shape already supports, so no workspace draws fewer tiles than it did before the capacity existed. [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]] replaces both with the derived shape's own count, and that is where the numbers stop being arbitrary.

**`OUTER` borrows the middle's columns at depth 690.** Between `MID`'s 620 and `QUIET`'s 760, with the middle's angles, so the outer field reads as the middle one step further out. `outerSlots()` is a real generator rather than the borrowed quiet-band one the task allowed, because writing it properly cost a dozen lines and [[TASK-0073-Each-Bands-Shape-Follows-What-It-Holds]] has to rewrite it either way.

**The outer field is dealt straight, not heading by heading.** The middle starts a new column for a heading of three or more, so a sector is one heading. Doing that again in the outer field would start a new column for a heading whose first cards are in the band in front of it, which reads as two headings. The comment in `assignSlots` says so.

**Adding the value to the type surfaced six call sites**, which is why it was added to the type: two band tables (`views.ts`, `base-file.ts`), `FieldModel`'s empty deals, and two in `glass.ts`. None of them was found by reading.

**One check outside this feature moved.** `desktop/tests/evaluator.test.mjs` asserts this repository has seventeen features; FEAT-0018 made it eighteen. Its own comment says a new feature should fail it, so the number was updated.