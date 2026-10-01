---
type: "[[change]]"
id: CHG-20261001-Glass-Interaction-Delivery-Plan
title: "Document the endorsed Glass interaction direction and delivery sequence"
status: merged
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin: This sounds great update the documents to support this fully.", "[[TASK-0100]]", "[[REFERENCE-GLASS-INTERACTION-COMPARABLES-REVIEW]]"]
commit: ""
pr: ""
impacts: []
issues: ["[[ISS-0070]]", "[[ISS-0071]]", "[[ISS-0072]]"]
features: ["[[FEAT-0017]]", "[[FEAT-0020]]", "[[FEAT-0021]]", "[[FEAT-0022]]", "[[FEAT-0023]]"]
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[DES-0003]]", "[[ADR-0006]]", "[[RISK-0007]]"]
---

# Glass has an interaction specification and delivery plan

## Summary

The endorsed review now has a concrete visual specification, amended collection/document requirements, implementation tasks and walkable acceptance procedures. The plan adds reversible arrangements and records later scenes and structured evidence in their own feature notes. ADR-0006 records the user's endorsement of on-desk placement; DES-0003's detailed pictures and calibration remain proposed.

The current focus feature and walk now reflect the previously chosen removal of duplicates and ghosts, chosen reading size and neighbourhood movement. TASK-0104 owns the coupled repairs. The three issues remain open and no product capability is marked implemented by this documentation change.

## Impact

- No screen changed: this update authors planning contracts and visual design plates only. Runtime implementation, application tests and acceptance verdicts are unchanged.

## Documentation Coverage (All Types Considered)

- features: updated FEAT-0017, FEAT-0020 and FEAT-0021; new planned FEAT-0022 and backlog FEAT-0023.
- requirements: updated REQ-0001/0002 and new REQ-0003; detailed criteria remain draft and unchecked.
- tasks: updated TASK-0095–0099; new documentation TASK-0100, arrangements TASK-0101–0103 and continuity TASK-0104.
- issues: updated ISS-0070/71/72 with the repair owner and acceptance link; no false resolution. ISS-0086's placement decision remains separate.
- tests: updated TST-0052 and TST-0063; new TST-0064. Acceptance checks remain active with no new verdict.
- workflows: not-applicable; no new command or operational entrypoint.
- decisions: updated ADR-0006 to accepted option 3 with the user's words and bounded consequences.
- risks: new RISK-0007 for saved-state migration, live membership and duplicate identity during restoration.
- changes: new this note, recording planning-contract changes only.
- snapshot: updated curated membership/focus and derived statuses, relationships, counters and metrics through synchronization.

## Design and phase coverage

DES-0003 includes two labelled visual plates, state/input rules, failure cases, delivery ownership and calibration limits. DES-0002 points to the newer interaction specification. PHASE-0002, PHASE-0004, PHASES and INDEX expose the delivery sequence. The research references link forward to the current planning notes.

## Verification

Documentation validation and snapshot synchronization are recorded in TASK-0100. No application test or usability walk was run for this documentation-only change.

## Follow-ups

Implement TASK-0104 before the core collection/document final walk. Deliver FEAT-0020 before FEAT-0022. Expand FEAT-0023 through feature scaffold before choosing its persistence schema; adopt structured evidence through FEAT-0021 after cockpit contracts are decided. TASK-0092's native benchmark remains unfinished and independent.
