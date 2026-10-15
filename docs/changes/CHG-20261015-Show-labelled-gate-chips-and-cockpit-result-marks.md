---
type: "[[change]]"
id: CHG-20261015-Show-labelled-gate-chips-and-cockpit-result-marks
title: "Show labelled gate chips and cockpit result marks"
status: merged
owner: system:codex
created: 2026-10-15
updated: 2026-10-15
source: []
commit: ""
pr: ""
impacts: ["[[TST-0088]]", "[[TST-0089]]", "[[TST-0100]]"]
# The platforms this change altered, such as [android] or [android, ios]. A release test lists
# its Impact lines only on these. Required once the Impact list names a screen and the project
# keeps ledgers for more than one platform (SCHEMAS.md, change.md).
platforms: [app]
issues: []
features: ["[[FEAT-0029]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TASK-0149]]", "[[TASK-0144]]"]
---

# Show labelled gate chips and cockpit result marks

## Summary

Feature gates now show five labelled chips with counts and item squares. Design and test-note tickets use the cockpit’s shared marks. Release-test beads use the cockpit’s result glyphs and words, separately from tickets.

## Impact

- S7 feature acceptance: Requirements, Tasks, Reviews, Automated tests and Acceptance tests each name what they count. Unknown evidence says “not reported” and empty chips say “nothing to check”. Each visible count has its own bar.
- S5 design acceptance: the design’s square uses its cockpit type, fill and needs-you flag.
- S6 release testing: check beads show result glyphs and words; the open check’s test notes appear as separate cockpit squares.
- S3 ticket: the old gate caller now draws compact chips. TASK-0148 consumes the new component’s nodes and list rows in the revised screen.

Deck has no surface-note registry. These names identify its existing screens. TST-0088, TST-0089 and TST-0100 have no human verdict in the working ledger to invalidate. Claude owns the official plate regeneration and window run.

## Documentation Coverage (All Types Considered)

- features: updated — FEAT-0026 and FEAT-0029 record implementation, verification and the drawing-lane handoff.
- requirements: not-applicable — the revision implements PHASE-0005 and DES-0005; no requirement is narrowed.
- tasks: updated — TASK-0144 and TASK-0149 are done with verification.
- issues: not-applicable — no independent unresolved defect was found.
- tests: updated — automated checks cover chips and results; the three acceptance walks name the new marks.
- workflows: not-applicable — build and test entrypoints are unchanged.
- decisions: not-applicable — the existing contract and shell write boundary are retained.
- risks: not-applicable — RISK-0009 already covers unavailable result evidence and sidecar guards; no new dependency or write path is added.
- changes: new — this note.
- snapshot: updated — task statuses and counts are derived, with a current handoff in focus.

## Verification

2026-10-15: `cd desktop && npm test` passes 764 tests, with zero failures and zero skips. Both live parity comparisons match: 356 Deck items and 2,706 Your Trainer items. All recorded flow scenes meet the look; the maximum is 50 words at rest, on S6 with More open. Headless SVG rasters were inspected for all six flow scenes and the compact chips. No Electron window or human verdict ran.

Removing one chip item square fails both fixture tests; replacing Blocked’s glyph with Pass fails the result test. The code was restored. The documentation and whitespace checks pass.
