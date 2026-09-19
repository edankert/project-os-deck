---
type: "[[issue]]"
id: ISS-0083
aliases: ["ISS-0083"]
title: "Two of the smoke run's fourteen new checks are written so that they pass whatever the renderer does, and one of them is the only cover for the pointer cursor"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: "2026-09-19"
source: ["Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17"]
reported_by: review
severity: medium
component: tests
parent: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[ISS-0081-Resting-The-Pointer-On-A-Tile-Does-Nothing-Because-The-Handler-Only-Runs-In-The-Orbit]]"]
tests: []
---

# Two smoke checks cannot fail

## Problem

**A check that cannot fail does not guard anything, and two of the fourteen checks [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]] added are that kind.** Both are in `desktop/src/main/smoke-glass.ts`.

```
2035:      record(typeof cursor === 'string', `the field reports a cursor over a tile (${cursor})`);
2096:    record(shapeSwitched !== shapeBefore || true, `a view switch recomputes the shapes (...)`);
```

`getComputedStyle(el).cursor` always returns a string, and `X || true` is always true. Line 2035 is the only cover for the acceptance line "shows the pointer cursor"; written as `cursor === 'pointer'` it would have caught [[ISS-0081-Resting-The-Pointer-On-A-Tile-Does-Nothing-Because-The-Handler-Only-Runs-In-The-Orbit]] before the feature reached review. Line 2096 is the only cover for the claim that a view switch recomputes each band's shape, which is the half of that decision no node suite can reach, because it is about the renderer's caching rather than the pure function.

Line 2035's `js` expression also computes a `getBoundingClientRect()` it never reads.

Two further gaps in the same section, both against [[TASK-0078-The-Smoke-Run-Clicks-A-Finished-Note-And-Pulls-It-Forward]]'s own title. There is no check for the hover callout at all. And no check pulls a quiet note to the front band: the pull checks at lines 450 to 472 are [[FEAT-0014-The-Hands]]'s, on a mid-band card.

This narrows what [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] can claim. Its adequacy note says eleven of the fourteen checks rest on pure suites that are broken deliberately underneath them. That is true of nine of them. Nothing rests underneath a tautology.

## Expected

Every check in the suite can fail. The cursor check asserts `pointer`; the shape check compares the two shapes without the `|| true`, and says what it means when two views legitimately earn the same shape.

## Evidence

Reproduced by reading the source.

```
$ grep -n "|| true\|typeof cursor === 'string'" desktop/src/main/smoke-glass.ts
2035:      record(typeof cursor === 'string', `the field reports a cursor over a tile (${cursor})`);
2096:    record(shapeSwitched !== shapeBefore || true, `a view switch recomputes the shapes (...)`);
```

## Risk scan

No trigger applies.

## Next Actions

- [ ] Assert `cursor === 'pointer'`, and drop the unread rectangle.
- [ ] Make the shape check compare two views that are known to earn different shapes, so the comparison means something.
- [ ] Add a check for the hover callout and one that pulls a quiet note to the front band.

## Where this stands

**2026-09-17: all four actions taken, none verified by a run.**

- The cursor check asserts `cursor === 'pointer'` and the unread rectangle is gone.
- The shape check no longer compares the two views to each other, which was never the right question because two views can legitimately earn the same shape. It compares the shape the renderer is holding against the shape `bandShapeFor` says that band's own count earns, which is a rule that can be wrong. The before-and-after fact is printed in the message rather than asserted.
- A hover callout check was added: resting on a tile names the note, and moving off takes it away.
- Four checks were added for pulling a quiet note to the front band, two for the keyboard route and two for the drag.

None of these has been run. They are smoke checks; the suite opens windows and Docker was not running, so [[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]]'s container was not available either. This stays `open` until a run settles them.

## Checked against the code, 2026-09-19: already done

Evidence: `grep -n "|| true\|typeof cursor === 'string'" desktop/src/main/smoke-glass.ts` finds only comments (2036, 2238). Line 2045 asserts `resting.cursor === 'pointer'`; lines 2046-2048 assert the callout names the note; line 2055 asserts moving off removes both. Lines 2242-2245 compare the renderer's shape with `bandShapeFor('deep', ...)` instead of `|| true`. The smoke run has not executed this code: the fix is in commits `fb4982b` and `223d582`, which are among 18 commits not yet pushed (`git rev-list --count origin/main..main` is 18), and the last `deck-smoke` CI run (2026-09-12) failed on an unrelated DES-0001 verb check.

**Belongs to:** [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]] (TASK-0078), PHASE-0002 Glass. **Next:** the first smoke run after the push runs these checks for the first time.

Checked as part of project-os-dev FEAT-0036 (TASK-0141).
