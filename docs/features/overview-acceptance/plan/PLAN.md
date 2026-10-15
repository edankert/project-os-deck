---
type: "[[plan]]"
title: "Plan for FEAT-0029: Designs, acceptance tests and tickets are accepted from a picture of their evidence"
status: active
owner: system:codex
created: 2026-10-14
updated: 2026-10-15
source: ["[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
implements: ["[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
related: ["[[PHASE-0005-Overview]]", "[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]"]
---

# Plan for FEAT-0029

The original four tasks separate the shared pictures and evidence, image delivery, person-triggered writes, and the review handoff. TASK-0143 repairs the eight findings from round one.

2026-10-15: the cockpit-mark revision is implemented on `lane/codex-r2`, with 764 passing desktop tests. The feature’s Where this stands section records the current handoff to Claude. Earlier delivery and review steps below remain the original plan.

## Delivery sequence

1. [[TASK-0120-Draw-The-Acceptance-Flows-From-Recorded-Evidence]]: pure flow types, mappers, S5 to S7 scenes, the small S3 gate, six real fixtures and bounded images. TST-0085 checks their evidence and scene rules.
2. [[TASK-0121-Serve-Only-Images-Under-The-Workspaces-Docs]]: the GET/HEAD-only docs image route, with traversal and type refusals in TST-0086.
3. [[TASK-0122-Send-A-Persons-Flow-Actions-Through-The-Shell]]: flow registrations, reasons, host/preload/main verbs and exact sidecar refusals in TST-0087.
4. [[TASK-0123-Verify-The-Flows-And-Hand-Them-To-Edwin]]: the full node suite, adoption scope, risk and change notes, task evidence and commits. TST-0088, TST-0089 and TST-0100 are the three human walks.

## Dependencies

- FEAT-0026’s model, route, screen contract and checks are present. The drawing lane’s S1 to S4 and overview renderer are present.
- The run brief permits Codex to build before Gate B. DES-0005 is currently proposed; the drawing lane proposes it and Edwin alone decides it.
- Read-only source inspection and fixture capture may use `../your-trainer` and `../project-os-cockpit`. No action in this run writes either repository.
- The sidecar owns feature transition availability, acceptance-run semantics and person-only guards. Read the actual payload before choosing its request body; unsupported writes must remain refusals.

## Boundaries and verification

`npm test` from `desktop/` and the documentation gates must pass. No Electron, smoke run or other window-opening command runs. The host carries no write. The feature stops at review with no claim of Edwin’s acceptance or an agent-refusal result that was not observed.

## Open questions

The new implementation is complete and FEAT-0029 stays doing for Claude’s review of this revision. TASK-0143 repairs round one and refreshes the design plates. Claude reviews round two and merges the commits. Edwin runs TST-0088, TST-0089 and TST-0100. The plan stays active until that feature closes.

The sidecar limits in the feature and RISK-0009 remain external constraints. The feature's dated question names the drawing-lane integration seam and the actual Your Trainer fixture status.
