---
type: "[[change]]"
id: CHG-20261014-Give-every-flow-count-its-own-mark
title: "Give every flow count its own mark"
status: merged
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin's 2026-10-14 integration-fix request"]
commit: "45a907c"
pr: ""
impacts: ["[[TST-0089]]", "[[TST-0100]]"]
platforms: [app]
issues: []
features: ["[[FEAT-0026]]", "[[FEAT-0029]]"]
related: ["[[TASK-0141]]", "[[TASK-0142]]"]
---

# Give every flow count its own mark

## Summary

S6 and S7 give each side of a ratio its own text and count mark. A completed count names its progress arc; the total names its ring. The screen check also rejects bare counts disguised as names while preserving names such as Schwinn 800IC.

## Impact

- S6 release testing: platform progress keeps both completed and total counts, each attached to its own drawing.
- S7 feature acceptance: each known lamp gains a completed-progress arc beside its total ring; unknown evidence still shows a question mark.

Deck has no surface-note registry, so these existing screen names identify the affected views. TST-0089 and TST-0100 have no human verdict to invalidate. Their acceptance walks remain pending.

## Documentation Coverage (All Types Considered)

- features: updated — FEAT-0026 and FEAT-0029 record the repaired integration and verification.
- requirements: not-applicable — existing PHASE-0005 count and word rules are enforced.
- tasks: new — TASK-0141 records the count repair; TASK-0142 fixes a temporary-directory race exposed by the full suite.
- issues: not-applicable — both known defects are fixed in this session.
- tests: updated — TST-0083 and TST-0085 record numeric-name and ratio coverage.
- workflows: not-applicable — existing build and test commands remain unchanged.
- decisions: not-applicable — no architecture decision changes.
- risks: not-applicable — no new dependency, environment setting, path contract or exposure.
- changes: new — this note records the integration repair.
- snapshot: updated — task membership and counters derive from the notes; focus stays in PHASE-0005.

## Verification

`cd desktop && npm test` passes all 737 tests with zero failures and zero skips. `bash tools/agents/check-docs-first.sh` and `bash tools/scripts/validate-docs.sh` pass. Two independent reviewers checked the repairs; the bounded second round approved both follow-up fixes. Recorded flow scenes use at most 49 words at rest. The module scanner now excludes temporary fixture directories while retaining application outputs, including the root preload module. It changes no product behavior.
