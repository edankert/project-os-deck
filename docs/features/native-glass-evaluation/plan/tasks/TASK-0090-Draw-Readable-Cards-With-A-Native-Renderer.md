---
type: "[[task]]"
id: "TASK-0090"
title: "Draw realistic card content with cached text and bounded graphics work"
status: "cancelled"
phase: "[[PHASE-0002-Glass]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
parent: "[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"
effort: "L"
due: ""
depends: ["[[TASK-0089-Give-Every-Note-A-Stable-Reachable-Place]]"]
blocks: ["[[TASK-0091-Exercise-Native-Glass-With-Real-Input-And-A-Reader]]"]
related: ["[[RISK-0005-A-Native-Prototype-Wins-By-Doing-Less-Work]]", "[[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]]"]
tests: []
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-10-01"
---

# Draw realistic cards and keep graphics work proportional to visibility

## Outcome and ownership

The renderer draws readable note content while retaining the entire scene. This task owns the proposed `render` module, card batches, text cache, clipping, graphics resources and render-stage instrumentation.

## Definition of Done

- [ ] Cards show the frozen workload's titles, properties, status, progress and detail at the specified apparent sizes. Screenshots demonstrate content fidelity.
- [ ] Visibility selection bounds drawing work without removing notes from the scene or its interaction model.
- [ ] Batched card geometry and reusable shaped text avoid rebuilding unchanged content during camera motion.
- [ ] Text cache and graphics resource budgets are explicit, observable and bounded under repeated views and zoom changes. Eviction never changes a note's identity.
- [ ] Unicode, right-to-left text, long titles, clipping and display scaling are visually checked using TASK-0087's fixture.
- [x] Render metrics include visible population, detail distribution, draw calls, text/cache work and resource use. Each frame counts its painted representation and geometry draw calls. Glyph draw calls and atlas bytes are unavailable and recorded as such; the summary rejects detail counts that do not reconcile with painted cards.

## Steps

1. Complete TASK-0089 and render its scene without simplifying its complete population.
2. Separate content invalidation from camera transforms. Reuse geometry and shaped text until the content or relevant scale changes.
3. Implement detail transitions according to apparent size and the frozen comparison contract. A distant note may draw less detail but remains selectable.
4. Share final transformed card bounds with the hit-test path. Respect clipping and occlusion consistently.
5. Add text and resource counters to the existing metrics output. Measure warm and cold cache cases separately.
6. Capture representative screenshots at each detail range, including dense views and non-ASCII content. Record any mismatch against current Deck's matched workload.

## Verification and stop conditions

Author and link the task-specific executable or manual test notes when their commands or procedure exist, before closing this task. The acceptance walk and final evidence audit are feature-level context; later tasks’ reports are not prerequisites for this task’s own verification.

Use actual foreground-window checks for text appearance, clipping and scale changes. Use executable behavioral checks for visibility boundaries, content invalidation and cache eviction. Show that camera-only updates do not continually reshape unchanged text and that changed content does invalidate it.

A rectangle-only scene or missing properties cannot pass this task. Stop scored comparison if text is unreadable, required content is absent or detail thresholds give the native renderer less work without disclosure. An unsupported font sample remains a defect or explicit limitation, never an empty successful card.

## Notes

Depends on [[TASK-0089-Give-Every-Note-A-Stable-Reachable-Place]]. [BENCHMARK.md](../BENCHMARK.md) owns the performance targets. The reader is added in TASK-0091; rendering without it is preparatory evidence only.

The compatibility renderer now retains shaped card and quiet-tile text in an 8,192-entry least-recently-used cache. Ordinary cards use their fixed base layout and glyphon scales the cached buffer with the camera; quiet-tile IDs have no wrapping and reuse one shaped layout while their final bounds still clip the drawing. Changed text reshapes, and the cache refuses to evict an entry used in the current frame. A focused Rust test checks reuse, content invalidation and bounded eviction. On the real reader fixture, an OS-delivered wheel left 292 visible candidates and 330 cached fields unchanged with zero new card-field shapes; the recorded 89 misses per frame are still transient navigator and chrome labels. A following zoom key exposed a different population and added 24 cached fields. The new initial foreground images on the real and generated fixtures are pixel-identical to the preceding native images, and the real zoom run retained focus with no application error. This is partial cache evidence only: chrome still reshapes, Unicode and right-to-left foreground checks remain, and this task's boxes stay open.

The renderer now also retains up to 512 shaped chrome and navigator labels. Position and color changes reuse a buffer; changed text, font, wrapping or layout width and height reshape it. The final release diagnostic retained 419 real-reader entries across an OS wheel with zero measured misses on its initial, pointer and wheel samples; a zoom key exposed a different population and caused 25 misses, including one changed label. The generated initial sample retained 157 entries with zero misses. Both final-build foreground screenshots are pixel-identical to the preceding native images. A focused label-cache test brings the Rust suite to 43 passing tests. These are short functional diagnostics, not scored speed evidence, and the remaining Unicode, resource-byte and visual-parity checks keep the task open.

A generated 10,000-note reader diagnostic exposed a resource leak in a locked session. The renderer prepared text before checking whether macOS would provide a drawable surface. The opt-in checkpoint timer then repeatedly requested a frame that could not be submitted, and glyph allocations accumulated until the 8,192-pixel atlas filled. A 16-area sharding trial reached 5.1 GB and was removed. The renderer now acquires the surface before shaping visible text, clears atlas use on early surface exits, and advances the checkpoint timer even when no frame is submitted. The same 188-action locked-session probe now completes without an atlas error at 136,462,336 bytes peak resident memory. It still has no foreground frame, so it does not establish that the dense reader renders correctly when unlocked or that the 1 GiB scored target is met. Those checks, Unicode and scaling remain open.

An offline 2026-10-01 review found that every uncapped camera zoom cleared all shaped card text, even though its buffers use each card's base size and the draw call supplies the camera scale. Zoom now retains that cache; pull and reset invalidate only the cards whose dimensions changed. All 71 Rust tests pass. The desktop was locked, so no foreground frame measured the expected reduction in text-cache misses or checked painted text after this change. The task remains open for that check and its other visible-content and resource evidence.

Each submitted frame now records the number of geometry `draw` calls and the count of cards drawn at each detail level. The run summary reports the largest value in each group and rejects a frame whose detail counts differ from its painted-card count. Glyphon's internal text draw calls and atlas bytes are unavailable and remain null. Eight focused summary tests pass. Foreground resource and visual-detail checks remain owed.

## Cancelled, 2026-10-01

Not finished and not going to be: Edwin dropped the native Rust evaluation on 2026-10-01 ([[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]], "Cancelled"). The unticked boxes above stay unticked. The text is kept as the record of what was done; the `prototypes/native-glass/` paths it names were removed by [[TASK-0105-Remove-The-Native-Glass-Evaluation-From-The-Tree]].
