---
type: "[[task]]"
id: "TASK-0093"
title: "Report what the evidence supports and define the next architecture decision"
status: "backlog"
phase: "[[PHASE-0002-Glass]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
parent: "[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"
effort: "M"
due: ""
depends: ["[[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]]"]
blocks: []
related: ["[[RISK-0006-Native-Rendering-Leaves-Decks-Reader-And-Tablet-Behind]]"]
tests: ["[[TST-0059-The-Native-Glass-Evaluation-Is-Reproducible]]"]
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-09-28"
---

# Decide which design constraints the evidence lets Deck remove

## Outcome and ownership

Write an architecture recommendation supported by the completed evaluation. This task owns the decision report, migration inventory, cost/risk assessment and any proposed ADR justified by the results.

## Definition of Done

- [ ] A report in this feature's proposed `plan/EVALUATION.md` links the completed evidence, methods, limitations and target verdicts.
- [ ] Each tested design constraint is classified as removable with evidence, still necessary, a readability/product choice, or unresolved.
- [ ] The recommendation compares native migration, a Rust/web hybrid and improvements to the current renderer. It does not attribute all architecture gains to Rust alone.
- [ ] The report covers reader fidelity, text selection, accessibility, indexing, view evaluation, sidecar/write boundaries, multiwindow behavior, persistence, packaging and browser/tablet delivery.
- [ ] Remaining work is estimated by subsystem with uncertainty ranges and dependencies. Prototype effort and complete-application effort are distinguished.
- [ ] A positive recommendation identifies the decisions and parity gates a separately scoped Native Deck phase would need. No migration phase or accepted ADR is created by implication.
- [ ] A negative performance result is retained as a valid experiment outcome. Missing required evidence leaves measurement work incomplete.
- [ ] Feature close-out has its required independent review and documentation checks, with implementation and review statuses reflecting actual evidence.

## Steps

1. Complete TASK-0092. Read raw-result summaries and the evidence audit before writing the recommendation.
2. Fill a decision matrix for complete placement, reachability, stable position, realistic detail, input response and resource costs. Cite the relevant run or correctness evidence for each judgment.
3. Separate results of native rendering from results of batching, caching and visibility selection that may also apply to the current renderer.
4. Assess the browser route by inspecting the actual selected dependencies. If the recommendation relies on a shared Rust renderer for tablet delivery, build and exercise the minimal WebAssembly slice required by BENCHMARK.md on the target browser/device. This conditional proof includes representative text, input and a read-only fixture. If it cannot be run, mark reuse unproven and keep the recommendation conditional or retain a separate browser renderer. Do not infer parity from wgpu support alone; production tablet delivery remains future migration work.
5. Inventory the omitted application subsystems and preservation of existing read/write contracts. Record likely sequencing, reusable prototype components and likely throwaway code.
6. Write the recommendation and its rejection conditions. If adoption is justified, draft an ADR at proposed status through the ADR playbook and put the migration phase scope in that proposal.
7. Complete the feature's review and close-out only when its stated evaluation evidence exists. Keep the owner's architecture decision distinct from the agent's recommendation.

## Verification and stop conditions

Use [[TST-0059-The-Native-Glass-Evaluation-Is-Reproducible]] to trace every quantitative claim back to evidence. Independent review must challenge workload equivalence, missing reader/platform costs and claims that a Mac Studio result proves other machines.

Do not recommend an unconditional migration from an empty-window or rectangle benchmark. Do not close the feature with required runs missing. Do not amend the existing production capacity decision, default surface or phase ordering as part of writing a recommendation. Adoption requires the later explicit decision described in the feature.

## Notes

Depends on [[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]]. Risks [[RISK-0005-A-Native-Prototype-Wins-By-Doing-Less-Work]] and [[RISK-0006-Native-Rendering-Leaves-Decks-Reader-And-Tablet-Behind]] remain open until their evidence and remaining exposure are assessed.
