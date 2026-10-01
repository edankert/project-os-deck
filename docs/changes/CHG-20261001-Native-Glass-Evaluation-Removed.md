---
type: "[[change]]"
id: CHG-20261001-Native-Glass-Evaluation-Removed
title: "The native Rust Glass evaluation is removed"
status: merged
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin 2026-10-01: 'This is in the electron application, discard the rust solution also started in this project.'", "[[TASK-0105-Remove-The-Native-Glass-Evaluation-From-The-Tree]]"]
commit: ""
pr: ""
impacts: ["prototypes/native-glass/", "desktop/src/main/measure-fixture.ts", "desktop/src/renderer/fixture-trace.ts", "desktop/src/main/main.ts", "desktop/src/renderer/glass.ts", "desktop/src/renderer/renderer.ts", "desktop/package.json", ".gitignore"]
issues: []
features: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[CHG-20260929-Native-Glass-evaluation-prototype]]", "[[RISK-0005-A-Native-Prototype-Wins-By-Doing-Less-Work]]", "[[RISK-0006-Native-Rendering-Leaves-Decks-Reader-And-Tablet-Behind]]", "[[PHASE-0002-Glass]]"]
---

# The native Rust Glass evaluation is removed

## Summary

The Rust renderer experiment is out of the repository and its feature is cancelled. Edwin dropped it on 2026-10-01; Glass is delivered in the existing Electron application. Nobody using Deck sees a difference, because the experiment was never part of the application a person runs.

## Impact

- No screen changed: the prototype was a separate executable, and the code removed from `desktop/` was a measurement entry point that ran only when started with `--measure-fixture`.

Three things a developer would notice:

- `prototypes/native-glass/` is gone from the working tree. It had never been committed, so it was moved to the macOS Trash as `project-os-deck-prototypes-native-glass-2026-10-01` instead of being deleted. It can be put back until the Trash is emptied. That folder also holds the generated fixtures and raw runs that `.gitignore` kept out of the repository.
- `npm run measure:fixture` and `electron . --measure-fixture` no longer exist. They replayed fixtures and traces that only the prototype's tools produced. The removed files are in commit `becb1e7`.
- `npm run measure` is unchanged. `measureTurn` keeps its optional per-frame record, which the Glass desktop walk uses to report stalls.

## Documentation Coverage (All Types Considered)

- features: updated. FEAT-0019 is `cancelled` with the reason and Edwin's words.
- requirements: not-applicable. FEAT-0019 had none.
- tasks: updated and new. TASK-0086 to TASK-0094 are `cancelled`. Two of them, TASK-0087 and TASK-0089, had been finished; what they built is gone and their tests are retired. TASK-0105 is new and records the removal.
- issues: not-applicable.
- tests: updated. TST-0058, TST-0060, TST-0061 and TST-0062 are `retired`, because the prototype they exercised is gone. TST-0059 was never run and rests at `ready` with a note saying it is withdrawn.
- workflows: not-applicable. No documented workflow named the removed commands.
- decisions: not-applicable. No decision record proposed a native renderer; ADR-0006 already says it does not authorize a renderer migration.
- risks: updated. RISK-0005 and RISK-0006 are `closed`: their cause was removed, not mitigated.
- changes: new, this note. CHG-20260929 points here.
- snapshot: updated. Focus note and derived statuses.

## Follow-ups

- [ ] Empty the Trash when the prototype is no longer wanted. It is about 12 GB, most of it build output and generated fixtures.
