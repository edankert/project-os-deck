---
type: "[[risk]]"
id: "RISK-0006"
title: "Native rendering leaves Decks reader and tablet behind"
status: "closed"
phase: "[[PHASE-0002-Glass]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
likelihood: "high"
impact: "high"
mitigation: ["[[TASK-0088-Boot-An-Isolated-Native-Glass-Executable]]", "[[TASK-0091-Exercise-Native-Glass-With-Real-Input-And-A-Reader]]", "[[TASK-0094-Match-Decks-Visible-Glass-Work-In-A-Native-Compatibility-Mode]]", "[[TASK-0093-Decide-What-The-Native-Glass-Evidence-Supports]]"]
related: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]", "[[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]]"]
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-10-01"
---

# Native rendering leaves Deck's reader and tablet behind

## Description

A native field can render well while its dependencies make the rest of Deck expensive to reproduce. Markdown, font shaping, text selection, accessibility and browser delivery are substantial application behavior. A graphics library's WebAssembly support does not prove that its chosen reader, input or window dependencies support the tablet experience.

The prototype introduces Rust, graphics/text dependencies, a new build path and native resource lifecycle. Unsupported hardware features, incompatible versions or licensing constraints could change the implementation cost before the field is measured.

The isolated prototype currently pins Rust 1.98.1, wgpu 30.0.1, winit 0.30.13 and glyphon 0.12.0 in its toolchain and lockfile. It runs on Metal on the Mac Studio; that is evidence for this native backend only. The dependency audit is still open: license inventory, WebAssembly compatibility for the complete reader/input path, real text selection, screen-reader behavior and graphics resource growth have not passed their gates. `libc` is used only to sample this macOS process's peak resident memory; it adds a platform-specific metrics path, not a production dependency.

The compatibility mode also uses pinned `objc2`, `objc2-app-kit` and `objc2-foundation` bindings to measure macOS system-font widths for Deck's pane controls and compass. This is a new macOS-only dependency and does not establish browser or tablet portability. The measurement must stay confined to the isolated compatibility path, and the foreground gate must check that the measured bounds also govern pointer hits. The architecture decision must price a separate cross-platform text-layout strategy if Deck moves beyond this Mac prototype.

Navigator-label parity now adds a direct pinned `unicode-segmentation` dependency, already present transitively in the Rust lockfile. Its local package manifest declares `MIT OR Apache-2.0`. It keeps the ellipsis from splitting a visible Unicode grapheme while AppKit measures the prefix. A bounded 1,024-entry result cache avoids repeated measurements during camera frames. The code remains inside native compatibility mode, so this does not make normal uncapped placement depend on macOS font measurement. TASK-0088's full dependency and license inventory remains open; the foreground parity gate must still establish whether the resulting text actually matches Deck.

## Mitigation

- [[TASK-0088-Boot-An-Isolated-Native-Glass-Executable]] pins compatible versions and records platform, licensing, backend and native/browser constraints before substantial renderer work.
- [[TASK-0091-Exercise-Native-Glass-With-Real-Input-And-A-Reader]] implements representative native reader content and real keyboard input, and records text-selection and accessibility gaps explicitly.
- [[TASK-0094-Match-Decks-Visible-Glass-Work-In-A-Native-Compatibility-Mode]] checks the AppKit-measured geometry against foreground Deck captures, tests the same bounds for drawing and pointer hits, and keeps the font dependency out of the normal uncapped scene.
- [[TASK-0093-Decide-What-The-Native-Glass-Evidence-Supports]] inventories complete-application work, preserves the sidecar/write contracts and requires browser feasibility evidence before recommending shared native/tablet delivery as established.

## Triggers

- The selected stack cannot shape fixture text or requires a WebView to meet the representative reader workload.
- Selection, copy, focus, long-body scrolling or local note links are absent but the report calls the reader complete.
- A native-only dependency is presented as portable because wgpu itself supports a browser target.
- Unsupported GPU features or unbounded graphics/text caches make the Mac Studio run incomplete or unstable.
- Prototype scope grows into sidecar replacement, full tablet parity, multiwindow behavior or production migration without a separate decision.

## Response and closure evidence

Record the dependency or parity gap and its consequence in the evaluation report. Replace a dependency when needed for the agreed prototype workload; do not quietly lower that workload. Work beyond the prototype belongs to an explicit later migration decision and phase scope.

A completed prototype can leave migration hazards open. Resolve this risk only when the report makes those hazards actionable and the owner accepts the residual exposure or chooses not to migrate. Do not claim that a smooth field proves complete native Deck feasibility.

## Closed, 2026-10-01

No native renderer is being adopted, so the reader and the tablet cannot be left behind by one. Edwin dropped the native Rust evaluation on 2026-10-01 ([[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]], "Cancelled"). The risk was not mitigated; its cause was removed. A later proposal to change renderer starts a new risk scan.
