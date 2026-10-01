---
type: "[[task]]"
id: "TASK-0086"
title: "Define the experiment, freeze the benchmark protocol and capture the current Deck baseline"
status: "cancelled"
phase: "[[PHASE-0002-Glass]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
parent: "[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"
effort: "M"
due: ""
depends: []
blocks: ["[[TASK-0087-Export-Representative-Workspaces-For-Both-Renderers]]", "[[TASK-0088-Boot-An-Isolated-Native-Glass-Executable]]", "[[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]]"]
related: ["[[RISK-0005-A-Native-Prototype-Wins-By-Doing-Less-Work]]", "[[TST-0059-The-Native-Glass-Evaluation-Is-Reproducible]]"]
tests: []
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-10-01"
---

# Define the experiment before comparing implementations

## Outcome and ownership

Freeze the experience and measurement contract, then capture how the current Deck behaves on Edwin's Mac Studio. This task owns benchmark documentation, the machine record and baseline evidence. Any temporary measurement adapter must observe the real current renderer.

The current Mac Studio is the sole required acceptance machine. Record its actual specifications; do not infer performance on newer machines from its age. A laptop is not a dependency of this evaluation.

## Definition of Done

- [ ] The [benchmark specification](../BENCHMARK.md) states the workloads, timing methods, numerical targets, run validity rules and decision rules before scored native results exist.
- [ ] A constraints matrix distinguishes population caps and representation-dependent interaction from intentional priority and readability choices.
- [ ] The hardware record identifies model, chip, memory, OS, display resolution, refresh rate, scale, graphics backend and application versions.
- [ ] A current Deck baseline records real note and view counts, visible and placed counts, frame timings, memory, loading and input measurements with limitations.
- [ ] Raw evidence identifies commit, machine, fixture or workspace revision, window dimensions, focus state, warmup and repetition. No average-only performance verdict is issued.
- [ ] Baseline documentation states which comparisons must be repeated after TASK-0087 supplies shared fixtures.
- [ ] The protocol predeclares active, idle and scheduled recovery segments using BENCHMARK.md’s metric applicability table. Active stalls stay in the samples; idle redraw and recovery have their own checks.

## Steps

1. Read the feature's scope, PLAN and BENCHMARK. Record the experience to test without adopting a native migration.
2. Inspect available local workspaces read-only and identify the largest usable real dataset by observed count. Record its revision and content hashes without publishing private note bodies.
3. Record the Mac Studio configuration and a fixed foreground window/display setup. Follow the benchmark's scheduling and warmup rules.
4. Run the current Deck through the benchmark interaction sequence using its real renderer and real event path. Save timing records and screenshots of equivalent views.
5. Mark instrument limitations explicitly. A submitted graphics frame or application response is not automatically a physically displayed frame.
6. Freeze the protocol revision. Record any later amendment with its reason and rerun both implementations when the amendment changes comparability.

## Verification and stop conditions

Author and link the task-specific executable or manual test notes when their commands or procedure exist, before closing this task. The acceptance walk and final evidence audit are feature-level context; later tasks’ reports are not prerequisites for this task’s own verification.

The evidence audit is [[TST-0059-The-Native-Glass-Evaluation-Is-Reproducible]]. Check that raw records reconcile with the summary and that a missing machine identity or lost foreground state makes a run invalid. Use inspection of the actual baseline recording, not a source-text assertion.

Stop scored comparisons if the workload or metric definition is still changing. Missing access to a workspace is missing evidence; do not replace it silently with a small synthetic set. The provisional baseline can use today's runtime input, but TASK-0092 must rerun the comparison against the exported frozen fixtures.

## Notes

The provisional production-renderer baseline is recorded in [BASELINE.md](../BASELINE.md), with the raw local measurement path and its limits. Deck's focused five-second Issues turns were about 17.5 ms p95 on each workspace; this is a 60 Hz scheduling observation of a capped view, not a native-versus-web verdict. A shared-fixture, repeated scored baseline with p99, input, load and memory is still required before this task can close. [[RISK-0005-A-Native-Prototype-Wins-By-Doing-Less-Work]] owns the comparison hazard.

## Cancelled, 2026-10-01

Not finished and not going to be: Edwin dropped the native Rust evaluation on 2026-10-01 ([[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]], "Cancelled"). The unticked boxes above stay unticked. The text is kept as the record of what was done; the `prototypes/native-glass/` paths it names were removed by [[TASK-0105-Remove-The-Native-Glass-Evaluation-From-The-Tree]].
