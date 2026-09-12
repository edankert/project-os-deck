---
type: "[[test]]"
id: TST-0053
aliases: ["TST-0053"]
title: "Every note the view holds has a band and every band states its remainder: the four lists plus the four counts add up, the middle's remainder is placed rather than dropped, and a pushed note is never the one a capacity drops"
status: active
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/field.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh field"
covers: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]"]
issues: ["[[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]]", "[[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]"]
tasks: ["[[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]"]
artifacts: []
adequacy: "Four deliberate breaks, one per run; each failed at least one check and the failures are named below."
mutation_score: "4/4 breaks caught"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]]", "[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
---

# Every note has a band and every band states its remainder

## Purpose

This suite is the discharge of [[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]'s rule: every band places at most its own capacity and states how many it did not place. The arithmetic that proves it is one line — the four band lists plus the four remainders equal the number of notes dealt — and it is run over the real payloads of all three workspaces, so it fails the moment a note is counted and then dropped.

**This note must be committed together with its suite.** `command:` names `field`, and [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]] extends `desktop/tests/field.test.mjs`. That file already exists and is named by [[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]], which keeps its own checks; this note names the new ones. Written at planning time on 2026-09-12 and not committed then.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh field`.

## Expected results

- For every view of all three workspaces, `front + mid + outer + deep + frontOverflow + midOverflow + outerOverflow + deepOverflow` equals the number of entries dealt.
- A note whose band rule says `mid`, past `midCapacity`, is in the outer field and not in `midOverflow`.
- `midOverflow` is non-zero only when the outer field is also full.
- The quiet band stops at `deepCapacity` and reports the rest as `deepOverflow`.
- A note a hand pushed behind is in the quiet band and is never one of the notes `deepOverflow` counts.
- A pulled note still takes a front-band spare slot; an owed note past the front capacity is still counted rather than demoted.
- A description naming no capacity gets the defaults, and every existing view deals as it does today except that the middle's remainder is placed.

## Evidence

**Run 2026-09-12, `node --test tests/*.test.mjs`: 439 checks, 439 passing.** `desktop/tests/field.test.mjs` holds 22 of them and `desktop/tests/band-and-face.test.mjs` 17. Both typechecks clean.

The new checks in `desktop/tests/field.test.mjs`:

- "the middle's remainder is PLACED in the outer field, not counted and dropped"
- "the middle is counted only when the outer field is full too"
- "the outer field continues the navigator order the middle keeps"
- "the quiet band has a capacity like every other band, and states what it could not place"
- "a note a hand pushed behind is never the one the quiet band drops"
- "a pushed note that is not finished work is in the quiet band and counted as a hand's"
- "a description that names no capacity gets the defaults"
- "a pull still takes a front-band spare, and an owed note past the capacity is still counted"
- "the outer field takes its own slots, behind the middle and in front of the quiet band"

and in `desktop/tests/band-and-face.test.mjs`, over the real payloads of all three workspaces:

- "the middle's remainder stands in the outer field, and never falls into the quiet band"
- "a note is counted only when the middle and the outer field are both full"
- "the quiet band has a capacity like every other band, and states what it could not place"
- "the band function runs over the REAL navigation payloads, and loses nothing" — the conservation line, now over four bands and four remainders
- "Your Trainer's Issues view fills the front band past its capacity and the middle into the outer field" — this is the fixture that proves the outer field is exercised by real data rather than by a constructed case

**What the real payloads say.** On Your Trainer's Issues view the middle fills to 40 and the outer field takes the rest of the subject. Those notes had no position at all before this change: `dealField` counted them as `midOverflow` and dropped them, which is what [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]] reported.

One check outside this feature had to move: `desktop/tests/evaluator.test.mjs` counts this repository's own features and asserted seventeen. FEAT-0018 made it eighteen. Its comment says a new feature should fail it, so the number was updated rather than the check loosened.

## Adequacy (who verifies this test?)

Four breaks, one per run, each applied to `desktop/src/shared/field.ts`, rebuilt, and run against `field` and `band-and-face` together. **All four were caught.**

| The break | What failed |
|---|---|
| 1. The middle's remainder is dropped again — the outer branch removed, so a note past `midCapacity` goes straight to `midOverflow`. This restores [[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]] exactly. | 3 checks: "the middle's remainder is PLACED in the outer field", "the middle is counted only when the outer field is full too", "the outer field continues the navigator order the middle keeps" |
| 2. The outer field takes everyone — its capacity test replaced by `true`. | 1 check: "the middle is counted only when the outer field is full too" |
| 3. The quiet band takes everyone — its capacity test replaced by `true`. This restores the behaviour [[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]] named. | 2 checks: "the quiet band has a capacity like every other band", "a note a hand pushed behind is never the one the quiet band drops" |
| 4. A pushed note is no longer placed first — `[...pushedAside, ...deep]` reversed. | 1 check: "a note a hand pushed behind is never the one the quiet band drops" |

**A note on how break 1 was found.** The first run of it reported every check passing, which would have meant the suite could not catch the defect the whole task exists to fix. The substitution had not applied: it was written against six spaces of indentation and the split had moved into a loop indented by four, so the file was rebuilt unchanged. A break that never happens looks exactly like a check that cannot fail. The mutation was re-applied, the changed lines printed before the run, and only then did the three checks fail.

**What the conservation line does not catch.** Under break 1 the arithmetic still balances, because a dropped note is still counted in `midOverflow`. Conservation proves nothing is LOST; it does not prove anything is PLACED. That is why the three dedicated checks exist beside it.
