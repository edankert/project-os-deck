---
type: "[[risk]]"
id: "RISK-0005"
title: "A native prototype wins by doing less work"
status: "closed"
phase: "[[PHASE-0002-Glass]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
likelihood: "high"
impact: "high"
mitigation: ["[[TASK-0086-Define-The-Native-Glass-Experiment-And-Baseline]]", "[[TASK-0087-Export-Representative-Workspaces-For-Both-Renderers]]", "[[TASK-0090-Draw-Readable-Cards-With-A-Native-Renderer]]", "[[TASK-0091-Exercise-Native-Glass-With-Real-Input-And-A-Reader]]", "[[TASK-0094-Match-Decks-Visible-Glass-Work-In-A-Native-Compatibility-Mode]]", "[[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]]", "[[TASK-0093-Decide-What-The-Native-Glass-Evidence-Supports]]"]
related: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]", "[[TST-0059-The-Native-Glass-Evaluation-Is-Reproducible]]"]
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-10-01"
---

# A native prototype wins by doing less work

## Description

A fast native field can give a misleading answer if it omits content, interaction or notes that the current Deck handles. Unequal fixtures, smaller windows, warm caches or background timing can also create a false advantage. The user wants evidence that design limits can be removed, so an unfair comparison can lead to an expensive migration that does not deliver that experience.

## Mitigation

- [[TASK-0086-Define-The-Native-Glass-Experiment-And-Baseline]] freezes methods and targets before results, records the actual Mac Studio and distinguishes design choices from implementation constraints.
- [[TASK-0087-Export-Representative-Workspaces-For-Both-Renderers]] supplies versioned, counted fixtures with realistic text and complete input reconciliation.
- [[TASK-0090-Draw-Readable-Cards-With-A-Native-Renderer]] and [[TASK-0091-Exercise-Native-Glass-With-Real-Input-And-A-Reader]] require readable card content, real input and a representative reader before scored runs.
- [[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]] separates matched-work comparisons from uncapped native runs and preserves failed/invalid runs.
- The explicit `desktop` `measure:fixture` command injects exported card data into the actual production `GlassField` and checks its reported band counts against the adapter's census. This new measurement configuration writes to an explicit output path and does not run on normal launch. Its five-second turn is diagnostic until the semantic trace, visible content and focus audit match the native run.
- Real exports and frozen note-tree copies stay under ignored `prototypes/native-glass/local/`. The matrix and both runners compare their source-tree and fixture hashes before measurement so concurrent edits to the live workspace cannot silently change a later run. The frozen copy contains private note content and must remain local.
- The native runner pins and verifies the 3440 × 1440 benchmark display. Earlier diagnostics that landed on a second monitor remain labelled exploratory. Side-by-side captures of the real fixture show that the native planar layout and production depth layout display materially different populations and detail, so they cannot support a direct speed claim.
- Edwin chose a visual-parity mode before direct comparison. [[TASK-0094-Match-Decks-Visible-Glass-Work-In-A-Native-Compatibility-Mode]] must verify production and native visible identities, geometry, content, reader/chrome composition and delivered input at fixed checkpoints. Until it passes, the existing placed-subset diagnostics remain non-comparable.
- [[TASK-0093-Decide-What-The-Native-Glass-Evidence-Supports]] distinguishes evidence for native rendering from improvements that could also apply to the current renderer.

## Triggers

- The native scene shows fewer selected records, shorter text, less detail, fewer effects or no reader during comparison.
- Only averages, empty-window timing or graphics submission time support a smoothness claim.
- Protocol targets or workloads change after seeing a result without rerunning both implementations.
- Missing hardware or larger-workspace evidence is replaced by an inferred result.
- A dataset contains many notes but locate cannot reach them, or placement counts omit rejected records.
- The production fixture adapter's input is replaced by a later application update, or its rotating turn is compared directly with the native planar motion despite different visible work.

## Response and closure evidence

Stop scored comparison on any trigger and record the mismatch. Repair workload equivalence or label the runs as different experiments. Resolve this risk only after [[TST-0059-The-Native-Glass-Evaluation-Is-Reproducible]] verifies the complete bundle and the decision report discloses remaining limits. A negative result can resolve the evidence risk when it is complete and honestly reported.

## Closed, 2026-10-01

No comparison between a native prototype and Deck will be scored, so no result can be won by doing less work. Edwin dropped the native Rust evaluation on 2026-10-01 ([[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]], "Cancelled"). The risk was not mitigated; its cause was removed. A later proposal to change renderer starts a new risk scan.
