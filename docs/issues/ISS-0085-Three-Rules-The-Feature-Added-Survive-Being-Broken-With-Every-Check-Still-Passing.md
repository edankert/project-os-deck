---
type: "[[issue]]"
id: ISS-0085
aliases: ["ISS-0085"]
title: "If a workspace's own view description leaves out the outer field's size, and the default of 64 were broken, the outer field could shrink to one note and no check would fail"
status: open
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: "2026-09-19"
source: ["Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17"]
reported_by: review
severity: medium
component: tests
parent: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]", "[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]"]
tests: []
---

# The outer field's default size has no check on the path a workspace uses

## Problem

If the default outer-field size of 64 were broken, a workspace view that does not state its own size would show far fewer notes in the outer field, and no check would fail. The review broke each of these on purpose, rebuilt, and ran the full node suite. All 465 checks passed every time.

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

## Checked against the code, 2026-09-19: still true, kept

**What a user notices:** Nothing today. If the default outer-field size of 64 in `readBand` were broken, a view supplied by a workspace (the path the Vault phase will use) could put far fewer notes in the outer field, and every check would still pass.

Evidence: Two of the three parts are done. `desktop/tests/glass-style.test.mjs:116-119` now asserts `pointer-events: none` on `.quiet-cursor`, so the check's name matches what it asserts. The third is not: `grep -rn outerCapacity desktop/tests/` finds only `field.test.mjs:300`, which reads the built-in `VIEWS`, and fixture tables that set it explicitly. `desktop/tests/descriptions.test.mjs:28` parses a band with no `outerCapacity` but never asserts the default that `desktop/src/shared/description.ts:435` (`positive(band['outerCapacity'], 64)`) supplies.

**Belongs to:** [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], PHASE-0002 Glass. **Next:** small fix: one assertion in `descriptions.test.mjs` that a parsed band with no `outerCapacity` gets 64.

Checked as part of project-os-dev FEAT-0036 (TASK-0141).
