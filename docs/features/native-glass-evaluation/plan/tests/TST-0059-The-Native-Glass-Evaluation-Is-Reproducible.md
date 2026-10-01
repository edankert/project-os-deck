---
type: "[[test]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
scope: "feature"
entrypoint: ""
last_verified: ""
covers: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
issues: []
artifacts: []
adequacy: "The audit procedure is defined but has not been run on a complete measurement bundle. Invalid native runs and missing-sample harness tests exercise rejection paths."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: []
id: "TST-0059"
title: "The native Glass evaluation is reproducible"
status: "ready"
level: "system"
tasks: ["[[TASK-0086-Define-The-Native-Glass-Experiment-And-Baseline]]", "[[TASK-0088-Boot-An-Isolated-Native-Glass-Executable]]", "[[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]]", "[[TASK-0093-Decide-What-The-Native-Glass-Evidence-Supports]]"]
evidence: []
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-10-01"
---

# The native Glass evaluation is reproducible

## Purpose

Audit whether the final comparison supports its conclusion, including an honest negative result. The audit checks the complete evidence bundle; it does not mark slow performance as acceptable by changing the targets afterwards.

## Procedure

1. Read [BENCHMARK.md](../BENCHMARK.md) and identify the frozen protocol revision and all later amendments.
2. Obtain TASK-0092's evidence bundle using the reproduction instructions it creates. Confirm that source build, dependency lockfile, fixture manifests and hashes are available.
3. Match each run to the Mac Studio's recorded configuration, display/window settings, backend, focus state, protocol and input trace.
4. Reconcile fixture records with selected, rejected, placed, visible and interactable populations. Check that any current-renderer cap is disclosed separately from native complete placement.
5. Compare screenshots and fixture data for matched runs. Verify that text, card properties, reader content, interaction and view state are equivalent or that every difference is reported.
6. Recompute a representative result from raw samples with the recorded analysis version. Confirm the reported percentile, stall, memory and input values use the benchmark's definitions.
7. Inspect invalid and stopped runs. Verify deliberate missing-sample and unexpected foreground-loss checks reject runs without erasing their failure records. Check BENCHMARK.md’s applicability table: idle and scheduled minimize/restore use their own metrics, every active-segment stall remains scored, and exclusions identify predeclared segment boundaries. Confirm legitimate recovery is tested separately rather than rejected as accidental focus loss.
8. Follow the documented reproduction instructions for one matched current/native pair and one uncapped native run on the Mac Studio. Compare the resulting variation with the published repetitions.
9. Check cold/warm cases, large generated cases and every required benchmark scenario against the coverage table. Identify any missing measurement rather than assigning it a passing value.
10. Read the acceptance evidence from [[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]] and the focused executable checks. A correctness failure invalidates the corresponding speed claim.
11. Read TASK-0093's report and trace each architecture or removable-constraint claim to evidence. Confirm reader, accessibility, browser/tablet and dependency limitations remain visible. If the recommendation relies on shared browser reuse, inspect its actual target-browser/device feasibility evidence or confirm that the recommendation explicitly remains conditional.
12. Record pass/fail, auditor, date, reproduction output, deviations and unresolved evidence gaps. Request the owner's review of the recommendation when the report is ready.

## Expected results

- The exact comparison can be reproduced with identified inputs on the designated Mac Studio. No laptop or newer-machine performance is inferred.
- Required runs, failures and invalid-run records exist. Summaries reconcile with raw evidence and follow the frozen protocol.
- Native complete placement is verified separately from matched-work comparisons. Required text and reader work are present in timed runs.
- Application acknowledgments, graphics submission and visible response are named accurately. Unsupported physical-latency measurements are not replaced by mislabeled software timestamps.
- Every target has a supported achieved/missed verdict, or is explicitly missing. Required missing evidence prevents completion of TASK-0092.
- A complete experiment that misses a performance target can pass this evidence audit. It must report that missed target and use it in the architecture recommendation.
- The report does not silently adopt a migration, amend a production decision or change phase boundaries.

## Evidence

Not run. The native executable, fixture exporter, matrix printer, `tools/run.mjs` runner and `tools/summarize-run.mjs` analysis command now exist under `prototypes/native-glass/`. [EVIDENCE.md](../EVIDENCE.md) records preliminary diagnostic and invalid run paths, plus captures exposing the visible-work mismatch. `node --test prototypes/native-glass/tools/test-summarize.mjs` rejects incomplete frames, missing samples, unexpected focus loss and a run on the wrong physical monitor. The full scored matrix, semantically matched current/native pair, complete acceptance walk and TASK-0093 decision report remain missing, so this audit cannot yet receive a verdict. `artifacts` stays empty until a complete bundle is audited.

## Adequacy

The audit must fail a bundle with missing fixture hashes, silently dropped records, unequal visible content, lost foreground samples or a conclusion unsupported by its results. TASK-0092 records rejection evidence for deliberate invalid runs. Manual reproduction guards against a summary that merely repeats its own recorded claims.

## Withdrawn, 2026-10-01

This audit was never run and never will be. Edwin dropped the native Rust evaluation on 2026-10-01 and [[TASK-0105-Remove-The-Native-Glass-Evaluation-From-The-Tree]] removed the prototype and the measurement bundle it would have audited.

The note rests at `ready`, not `retired`, for one reason: the validator rejects a retired manual test that has no `last_verified:` date, and this test has no run to date. `ready` is the status for a test that has never been executed, which is the truth here.
