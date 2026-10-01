---
type: "[[reference]]"
id: "REF-NATIVE-GLASS-BENCHMARK"
title: "Native Glass benchmark protocol"
status: "active"
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-09-30"
scope: "FEAT-0019 evaluation only; frozen revision 3 protocol, not a measured result"
source: ["Edwin 2026-09-28: The current mac studio would be fine."]
related: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
---

# Native Glass benchmark protocol

## Purpose and status

This protocol tests whether complete placement and realistic interaction fit the current Mac Studio's performance budget. It separates the experiment's successful completion from a positive performance result. TASK-0086 froze revision 1 before implementation results were scored. Later changes need a written reason, a new protocol revision and reruns of affected comparisons; targets never move to make an existing result pass.

Protocol revision 1 was frozen on 2026-09-28, before any native result. A provisional current-Deck run is documented in [BASELINE.md](BASELINE.md); it does not meet this protocol's scored-run requirements. [EVIDENCE.md](EVIDENCE.md) records preliminary native runs, including one complete older-build repetition and several focus-invalidated attempts. None completes the required matrix. Changes to the scored workload or targets follow the revision and rerun rule above.

Protocol revision 2 was frozen on 2026-09-30 before any direct matched-work score. Edwin chose to keep Deck's existing reader navigation: activating its local body link leaves Glass, while the native prototype opens that note in its reader. The revision removes link activation and return from the **matched** 60-second reader trace. Both applications must still open the same long note, show its local link at the opening checkpoint, scroll the reader and move the field for the full interval. The native uncapped reader trace retains its link-follow and return actions as a separate absolute capability workload; its totals must not be compared as identical work with the matched trace. Existing revision 1 reader diagnostics retain their hashes and labels and cannot be merged into revision 2 results. Other scenarios, numerical targets, warmups, repetition counts, validity rules and the visual-parity gate are unchanged. The new matched reader trace, configuration and matrix hashes are recorded in [EVIDENCE.md](EVIDENCE.md).

Protocol revision 3 replaces only the generated matched reader source. Revision 2 selected `generated|notes/N-00070.md`, but a native hit test could not open its covered outer-band card after locate. A short Deck diagnostic opened `generated|notes/N-00017.md` and showed its `N-00018` body link; a native command-route replay also opened that card and scrolled its reader. The two checkpoint bodies and visible links match by source-state tests. The revision 3 generated reader trace names N-00017 for the same 60-second no-follow sequence. The real reader trace, all other scenarios, fixtures, numerical targets, warmup, repetitions, validity rules and visual-parity gate remain unchanged. Revision 2 results cannot be pooled with revision 3 results; any direct comparison must rerun both applications with the revision 3 trace and pass TASK-0094's foreground and OS-delivery gate first. The trace, configuration and matrix hashes are recorded in [EVIDENCE.md](EVIDENCE.md).

Revision 3 is frozen but currently **ineligible for scoring**. Its reader trace schedules `locate`, `open` and `scroll_reader` together at time zero, before Deck's visible pane can open. An adapter defect previously sent scroll to a hidden reader element; after correcting the adapter, the same short trace reports an explicit missing-visible-pane action error. The continuous named commands and the two applications' different internal pan routes also lack one shared OS-delivered event plan. TASK-0094's short paired OS probes demonstrate only click, reader wheel, horizontal field wheel and zoom key delivery. Before any direct score, write and freeze a new protocol revision with a faithful full-duration OS plan, an opened-pane scroll schedule, both-fixture parity checkpoints and retained invalid-run reasons; rerun all affected work under that revision. Do not reinterpret revision 3's completed internal action count as delivered reader work.

## Performance-driven constraints under test

| Current Glass choice | Why it exists | Native experiment's test |
|---|---|---|
| Capacity in each band, with a remainder count | Bounds the number of cards or tiles the renderer handles | Allocate and locate every selected note, including active work beyond the outer field and finished work beyond the quiet band. |
| Canvas tile or DOM card chosen by apparent size | Limits rich elements and decides how a person interacts with a distant note | Keep one note identity and hit-testing route at every detail level; render detail only when readable. |
| `CardPool` in Spread and a note-to-element map in Glass | Avoids or limits document element churn | Cache and reuse native graphics and text resources; report allocations per frame and over endurance. |
| Depth expresses priority, and distant text has less detail | Helps a person distinguish owed, active and finished work | Preserve these meanings while removing the population limit; changing them is outside this performance experiment. |

## Hardware and build record

Edwin selected the current Mac Studio as the required acceptance machine. Record the actual model, chip, GPU, RAM, macOS, display model, physical resolution, scale factor and refresh rate. Machine age is not a performance specification. Other computers and tablets are migration questions, not inferred passes.

Use a foreground 1440 by 900 logical-pixel window at the same display scale, on the same display, for both implementations. Target a 60 Hz presentation cadence. If the display cannot run at 60 Hz, record its cadence and use the same verified pacing in both applications; keep raw intervals and explain any normalization. Do not describe a high-refresh run paced differently from its comparator as equivalent.

Record source commit, dirty diff hash if any, build mode, binary hash, toolchain, dependency lock hash, Electron/Chromium version or Rust/wgpu/backend versions, GPU adapter, font files and font hashes. Use release-optimized Rust and the current normal compiled Deck build. Disable developer overlays and debugging CPU throttles during scored runs. A throttled result is supplementary, never a substitute for real hardware.

Close unrelated heavy work, record power/display settings, and wait for a steady thermal state. Do not benchmark both applications concurrently. Counterbalance order across repeats so the native build is not always tested with a warmer machine. Preserve failures and exceptions with reasons.

## Data and fixture contract

TASK-0087 produces a versioned, renderer-neutral fixture format. Its manifest holds `schema_version`, fixture ID, source revision, export time, content hash, view ID, expected selected count, link count, generator seed/version where applicable, body bytes and distribution summaries. Machine-specific source roots stay in local metadata, not portable identity.

Each record holds a stable workspace key and relative-path key, displayed note ID, title, type/status, subtitle, card properties, progress/owed data, resolved group and priority band, Markdown body and local outgoing link keys. Preserve incoming links by deriving them from the same edges. Capture resolved view membership before capacity-based placement; do not export only the current cards on screen. Keep existing view descriptions as provenance; the Rust program does not implement a second query evaluator.

The exporter is read-only and writes outside the source workspace. Reconcile selected, exported, rejected and duplicate counts with IDs/paths for every discrepancy. Reject an unsupported schema explicitly. A malformed fixture fails loading with an explanation; dropping invalid records and reporting a successful complete run is forbidden. Missing optional properties get explicit defaults. Duplicate displayed IDs remain separate files. Every selected note has its body available when opened.

| Fixture | Purpose | Required result |
|---|---|---|
| Small committed synthetic corpus, about 200 notes | Deterministic functional runs and the acceptance walk without private repositories | Placement and interaction checks pass. |
| Current Deck, cockpit and largest available real workspace exports | Real distributions, long titles, properties, links and reader bodies; Issues and Features views plus an all-notes view | Current counts are recorded; the largest real all-notes view is a performance gate. Smaller views diagnose behavior. |
| 10,000 generated notes | Required headroom beyond the real corpus | Complete placement and all target scenarios meet the candidate targets. |
| 50,000 generated notes | Explore where costs or usability fail | Report timings, resource use and failure boundary; no positive performance verdict required. |

The largest workspace is selected by the actual exported all-notes count, not the historical 2,734-note figure. If a sibling workspace is unavailable, report the exact missing path and do not silently replace it with this repository. Generated fixtures cover the measured title/body length distribution, long outliers, distinct properties and statuses, sparse and dense neighbourhoods, unlinked notes and multilingual text. Do not clone one short title or replace bodies with empty strings. Use fixed seeds and record them.

Commit synthetic data, seeds and a small deterministic trace. Keep real exports and raw runs under proposed `prototypes/native-glass/local/`, ignored by Git. Summaries contain counts, hashes and relative artifact references so evidence can be located without committing personal note contents.

## Comparison design

There are two comparisons, and their conclusions must stay separate.

**Matched work.** Feed both implementations the same resolved fixture, window, fonts/content density and input trace through an isolated measurement adapter. Record current Deck's placement and use a frozen compatibility subset/configuration in the native renderer to match the IDs and approximate visible geometry. Capture screenshot checkpoints and visible IDs to expose differences. Only compare frame cost directly when actual visible populations and content detail agree; otherwise label the comparison non-equivalent. The adapter must drive the actual production renderer, not a simplified drawing recreated for the benchmark.

Edwin chose to build visual parity before this direct comparison. [[TASK-0094-Match-Decks-Visible-Glass-Work-In-A-Native-Compatibility-Mode]] must validate the native compatibility mode against production's actual projection, visible identities and content, reader/chrome composition and delivered input at fixed checkpoints. The existing matched-subset fixtures alone do not pass this gate. Revisions 2 and 3 do not relax the visual gate or numerical targets; the scored matrix must record the later parity-verified build and checkpoint hashes.

**Desired experience.** Run the complete native scene with population caps removed and every selected record allocated. Record current Deck's selected, placed, omitted, visible and interactive counts beside it. A capped baseline with fewer objects is a product-capability comparison, not evidence that one language is faster. Report whether the native candidate meets absolute targets while doing the additional work. Do not remove text, interactions or the reader to obtain a passing score.

Retain the current application as the initial baseline, with its source commit recorded. One bounded optimization round may address an observed bottleneck in either implementation; preserve before/after evidence and account for the work. This is not an open-ended web rewrite or an effort to force a Rust win. If code outside the measurement adapter changes, give it a scoped implementation task before changing it.

## Workload and traces

Each trace is deterministic in time and named note keys, with viewport-normalized pointer coordinates. Record the same semantic actions and capture visible-ID/content checkpoints. Real OS-delivered pointer/wheel/key input must be exercised in the acceptance run; a replay calling an internal render method cannot stand for end-to-end event delivery. Diagnostic internal replays remain useful when labelled.

| Scenario | Required actions | What it exposes |
|---|---|---|
| Load | Launch, decode the fixture, allocate the scene, draw, locate and open a named note | First actionable state rather than first blank window. |
| Turn | Continuous movement through every band's populated regions | Scene traversal, visibility selection, text/cache reuse and painting. |
| Hover and selection | Move over tiles/cards at varied sizes, pause, select and move away | Hit testing, hover updates and allocation during ordinary pointer movement. |
| Zoom | Repeated zoom across every detail boundary, with pointer anchoring and pan | Text relayout, clipping, detail transitions and interaction consistency. |
| Pull and locate | Pull a small quiet note forward, reset it, locate first/middle/last keys and switch views away/back | All-note reachability, priority meaning and stable identity. |
| Reader and neighbours | In matched work, open a long formatted note, show its local link at the opening checkpoint, scroll it while the field moves and draw visible neighbour links; do not activate the link. In native uncapped work, also follow a local link and return. | The matched trace checks equivalent delivered reader work. The uncapped trace separately checks native link capability; record the actual drawn neighbour count for both. |
| Update and recovery | Append one note, append 100, remove a note, resize/minimize/restore | Position stability, allocation growth, resource lifecycle and recovery. |
| Idle and endurance | Stay idle after settling; then repeat turn/zoom/open/close for ten minutes | Unnecessary redraws, cache growth and sustained jank. |

Record every placed/visible/interactive count per frame or at a documented inexpensive sampling cadence. Include view, camera, pane state, detail distribution, text glyph counts and resource sizes at checkpoints. For the reader scenario, record the actual body length and features drawn. Include at least one dense neighbourhood; hiding neighbour edges to reduce cost is an explicit workload change, not an optimization.

## Metric applicability and sampling windows

The frozen trace declares its segments before execution. Only continuous active animation segments contribute to the frame-interval targets. Each scored segment starts with one explicitly labelled anchor frame; collect every subsequent interval until its declared endpoint. Do not discard slow first responses, long intervals or resource rebuilds inside that segment. State-update/input latency is measured separately across transitions, including the first response after idle.

| Scenario or segment | Scored metrics | Boundary rule |
|---|---|---|
| Turn, moving hover, zoom, repeated pull/locate, reader with moving field | Active frame intervals, delivered-input response, correctness, memory | Trace keeps movement active for the measured 60 seconds. Hover pauses that have no animation are predeclared idle segments. |
| Append/remove and resize while visible | Active frame intervals and delivered-input response, placement stability, memory | Allocation and resize stalls stay in the samples; they are not warmup or recovery exclusions. |
| Process load | First actionable state and peak memory | No active frame percentile before the first actionable state. |
| Settled idle | Redraw frequency, memory, correctness of the next input | No frame-interval percentile; an application that draws no frames is healthy. The first input after idle still owes the input-response target. |
| Scheduled minimize/restore | Recovery correctness and time, resource errors, memory | Exclude the declared suspended interval and the cross-boundary frame interval from active-frame percentiles only. Keep all raw timestamps and events. |
| Endurance | Memory growth plus active frame/input targets during its declared active segments | Idle and recovery segments, if any, use the rules above; never mix their scheduling gaps into active-frame percentiles. |

For recovery, the runner declares the minimize/restore action and bounds the expected suspension before it starts. Once the OS reports the window visible and focus has been reacquired, the first correct frame and a successful locate/open acknowledgment must arrive within one second. Measure that whole recovery interval separately. Resume active-frame sampling with the first correct frame as the anchor; preserve the gap preceding it as recovery evidence. If visibility/focus does not return within five seconds of the restore request, record a failed recovery run rather than retrying silently. Hardware/OS failures may explain the failure but do not erase it.

Unexpected loss of focus or visibility invalidates the affected scored repetition. Expected loss is permitted only in the predeclared recovery segment; it does not exempt adjacent active samples. Invalid runs remain in the artifact record. The summary identifies excluded interval IDs and their predeclared reasons; arbitrary after-the-fact outlier removal is forbidden. Memory/resource sampling spans every segment, including idle and suspension.

## Collection procedure

1. Capture source revision and source-workspace content manifest before export. Freeze fixtures and protocol; inventory the machine.
2. Run functional checks first. Counts, stable positions, locate and hit-test failures invalidate a candidate performance pass even if timing is fast.
3. Run one untimed warmup per scenario/build, then five measured repetitions of 60 seconds for each continuous scenario on the largest real and 10,000-note fixtures. Keep all five repetitions. Run three measured repetitions on the 50,000-note fixture, recording explicit failure if it cannot complete.
4. Measure ten fresh-process loads separately. Call these process-cold loads: do not claim an OS-cold filesystem cache. Measure steady-state reopen separately if reported.
5. Run idle for 30 seconds after a settling period; run endurance for ten minutes on the 10,000-note fixture. Collect memory after warmup and at the end.
6. Persist the raw event/frame data, summary and manifest after each scenario/repetition. A crash leaves a failed manifest and whatever samples were flushed. A user interrupt produces an incomplete run, never success.
7. Audit focus/visibility against the predeclared segment rules, window size, pacing, fixture hash and trace completion. Mark invalid runs explicitly and rerun them with the reason preserved. Report invalid-run counts as well as the final valid sample count.
8. Verify source-workspace content hashes after the run, including untracked source files. `git status` is useful context but cannot detect changes to already-dirty file contents on its own.

The original three-to-four-hour reservation estimate omitted the separate native matched-subset repetitions. TASK-0092's exact matrix now totals 210.5 minutes of declared runs and warmups before process-cold loads, recovery checks and setup, so reserve roughly four to five hours of foreground machine time. This corrects the time estimate only; the frozen scenarios, repetitions and numerical targets are unchanged. The matrix names five continuous scenarios plus load, two required datasets and the exploratory 50,000-note fixture. Runs can be resumed across sessions using identical hashes/configuration.

A failed numerical target is evidence, not a broken test to be hidden. A broken harness or functional regression is fixed before its evidence is accepted. Foreground runs are an explicit local workflow and must not unexpectedly open windows from the normal unit-test command or CI.

## Metrics and provisional targets

These numerical targets are engineering acceptance proposals for the experiment, fixed by TASK-0086 before scored runs. They are not existing product guarantees. They apply to the uncapped largest real and 10,000-note workloads on the recorded Mac Studio. Report every scenario and every repetition; averages across scenarios cannot conceal a failure.

| Measure | Target or reporting rule |
|---|---|
| Completeness | Allocated unique note keys equal selected fixture keys; zero omitted notes and zero duplicate identities. |
| Stability | Camera/detail/reader changes move zero base positions. Appending notes changes zero pre-existing base positions. Explicit priority/pull changes are separately identified. |
| Reachability | Automated locate/open resolves every fixture key; real input reaches representative first/middle/last and tiny quiet notes without requiring promotion. |
| Frame intervals at 60 Hz | p95 at most 18.4 ms; p99 at most 33.4 ms; at most 1% of intervals exceed 25 ms, in every valid required active segment, as defined in the applicability table. |
| Software input response | p95 at most 50 ms and p99 at most 100 ms from delivered input timestamp to the submission of a frame showing its effect. This is not physical input-to-photon latency. |
| First actionable state | p95 at most 3 seconds from process launch to successful draw plus acknowledged locate/open, across the ten process-cold runs. Excludes export/indexing; report production end-to-end workspace opening separately. |
| Memory | Peak native process resident memory at most 1 GiB on required fixtures. Also report GPU resource allocations separately; do not sum them into RSS on unified memory as if independent. |
| Endurance | Post-warmup resident memory increase no more than the larger of 50 MiB or 10%; text/resource caches stay within documented limits and never evict note identity. |
| Idle | After settling, at most one application-requested redraw per second with no input or model changes. Exclude and count OS-requested expose events. |

Report CPU update time, CPU render submission time, GPU time if available, draw calls, allocation/cache counters and total scene versus visible populations as diagnostics. Missing GPU timestamp support is labelled unavailable and does not invalidate CPU/frame interval measurements. It does prevent claims about GPU headroom. Record sampling overhead with a measurement-enabled/disabled control.

A requestAnimationFrame interval and a native redraw interval are scheduling observations, not guaranteed display scanout times. Prefer actual presentation timestamps where accessible. Name the clock and endpoints for each implementation. If equivalent presentation measurement is unavailable, compare the scheduling metrics under their correct names and retain a visual/input acceptance walk; do not present a GPU submission timestamp as proof the frame reached the screen. Unsupported input timing yields an incomplete latency result, not zero milliseconds.

## Artifact contract

Proposed output layout: `local/runs/<run-id>/manifest.json`, `frames.jsonl`, `events.jsonl`, `summary.json`, and screenshot checkpoints. Each frame row identifies scenario/repetition/frame, monotonic timestamp, scheduling interval, CPU work, optional GPU work and population counters. Each input row identifies delivered event ID/time, resulting state version and first submitted frame containing that state. The manifest records completion/failure, invalidations, input/fixture/protocol/build hashes, hardware and measurement method. Summaries carry units, sample counts, per-run percentiles and raw-file hashes.

The runner's nonzero exit means harness/functional failure or incomplete data. The report separately records `targets_met` true/false: a complete run that misses a target still produces valid evaluation evidence. A deliberately omitted sample, truncated trace, unexpected unfocused window or absent fixture must be caught by a focused harness check. The harness also proves that legitimate idle and scheduled recovery segments are scored under their own metrics rather than rejected.

Publish the final evaluation summary under this feature's `plan/` with links to retained artifacts and commands that actually exist at that point. Keep the raw run directory until the architecture decision is settled and an evidence retention location is recorded. stdout alone is not a durable artifact.

## Decision rules

The report has a row for each proposed constraint removal: capacity-based omission, promotion-dependent reachability, fixed detail restrictions, allocation churn and synchronous work. State what was tested, what changed, the evidence, and remaining cost. Do not attribute a result solely to Rust when batching, caching or visibility selection could also be implemented in the current stack.

A positive prototype result requires both correct complete behavior and all required target measurements. It supports proposing a native migration, not claiming production parity. A negative result names the limiting workload and recommends a bounded next step or staying with the current architecture. Missing required evidence is inconclusive; TASK-0092 remains open.

Before recommending a full rewrite, list remaining work for multiwindow/screens, the full reader and text selection, accessibility/IME, persisted state/addresses, query/index compatibility, guarded sidecar writes, Spread/Orbit, packaging and tablet delivery. For each, name the current contract, proposed approach, uncertainty and a small validation step. Give ranges and dependencies rather than an unsupported delivery date.

A browser proof is conditional: if the recommendation relies on reusing this Rust renderer on the tablet, TASK-0093 must build and exercise a minimal WebAssembly slice with representative text, input and a read-only fixture on the target browser/device. A desktop build or a successful WebAssembly compilation is insufficient. If this cannot be run, mark shared-browser reuse unproven and keep the recommendation conditional or retain a separate browser renderer. Production tablet support remains outside this experiment.

## Maintenance

TASK-0086 owns the frozen protocol; TASK-0092 owns results and deviations. Later sessions should read this document before recording performance claims. The feature note owns scope, PLAN.md owns architecture and task ordering, and this file alone owns the numerical targets.
