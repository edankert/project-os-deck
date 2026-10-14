---
type: "[[change]]"
id: CHG-20261014-Acceptance-flows-show-what-the-cockpit-can-do
title: "Acceptance flows show what the cockpit can do"
status: merged
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin's round-one repair request"]
commit: "a6fb6c7, 388d11e, a7d450a"
impacts: ["[[TST-0088]]", "[[TST-0089]]", "[[TST-0100]]"]
platforms: [app]
issues: []
features: ["[[FEAT-0029]]"]
related: ["[[TASK-0143]]", "[[RISK-0009]]"]
---

# Acceptance flows show what the cockpit can do

## Summary

S7 offers only feature transitions the cockpit advertises and explains the acceptance stamp's unchanged status. Empty lamps supply no evidence, missing results are explained, and string review provenance is read. S6 keeps progress across unrelated commits and removes stale saved results. S5 draws unselected plates as outlines.

## Impact

- S5 design acceptance: the selected image stands clearly in front of outlined plates.
- S6 release testing: saved steps survive commits and separate workspaces, releases, platforms and check content; stale saved results are removed from storage.
- S7 feature acceptance: unsupported actions explain the cockpit limit, empty lamps stay hollow, and every unknown lamp explains its missing evidence.
- S3 ticket: the shared gate also draws empty lamps as hollow.

Deck has no surface-note registry. These names identify its existing screens. TST-0088, TST-0089 and TST-0100 have no human verdict to invalidate.

## Documentation Coverage (All Types Considered)

- features: updated — FEAT-0029 narrows its promises to the cockpit's current capability and records why Edwin must decide.
- requirements: not-applicable — no requirement is rewritten; PHASE-0005's broader exit criteria remain pending.
- tasks: new — TASK-0143 covers the eight findings.
- issues: not-applicable — these are repairs inside the feature under review.
- tests: updated — existing flow suites and acceptance walks cover the repairs.
- workflows: not-applicable — build and test commands stay the same.
- decisions: not-applicable — ADR-0003's advertised-action and shell-write boundary is enforced.
- risks: updated — RISK-0009 records direct agent writes the sidecar still permits.
- changes: new — this note.
- snapshot: updated — focused task and derived membership/counts.

## Verification

2026-10-14: `cd desktop && npm test` passed 745 tests, with zero failures and zero skips. The build and headless plate script regenerated all 14 plates; the changed S5 and S7 pictures were inspected. The documentation validator and whitespace checks pass. FEAT-0029 stays at review for Claude and Edwin.
