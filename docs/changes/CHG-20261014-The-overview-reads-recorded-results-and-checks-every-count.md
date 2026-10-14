---
type: "[[change]]"
id: CHG-20261014-The-overview-reads-recorded-results-and-checks-every-count
title: "The overview reads recorded results and checks every count"
status: merged
owner: system:codex
created: 2026-10-14
updated: 2026-10-14
source: ["Edwin's 2026-10-14 review-fix request"]
commit: "5ca1405, 4abe421, 306e7bf, a1d8876"
pr: ""
impacts: []
platforms: [app]
issues: []
features: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
related: ["[[TASK-0140-Fix-The-Overview-Review-Findings]]"]
---

# The overview reads recorded results and checks every count

## Summary

The review fixes give the overview acceptance states from recorded platform results. They also require one mark per count, validate screen addresses and id text, preserve local heading links, and record fixture provenance. The rebuilt fixtures put Parity before Vault and restore owed-again marks on Your Trainer’s shelf.

## Impact

- No screen changed: this task repairs the shared model and checks. The drawing lane's scenes stay unchanged; they receive corrected states and phase ordering. No overview surface note or acceptance check exists yet.

## Documentation Coverage (All Types Considered)

- features: updated
- requirements: not-applicable
- tasks: new
- issues: not-applicable
- tests: updated
- workflows: not-applicable
- decisions: not-applicable
- risks: not-applicable
- changes: new
- snapshot: updated

## Verification

2026-10-14: `cd desktop && npm test` passed 704 tests, with no failures or skips. Documentation validation, the docs-first check and `git diff --check` passed. The source-note flag is false for the captured Deck commit and true for Your Trainer. The detailed state counts and comparison with DES-0004 are in FEAT-0026.

## Changed files

- `SNAPSHOT.yaml`
- `desktop/fixtures/overview/deck.json`
- `desktop/fixtures/overview/ledger/WORKING-app.json`
- `desktop/fixtures/overview/your-trainer.json`
- `desktop/scripts/overview.mjs`
- `desktop/src/main/overview-ledger.ts`
- `desktop/src/main/overview-service.ts`
- `desktop/src/shared/overview-checks.ts`
- `desktop/src/shared/overview-model.ts`
- `desktop/src/shared/overview-types.ts`
- `desktop/tests/overview-checks.test.mjs`
- `desktop/tests/overview-fixtures.test.mjs`
- `desktop/tests/overview-model.test.mjs`
- `desktop/tests/overview-route.test.mjs`
- `docs/changes/CHG-20261014-The-overview-reads-recorded-results-and-checks-every-count.md`
- `docs/features/overview-model/FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place.md`
- `docs/features/overview-model/plan/PLAN.md`
- `docs/features/overview-model/plan/tasks/TASK-0140-Fix-The-Overview-Review-Findings.md`
- `docs/features/overview-model/plan/tests/TST-0080-The-Overview-Classifies-And-Places-Every-Ticket.md`
- `docs/features/overview-model/plan/tests/TST-0081-The-Overview-Route-Is-Read-Only-And-Cached.md`
- `docs/features/overview-model/plan/tests/TST-0082-Both-Fixtures-Keep-Every-Ticket-And-Its-Counts.md`
- `docs/features/overview-model/plan/tests/TST-0083-Screen-Checks-Refuse-Text-And-Missing-Marks.md`
- `docs/phases/PHASE-0005-Overview.md`

## Follow-ups

Claude runs the second review. Edwin owns acceptance. No new risk-scan trigger applies.
