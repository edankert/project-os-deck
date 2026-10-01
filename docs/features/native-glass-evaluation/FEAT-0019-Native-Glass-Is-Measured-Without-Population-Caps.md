---
type: "[[feature]]"
id: "FEAT-0019"
title: "Native Glass is measured without population caps"
status: "doing"
phase: "[[PHASE-0002-Glass]]"
source: ["Edwin 2026-09-28: Plan these 5 steps fully.", "Edwin: evaluate removing design compromises made in anticipation of slowdown, rather than only speeding up the existing capped design."]
goal: "Determine whether a native Rust Glass can give every note a stable, reachable place with realistic readable content and smooth interaction on the current Mac Studio, and record whether the evidence warrants a native Deck migration."
requirements: []
tasks: ["[[TASK-0086-Define-The-Native-Glass-Experiment-And-Baseline]]", "[[TASK-0087-Export-Representative-Workspaces-For-Both-Renderers]]", "[[TASK-0088-Boot-An-Isolated-Native-Glass-Executable]]", "[[TASK-0089-Give-Every-Note-A-Stable-Reachable-Place]]", "[[TASK-0090-Draw-Readable-Cards-With-A-Native-Renderer]]", "[[TASK-0091-Exercise-Native-Glass-With-Real-Input-And-A-Reader]]", "[[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]]", "[[TASK-0093-Decide-What-The-Native-Glass-Evidence-Supports]]", "[[TASK-0094-Match-Decks-Visible-Glass-Work-In-A-Native-Compatibility-Mode]]"]
release: ""
acceptance_exception: ""
design: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]", "[[RISK-0006-Native-Rendering-Leaves-Decks-Reader-And-Tablet-Behind]]"]
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-09-29"
---

# Native Glass is measured without population caps

## Goal

Determine whether Deck can remove performance-driven limits on the field by using a native Rust renderer. Build an isolated experiment with complete note placement, real text and real interaction, then compare its behavior and costs with the current application.

This is an evaluation, not an approved rewrite. A measured failure is a valid outcome; an incomplete run is not evidence of success. The five steps are fully planned, and implementation is underway.

## Scope

The [delivery plan](plan/PLAN.md) divides the five steps into nine tasks. Edwin added a visual-parity gate before direct speed comparison: [[TASK-0094-Match-Decks-Visible-Glass-Work-In-A-Native-Compatibility-Mode]]. The [benchmark specification](plan/BENCHMARK.md) owns the workload, timing definitions, numerical targets and decision rules.

In scope: a versioned fixture export, a separate Rust executable using winit and wgpu, stable complete placement, visibility-based drawing, readable cards, pointer and keyboard interaction, one native note pane, reproducible measurements, and an architecture recommendation. The current Mac Studio is the required acceptance machine, as Edwin chose during planning. A 10,000-note generated fixture tests additional headroom; 50,000 notes explore the failure boundary.

The prototype must place every valid note selected by the fixture's view. A note outside the viewport remains in the scene and can be brought into view by identifier. Hidden drawing work is allowed; hidden population truncation is not. Priority bands remain meaningful. Small apparent size may reduce detail for readability, but never changes a note's identity or whether it can be selected and pulled forward.

Out of scope: replacing the production renderer, a Rust index or query engine, porting the Python sidecar, guarded write operations, full Spread or Orbit, multiple windows, saved desks, terminal panels, installers, and full browser/tablet parity. The decision report must price and sequence those omissions. It cannot describe this prototype as a complete native Deck.

## Acceptance

- The fixture manifest accounts for every selected note, includes real card content and representative note bodies, and records unsupported or rejected input without silently discarding it.
- Every valid note in the required real and 10,000-note fixtures has one stable base position and can be located, selected and pulled forward regardless of drawn detail. The exploratory 50,000-note run reports its reached population and any failure without hiding omitted notes.
- The executable supports the interaction and native reader slice specified in the plan, including real pointer input, keyboard equivalents, zoom anchoring, visible selection and reduced motion.
- The benchmark protocol is frozen before implementation results are compared. Raw results identify machine, build, fixture, actual placed and visible populations, timing method, failures and excluded runs.
- The largest real workspace and the 10,000-note fixture are evaluated against the published targets on the current Mac Studio. Missing measurements are recorded as missing evidence; results do not establish performance on other hardware.
- The evaluation report separates a matched-work comparison from the uncapped native workload, identifies which design limits can be removed, and recommends native migration, a hybrid, continued web work, or no decision because evidence is missing.
- The source workspace contents remain unchanged. Production Deck and the shared sidecar gain no new write route and no new default renderer through this feature.

## Impact analysis

FEAT-0009 supplies Glass's priority semantics; FEAT-0014 supplies session-only pull and input expectations; FEAT-0016 supplies pointer-anchored zoom and pane scrolling; FEAT-0017 supplies the representative reader/neighbourhood workload; FEAT-0018 supplies the capacity and reachability problem. Their notes have no linked REQ notes, and this repository currently has no numbered requirements. Experiment-specific acceptance belongs here rather than in a new permanent product requirement.

ADR-0001 and ADR-0003 preserve the read-only served host and sidecar-only guarded writes. ADR-0002 keeps Glass as Deck's production default. ADR-0004 preserves views as descriptions: export resolved view membership instead of implementing a second evaluator. The capacity rule in proposed ADR-0005 is deliberately tested as an alternative in this isolated executable; neither its production conformance tests nor its recorded decision are amended. Adopting uncapped placement in Deck requires a later decision that explicitly reconciles that rule.

No production contract conflict remains after this isolation. The current feature reviews and open defects retain their status. This work neither closes ISS-0086 nor reopens FEAT-0018's completed review rounds.

## Risk scan

New Rust/graphics dependencies, new prototype paths, foreground performance runs and browser/reader parity are the concrete triggers. [[RISK-0005-A-Native-Prototype-Wins-By-Doing-Less-Work]] covers evidence quality. [[RISK-0006-Native-Rendering-Leaves-Decks-Reader-And-Tablet-Behind]] covers dependency and migration limits. Their mitigation tasks are part of this plan.

## Verification

Implementation now includes the frozen benchmark contract, live fixture export, complete native scene placement, a Metal renderer, input commands, a limited reader and a provenance-checking diagnostic runner. [[TST-0060-The-Native-Glass-Fixtures-Reconcile-And-Regenerate]] passes the fixture and read-only export checks; TASK-0087 is done. Real OS-delivered pointer, wheel and keyboard events have been exercised in partial walks, including notes omitted by the current production caps and a tiny quiet card. Those checks do not complete the full [[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]] acceptance walk. Several complete 60-second native diagnostics and separate production diagnostics are recorded in [EVIDENCE.md](plan/EVIDENCE.md); their workloads differ and neither set is a comparative performance verdict. The current-Deck trace adapter remains diagnostic because visible work and event delivery differ. The complete scored matrix, the remaining real-input walk, the [[TST-0059-The-Native-Glass-Evaluation-Is-Reproducible]] evidence audit and independent review remain owed.

On 2026-10-01, `npm test --prefix desktop` passed all 483 tests, `cargo test --locked --manifest-path prototypes/native-glass/Cargo.toml` passed all 71 native tests, and `node --test prototypes/native-glass/tools/test-*.mjs` passed 98 prototype tests with six skips. TASK-0089's separate [[TST-0062-The-Native-Scene-Keeps-Every-Note-Reachable]] audit reached every key on the 3,174-note real, 10,000-note generated and exploratory 50,000-note fixtures and records the frozen hashes. TASK-0090 now records painted detail distribution and geometry draw calls, with a reconciliation check in the run summary. TASK-0094 has partial foreground and real-input evidence but no matched visual verdict. The complete scored matrix, acceptance walk and architecture recommendation remain outstanding.

## Links

- Delivery: [PLAN.md](plan/PLAN.md).
- Measurement contract: [BENCHMARK.md](plan/BENCHMARK.md).
- Phase: [[PHASE-0002-Glass]].
- Existing runtime architecture: [ARCHITECTURE.md](../../ARCHITECTURE.md).
