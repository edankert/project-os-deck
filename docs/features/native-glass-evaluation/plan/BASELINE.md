---
type: "[[reference]]"
id: "REF-NATIVE-GLASS-BASELINE"
title: "Current Deck baseline observed before scored native comparisons"
status: "active"
owner: "user:edwin"
created: "2026-09-29"
updated: "2026-09-29"
source: ["[[TASK-0086-Define-The-Native-Glass-Experiment-And-Baseline]]"]
related: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]", "[[RISK-0005-A-Native-Prototype-Wins-By-Doing-Less-Work]]"]
---

# Current Deck baseline observed before scored native comparisons

The existing foreground `npm run measure --prefix desktop` runner completed on 2026-09-29. It drove the production Electron Glass renderer for one five-second turn, one pointer-moving turn and one zoomed turn per workspace. Every reported turn was visible, focused and recorded about 299–300 frames. This is a useful provisional baseline, but it is not the frozen protocol's scored comparison: it has one repeat, no p99, no cold actionable-load or process memory measure, and no shared fixture adapter.

The raw record is `measurements/2026-09-29T08-22-42Z.json` (local, ignored by Git), SHA-256 `0be9acea50d629c7165fa5a20857035c15ea995b1d5be3f0d8cc4c42a1da0cd2`. It was taken on a Mac Studio `Mac14,13`, Apple M2 Max with a 30-core GPU and 32 GB of RAM, macOS 26.5.2 build 25F84. The renderer used Electron 32.3.3. The physical display model, resolution, scale and refresh were not captured by this runner. The source commit was `292a7da5e6320b9017bbd14db42fa8fc105f44dd`; the compiled `desktop/dist/main/main.js` SHA-256 was `34857eaf8179a6411b5997e4fa2afd0b2c8726c04790bc009ae8ace58d009973`. The uncommitted diff hash was not captured at the instant of this run, so this result is not a frozen-build comparison.

| Workspace | Indexed Markdown notes | Issues dealt in Glass | Turn p95 interval | Pointer-moving p95 | Zoomed p95 | Peak elements on turn | Peak canvas tiles on turn |
|---|---:|---:|---:|---:|---:|---:|---:|
| Deck | 357 | 89 | 17.5 ms | 17.4 ms | 17.5 ms | 293 | 72 |
| Cockpit | 1,750 | 315 | 17.5 ms | 17.5 ms | 17.5 ms | 1,367 | 255 |
| Your Trainer | 3,193 | 523 | 17.5 ms | 17.5 ms | 17.6 ms | 2,656 | 397 |

The matching raw export's all-notes view contains 335, 1,727 and 3,171 records respectively because it excludes 22 template notes per workspace; the runner's index counts include them. The runner's `dealt` count is its runtime Issues arrangement and may include held neighbourhood notes in addition to the exported Issues view. Do not equate the indexed note count or the DOM element count with placed, visible or interactable note identities.

These p95 intervals mostly show the 60 Hz presentation cadence, not the renderer's full cost. The runner separately reported work p95 of 0.9, 1.7 and 3.6 ms for the three normal turns, but sampled only the work it times inside `measureTurn`. It did not record physical presentation, all frame intervals, p99 stalls, input acknowledgment, peak RSS, foreground launch latency, idle redraws or endurance growth. Its four-times CPU-throttled segments are supplementary and are excluded from this hardware baseline.

TASK-0092 must rerun both implementations with the same frozen source content and the six active scenarios in [BENCHMARK.md](BENCHMARK.md). It must record selected/placed/visible/interactable IDs, raw intervals and p99, repeat counts, valid focus, machine/display and build hashes, actionable load, RSS, idle and endurance. The candidate's uncapped population run is reported separately from any matched-work subset; this five-second capped Deck run cannot prove a Rust speedup or satisfy the feature's performance gate.
