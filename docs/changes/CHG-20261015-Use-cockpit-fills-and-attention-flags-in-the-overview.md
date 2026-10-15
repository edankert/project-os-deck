---
type: "[[change]]"
id: CHG-20261015-Use-cockpit-fills-and-attention-flags-in-the-overview
title: "Use cockpit fills and attention flags in the overview"
status: merged
owner: system:codex
created: 2026-10-15
updated: 2026-10-15
source: []
commit: "96955cc, 619361c"
pr: ""
impacts: []
# The platforms this change altered, such as [android] or [android, ios]. A release test lists
# its Impact lines only on these. Required once the Impact list names a screen and the project
# keeps ledgers for more than one platform (SCHEMAS.md, change.md).
platforms: []
issues: []
features: ["[[FEAT-0026]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TASK-0144]]", "[[RISK-0004]]"]
---

# Use cockpit fills and attention flags in the overview

## Summary

Every overview ticket now carries the cockpit's type, fill and needs-you flag, computed from Deck's own index. The port includes per-type completion, waivers, stale manual verification and unresolved dependencies. The host refreshes when the verification day or snapshot threshold changes.

## Impact

- No screen changed: this task supplies the model and panel checks that the drawing lane consumes. TASK-0145 draws the new fields. A panel's text is exempt from words at rest, and every ticket in its rows must have a list twin.

## Documentation Coverage (All Types Considered)

- features: updated — FEAT-0026 records agreement to both contract proposals and the port.
- requirements: not-applicable — PHASE-0005 and DES-0005 already specify these marks.
- tasks: updated — TASK-0144 records the port and verification.
- issues: not-applicable — this is the requested feature revision.
- tests: updated — TST-0080, TST-0082 and TST-0083 describe parity, fixture fields and panels.
- workflows: not-applicable — the existing build and fixture command remain the entrypoints.
- decisions: not-applicable — both lanes agreed the existing contract amendments.
- risks: updated — RISK-0004 records the additional parity guard for mirrored rules.
- changes: new — this note.
- snapshot: updated — the sync derives status and membership from notes.

## Verification

The direct Python stats comparison reports zero mismatches on 356 Deck items and 2,706 Your Trainer items. The cockpit checkout is read without starting a server or writing bytecode. A missing checkout is an explicit skipped test; a present checkout whose Python fails is a test failure.

Changing the port's doing fill to open produced 100 Deck and 519 Your Trainer mismatches, each named. Removing the panel row twin check failed its regression. The original sources were restored after both checks.

The final `cd desktop && npm test` run passes 764 tests with zero failures and zero skips. The Deck fixture replays exactly from its recorded clean commit and timestamp. Your Trainer’s fixture remains `dirty: true`. TASK-0144 contains the full verification record.
