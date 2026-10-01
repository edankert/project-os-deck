---
type: "[[task]]"
id: "TASK-0088"
title: "Boot an isolated Rust window with reproducible builds and measurement output"
status: "doing"
phase: "[[PHASE-0002-Glass]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
parent: "[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"
effort: "M"
due: ""
depends: ["[[TASK-0086-Define-The-Native-Glass-Experiment-And-Baseline]]"]
blocks: ["[[TASK-0089-Give-Every-Note-A-Stable-Reachable-Place]]"]
related: ["[[RISK-0006-Native-Rendering-Leaves-Decks-Reader-And-Tablet-Behind]]", "[[TST-0059-The-Native-Glass-Evaluation-Is-Reproducible]]"]
tests: []
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-09-29"
---

# Boot a separate native window with measurement support

## Outcome and ownership

Create a reproducible native Rust executable without changing how Deck starts. This task owns the proposed Cargo project, dependency selection, window lifecycle, metrics foundation and build instructions.

## Definition of Done

- [ ] The independent proposed `prototypes/native-glass/` Cargo project opens a winit window and a wgpu surface on the Mac Studio.
- [ ] Rust toolchain and compatible dependency versions are pinned. The lockfile, graphics backend and text/UI stack choice are recorded with licensing and platform constraints.
- [ ] Window resize, display-scale changes, minimization, surface recreation and normal exit behave predictably and release resources.
- [ ] A minimal native text sample proves the chosen stack can shape the fixture's Unicode and right-to-left samples. Missing glyphs are observable.
- [ ] Metrics record monotonic timestamps, frame intervals, CPU stages, input acknowledgments and basic resource counters in the benchmark's durable format.
- [ ] The build/run instructions work from a clean checkout with stated prerequisites. Production Electron commands and shared sidecar contracts remain unchanged.

## Steps

1. Complete TASK-0086. Establish the Rust toolchain as an explicit prerequisite: `cargo` and `rustc` were not on PATH in the planning shell. Record installation/setup instructions and verify the chosen pinned version before building. Review current official documentation when selecting winit, wgpu and a compatible text/UI stack; do not treat proposed package names as pinned versions.
2. Create the isolated project and explicit `fixture`, `scene`, `camera`, `render`, `input`, `reader` and `metrics` boundaries described in [PLAN.md](../PLAN.md).
3. Build only the window, graphics surface, diagnostic text and metrics foundation here. Keep scene behavior for TASK-0089.
4. Handle scale changes and surface errors with a visible diagnostic. Record when hardware/backend capabilities prevent a planned measurement.
5. Add run identity and invalid-run reasons early so subsequent feature work is measured through the same route.
6. Record the native/WASM dependency boundary. If the selected reader or window stack is native-only, list the browser implication rather than starting a tablet port.

## Verification and stop conditions

Author and link the task-specific executable or manual test notes when their commands or procedure exist, before closing this task. The acceptance walk and final evidence audit are feature-level context; later tasks’ reports are not prerequisites for this task’s own verification.

Build and run the actual window on the Mac Studio. Resize it, move it between available display scales, minimize/restore it, and close/reopen it. Verify records retain timestamps and identify invalid background intervals. Missing second-display hardware is recorded as an unperformed optional check.

Stop if the selected stack requires an embedded WebView to draw the field or representative reader. Reassess the dependency choice within this task. If native text cannot meet the fixture workload, record the limitation before more rendering is built. No empty-window frame rate counts as the feature's performance result.

## Notes

The Cargo project, pinned toolchain, lockfile, Metal window, text pipeline and initial metrics now exist. One release-window run on the M2 Max presented a frame containing five visible cards, with 200 of 200 records allocated and no reported render error. The run lost focus, and it is not a scored benchmark. Surface recovery, input response, memory and font evidence need a fuller run. [[RISK-0006-Native-Rendering-Leaves-Decks-Reader-And-Tablet-Behind]] remains open.
