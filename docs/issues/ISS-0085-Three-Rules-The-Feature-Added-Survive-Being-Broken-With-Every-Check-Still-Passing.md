---
type: "[[issue]]"
id: ISS-0085
aliases: ["ISS-0085"]
title: "Three rules this feature added can each be broken with all 465 node checks still passing, and one of the three is the exact defect the smoke run already found once"
status: triage
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: 2026-09-17
source: ["Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17"]
severity: medium
component: tests
parent: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]", "[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]"]
tests: []
---

# Three rules survive being broken

## Problem

The review broke each of these on purpose, rebuilt, and ran the full node suite. All 465 checks passed every time.

**The outer field's capacity has no cover on the path a workspace uses.** Changing `outerCapacity: positive(band['outerCapacity'], 64)` to `1` in `desktop/src/shared/description.ts` changes nothing any check reads. The test that asserts 64 reads `VIEWS`, which hardcodes the number in `views.ts`. The `readBand` path — a description supplied by a workspace, and `base-file.ts` — is uncovered, and that is the path the Vault phase will use.

**The quiet cursor's `pointer-events: none` has no cover.** Changing it to `auto` reintroduces the exact defect the smoke run found while [[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]] was being built: the cursor element swallows the clicks meant for the canvas behind it. `desktop/tests/glass-style.test.mjs` has a check named "the quiet cursor is drawn over the field and does not swallow the canvas" — it asserts `position: absolute` and `background: transparent`, and never the property its own name is about.

**The same check therefore mis-states what it covers**, which is worth fixing at the same time: a name that claims more than the assertions is how a gap survives a reading.

## Expected

Each of the three is asserted where it is defined: `outerCapacity`'s default on the `readBand` path, `pointer-events` in the style check that claims it, and the style check's name matching what it asserts.

## Evidence

Reproduced. Each mutation was applied to the working tree, `npm run build` re-run, `node --test` run in full, and the tree restored with `git checkout --`; `git status` was clean afterwards.

```
outerCapacity default 64 -> 1 in description.ts      465/465 pass
.quiet-cursor pointer-events: none -> auto           465/465 pass
```

## Risk scan

No trigger applies: these are test additions.

## Next Actions

- [ ] Assert `readBand`'s defaults directly, including `outerCapacity`.
- [ ] Assert `pointer-events: none` on `.quiet-cursor`, and rename the check if it still claims more than it checks.
