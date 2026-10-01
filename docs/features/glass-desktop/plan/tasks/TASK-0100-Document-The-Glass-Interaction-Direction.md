---
type: "[[task]]"
id: TASK-0100
title: "Document the Glass interaction direction"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin 2026-10-01: 'This sounds great update the documents to support this fully.'", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
parent: "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"
effort: medium
due: ""
depends: []
blocks: []
related: ["[[DES-0003-Collections-And-Documents-On-Glass]]", "[[FEAT-0022-Collections-And-Documents-Can-Be-Arranged-And-Restored]]", "[[FEAT-0023-A-Glass-Scene-Reopens-And-Crosses-Screens]]", "[[FEAT-0021-Project-To-Evidence-Levels-Guide-Deck]]"]
tests: []
verification_waiver: "Documentation-only task, verified by snapshot synchronization, docs-first, documentation validation and whitespace checks. Runtime implementation and acceptance remain pending under their own tasks."
waiver_expires: 2026-10-31
---

# Document the Glass interaction direction

## Request and interpretation

> [!quote] As requested — 2026-10-01 (user:edwin)
> This sounds great update the documents to support this fully.

The request endorses the preceding Glass comparison review. The result enables implementation against explicit interaction rules, dependencies and acceptance procedures. This task changes planning documents only. It does not claim implementation, benchmark completion or a passed usability walk.

The intake's five checks pass: Glass names the current surface; the review defines observable behaviors; scope is documentation; completion is checked through traceability and validation; existing identity, size, camera and authority constraints are reconciled or assigned to later work. Detailed design values remain proposals where the review called for an experiment.

## Definition of Done

- [x] The interaction design and core feature, requirements, tasks and acceptance walk cover opening, return, input, readable materials and exact collection access.
- [x] Collection forms and reversible arrangements have one planned feature with requirements, deliverable tasks and an acceptance walk.
- [x] Scenes and cross-screen polish have a later feature note, and structured evidence stays with the existing Parity feature and its source-contract dependency.
- [x] Existing continuity issues have an explicit implementation owner and prerequisite; earlier contracts and phase boundaries are reconciled.
- [x] Snapshot derivation, docs-first and documentation validation pass; the close-out records their evidence without claiming application tests ran.

## Steps

- [x] Update the planning artifacts and their relationships.
- [x] Review acceptance coverage and resolve contradictory live statements.
- [x] Run synchronization and documentation checks, then close this documentation task.

## Notes

TASK-0092 remains unfinished native benchmark work under FEAT-0019. Moving focus here does not close its eight open criteria. The endorsed Glass design continues in Electron while that separate experiment remains open.

## Close-out evidence — 2026-10-01

- Core coverage: [[DES-0003]] and its two labelled proposal plates; [[FEAT-0020]], [[REQ-0001]], [[REQ-0002]], TASK-0095–0099 and [[TST-0063]]. Loading and retry expose the identified document immediately without an animation or summary gate.
- Arrangements: [[FEAT-0022]], [[REQ-0003]], TASK-0101–0103 and [[TST-0064]]. Scope includes one exact collection in three forms, preview/apply/cancel, geometry undo and changed-source recovery.
- Later work: [[FEAT-0023]] records scenes and cross-screen return as backlog. [[FEAT-0021]] retains structured evidence and cockpit source-contract dependencies in PHASE-0004.
- Continuity: [[TASK-0104]] owns ISS-0070/71/72. FEAT-0017, its plan and [[TST-0052]] now agree on identity, chosen size, persisted per-view reading preference and movement. DES-0002, ADR-0006, phase notes, INDEX and the review references point to the current direction.
- Consistency review resolved immediate-reading versus fetch states, single-collection scope, reading-size precedence and ownership of multiple documents versus Compare arrangements. [[CHG-20261001-Glass-Interaction-Delivery-Plan]] records coverage across documentation types.
- `python3 tools/scripts/sync-snapshot.py` completed; `python3 tools/scripts/sync-snapshot.py --check`, `bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check -- docs SNAPSHOT.yaml` pass at close-out.

Validation warnings include existing acceptance, review, plan-status and design-gate debt. Linking the proposed DES-0003 to FEAT-0017, which is already in review, also warns: the new detailed repair design has no acceptance claim. This task's bounded documentation verification waiver is explicit. No runtime tests, performance results or acceptance verdicts were added.

The next implementation dependency is TASK-0104 before the core integration walk; FEAT-0022 follows FEAT-0020. Focus is cleared after this documentation task. TASK-0092 remains unfinished with its previous handoff intact.
