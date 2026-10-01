---
type: "[[plan]]"
title: "Evaluate native Glass before choosing a migration"
status: "superseded"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
implements: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
related: ["[[PHASE-0002-Glass]]"]
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-10-01"
---

# Evaluate native Glass before choosing a migration

## Delivery sequence

| Step | Tasks | Deliverable and gate |
|---|---|---|
| 1. Define experience and comparison | [[TASK-0086-Define-The-Native-Glass-Experiment-And-Baseline]] | Frozen benchmark protocol, target hardware record, current Deck baseline and constraints matrix. |
| 2. Build an isolated executable | [[TASK-0087-Export-Representative-Workspaces-For-Both-Renderers]], [[TASK-0088-Boot-An-Isolated-Native-Glass-Executable]] | Complete fixture contract and a reproducible native window. Neither depends on the other's implementation. |
| 3. Implement demanding Glass behavior | [[TASK-0089-Give-Every-Note-A-Stable-Reachable-Place]], [[TASK-0090-Draw-Readable-Cards-With-A-Native-Renderer]], [[TASK-0091-Exercise-Native-Glass-With-Real-Input-And-A-Reader]], [[TASK-0094-Match-Decks-Visible-Glass-Work-In-A-Native-Compatibility-Mode]] | Complete stable scene, realistic text and graphics, interaction and a native reader, then match Deck's visible work in a separate compatibility mode. |
| 4. Measure realistic workloads | [[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]] | Parity-verified direct comparison, separate uncapped native results, saved raw runs, correctness results, target verdicts and scaling curves. |
| 5. Make the architecture decision explicit | [[TASK-0093-Decide-What-The-Native-Glass-Evidence-Supports]] | Recommendation, unresolved gaps, migration cost breakdown and a proposed decision if adoption is justified. |

## Proposed implementation boundaries

The independent Cargo project and first runnable window now exist under `prototypes/native-glass/`. The remaining modules and gates below describe the intended complete evaluation; a successful window boot is not a scored result.

Use `prototypes/native-glass/` as an independent Cargo project, outside Electron's build and start paths. Put fixture exporters and generators in its `tools/` directory. Keep small synthetic fixtures and recorded input traces under `fixtures/`; keep private real-workspace exports and raw runs in an ignored `local/` directory. Preserve shareable summaries and screenshots under this feature's evidence directory at implementation close-out.

| Module | Responsibility |
|---|---|
| `fixture` | Decode and validate a versioned input; no production filesystem watcher or query evaluation. |
| `scene` | Stable note identities, band membership, base positions, session pull state and spatial lookup. No graphics API types. |
| `camera` | Turn, pan, zoom, viewport and coordinate transforms shared by painting and hit testing. |
| `render` | Visibility selection, card batches, clipped reader drawing, text shaping/cache and resource lifecycle. |
| `input` | Normalize real and recorded input into the same commands; keep reader scroll separate from field zoom. |
| `reader` | A native pane for representative Markdown content and local note links; no embedded WebView. |
| `metrics` | CPU timings, frame intervals, input acknowledgments, resource counters and durable run output. |

Use winit for window/input handling and wgpu for graphics. Select a compatible text shaping/rasterization stack during TASK-0088, record the choice, and pin versions and Rust toolchain in the prototype. Do not implement a font engine. A small native UI toolkit is acceptable for the pane and controls if its rendering costs are included; it must not turn the experiment back into a browser renderer. The graphics API supports native and WebAssembly targets, but that is not evidence that Deck's reader or tablet behavior already ports: [wgpu](https://wgpu.rs/), [winit](https://docs.rs/winit/latest/winit/), checked 2026-09-28.

## Scene and interaction contract

Keep record identity separate from display detail. Fixture identity uses workspace identity plus relative path, with the note's displayed ID as data; duplicate displayed IDs cannot merge two files. Retain each view's resolved membership, ordering, groups and priority classification. Allocate additional stable rows or sections when a band grows rather than dropping records. Front/owed work stays nearer than subject work; finished/suppressed work stays in its quiet band. A capacity in the compatibility configuration is a measured control, never a hidden cap on the native candidate.

Use a stable per-view allocation map. Camera movement, changing detail, opening a pane and hover never move base positions. Appending a note takes a free/new slot without redistributing existing notes; removing a note releases its slot. Rebuilding the same fixture deterministically reproduces the same initial map. Changing priority or explicitly pulling a note may change that note's displayed placement and is reported as an intentional move. Switching away and back restores the view's allocation map for this session. If a layout cannot make a note reachable, report failure instead of counting it as placed successfully.

A searchable identifier list and a locate action move the camera to any note; keyboard traversal also reaches the list, field controls and reader. Hit testing uses the same transformed bounds, clipping and front-to-back order as drawing. A tiny representation remains an interactive note. Provide a hover label, click/Enter to open, a downward pull gesture and a keyboard pull action, and reset of session pulls. Define gesture thresholds once and test pointer-versus-drag arbitration. A selected or held note is not duplicated as another active card in the scene.

Wheel/pinch zoom remains anchored to the pointer; `+`, `-`, `0` provide equivalents. Wheel input over the reader scrolls its body. Escape closes the reader or cancels a gesture predictably; input in search does not activate field shortcuts. Reduced motion removes transitions without removing any action. A simple in-memory state object is sufficient; no saved production desk is read or written.

The reader slice includes headings, paragraphs, lists, emphasis, code, a table and local note links, plus a long body that must scroll. Include long titles, Unicode and at least one right-to-left text sample in rendering fixtures. Display unsupported Markdown constructs explicitly. Provide native text selection/copy in the pane or record its absence as a migration blocker; do not replace note bodies with screenshots or a short placeholder. Full HTML, embeds, plugins, editing and screen-reader parity remain migration work. Run a keyboard walk now and record accessibility gaps now.

## Dependencies and ownership

TASK-0086 defines the contract before its implementation starts. TASK-0087 and TASK-0088 can proceed independently after it. TASK-0089 needs both; TASK-0090 needs TASK-0089; TASK-0091 needs TASK-0090. Edwin chose a visual-parity mode before direct comparison, so TASK-0094 follows TASK-0091 and must validate matching visible work against the actual production renderer. Instrument the executable in TASK-0088 and carry metrics through every later task. TASK-0092 starts its scored runs only when content, interaction and TASK-0094's parity gate meet the frozen workload. TASK-0093 consumes those results.

The implementer owns the prototype modules, its tools and tests, and this feature's evidence. Existing `desktop/` changes are limited to a fixture export or measurement adapter that consumes the real current renderer; any required code change belongs to these tasks and receives regression checks. The sibling cockpit and shared sidecar need no edits. Existing renderer reviews remain owned by their current features.

## Evaluation boundaries and decision

This work belongs to PHASE-0002 because it tests Glass's population and interaction limits. It does not add a phase or change phase order. The experiment may finish with a negative result. If measurements or essential hardware are missing, report the provisional conclusion but keep the uncompleted measurement task open; do not close the feature on an inconclusive run.

TASK-0093 writes a recommendation in this feature's plan directory and, if appropriate, a proposed ADR for the owner. An accepted native migration would get a separately scoped Native Deck phase, including read/write contract preservation, real indexing, complete reader/accessibility behavior, multiwindow and tablet delivery. The evaluation itself neither creates that phase nor accepts that ADR.

## Inputs still to confirm

Edwin chose the current Mac Studio as the required acceptance machine. TASK-0086 records its model, chip/GPU, RAM, OS, display resolution, scale and refresh rate before the scored comparison. No laptop run is required. A newer computer is not assumed to be faster; results are valid for the measured configuration. If the machine is unavailable, fixture and harness work can proceed, but the scored evaluation remains incomplete. Dependency versions and the text/UI stack are implementation selections in TASK-0088, subject to the fixed workload rather than permission gates.

## Verification design

Pure checks prove complete placement, deterministic identity, stable positions, camera inverses, hit-test ordering and consistent command behavior. Real-window checks exercise event delivery, text clipping, focus and the reader. The measurement runner rejects incomplete runs or unexpected loss of focus and preserves their failure records. Scheduled idle and minimize/restore segments use the separate applicability rules in BENCHMARK.md. Each check must demonstrate the failure it detects, for example a deliberately omitted record, a mismatched hit-test transform or a dropped timing sample. Add executable test notes only when their commands exist; use the two scaffolded test notes for the acceptance walk and final evidence audit.

## Planning review

Two independent reviewers read the feature, delivery plan and benchmark from clean contexts on 2026-09-28. Both found that idle and scheduled minimize/restore segments conflicted with the active-frame timing rules. BENCHMARK.md now defines metric applicability per segment, preserves raw exclusions and gives recovery separate deadlines. A narrow follow-up review confirmed that correction. The remaining scoped claims about complete placement, realistic workloads, comparison validity and migration boundaries held by document inspection. This is advisory plan review, not runtime verification or a feature-completion verdict.

## Dropped, 2026-10-01

This delivery sequence was not completed. Edwin dropped the evaluation on 2026-10-01; the feature note's "Cancelled" section records it. Glass is delivered in the Electron application under the plans of FEAT-0020 and FEAT-0022.
