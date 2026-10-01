---
type: "[[task]]"
id: "TASK-0089"
title: "Give every note a stable place and a route into view without population caps"
status: "done"
phase: "[[PHASE-0002-Glass]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
parent: "[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"
effort: "L"
due: ""
depends: ["[[TASK-0087-Export-Representative-Workspaces-For-Both-Renderers]]", "[[TASK-0088-Boot-An-Isolated-Native-Glass-Executable]]"]
blocks: ["[[TASK-0090-Draw-Readable-Cards-With-A-Native-Renderer]]"]
related: ["[[RISK-0005-A-Native-Prototype-Wins-By-Doing-Less-Work]]", "[[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]]"]
tests: ["[[TST-0062-The-Native-Scene-Keeps-Every-Note-Reachable]]"]
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-10-01"
---

# Give every valid note a stable and reachable position

## Outcome and ownership

The native scene contains every valid selected note, including notes beyond today's capacities. This task owns fixture decoding, scene identity, stable allocation, camera mathematics and spatial lookup. These modules remain independent of graphics API types.

## Definition of Done

- [x] The scene accounts for all records in required fixtures and assigns one base placement to every valid selected note, without a fixed population cap. The exploratory 50,000-note result is reported separately. See [[TST-0062-The-Native-Scene-Keeps-Every-Note-Reachable]].
- [x] Priority bands preserve their intended meaning. Overflow grows stable rows or sections; finished work does not become active because space ran out. The full-fixture audit checks each placement's band and reaches every overflow row; see [[TST-0062-The-Native-Scene-Keeps-Every-Note-Reachable]].
- [x] Repeated loading of the same fixture reproduces its initial allocation. Adding/removing one note does not redistribute surviving notes. Scene and real-window reload checks are recorded in [[TST-0062-The-Native-Scene-Keeps-Every-Note-Reachable]] and [[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]].
- [x] Camera motion, drawing detail, hover and reader opening never mutate base positions. Switching views and back restores the session's map. Camera, hover, reader and view-return checks are in [[TST-0062-The-Native-Scene-Keeps-Every-Note-Reachable]].
- [x] Locate-by-identity can bring any note into view. Search results distinguish duplicate displayed IDs by workspace/path. The all-key audit and duplicate-ID command test are in [[TST-0062-The-Native-Scene-Keeps-Every-Note-Reachable]]; the OS-delivered search walk is in [[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]].
- [x] Drawing and hit testing use the same transforms, clipping rules and front-to-back order, with deterministic tie-breaking. The camera inverse, forced overlap, reader pane and toolbar clipping checks are in [[TST-0062-The-Native-Scene-Keeps-Every-Note-Reachable]].
- [x] Scene counters expose selected, rejected, placed, visible and interactable populations for later measurement. `--headless-check` prints the starting counters; final window metrics and uncapped frame samples retain the corresponding population data. A valid loaded fixture has zero rejected records; invalid fixtures fail before a scene exists.

## Steps

1. Complete TASK-0087 and TASK-0088, then validate the fixture at load time with actionable diagnostics.
2. Allocate stable per-view slots keyed by canonical identity. Keep deliberate priority changes and session pulls separate from base allocation.
3. Implement turn, pan and zoom transforms with inverse coordinate mapping and finite numeric bounds.
4. Implement a spatial index or equivalent bounded lookup to select visible/hit candidates. Retain offscreen records in the scene.
5. Implement locate and deterministic keyboard traversal commands before wiring actual input in TASK-0091.
6. Expose state snapshots for tests and metrics without reading back GPU state. Provide a documented fixture-update route for adding/removing synthetic notes during the real-window walk and benchmark; a fresh process alone cannot prove surviving session positions stayed fixed.

## Verification and stop conditions

Author and link the task-specific executable or manual test notes when their commands or procedure exist, before closing this task. The acceptance walk and final evidence audit are feature-level context; later tasks’ reports are not prerequisites for this task’s own verification.

Add executable checks for full population reconciliation, identity collisions, deterministic allocation, stable insertion/removal, view restoration, camera round trips and overlapping hit-test order. Run them across the required functional and acceptance fixtures. The exploratory 50,000-note case may record an explicit limit or failure; it must report the reached population and never hide omissions. Deliberately omit a record and perturb a hit-test transform to show the corresponding checks fail.

Stop if growing a band creates positions that locate cannot make visible or if a numeric limit silently truncates a dataset. Report the failing identity and fixture. Do not count unreachable placements as success. TASK-0090 may optimize drawing work but cannot lower the scene's population to meet its budget.

## Notes

The behavioral contract is [PLAN.md](../PLAN.md), “Scene and interaction contract.” Performance thresholds remain in [BENCHMARK.md](../BENCHMARK.md). The scene is in-memory; production desk persistence and source writes are outside this task.

The earlier release binary, SHA-256 `9081c6aa85649a8fb1c8e80a25aee99f44cd558c4cc4139a9c2a8a671338f29e`, headlessly allocated 3,174 of 3,174 frozen real all-notes records, 10,000 of 10,000 generated records and 50,000 of 50,000 exploratory records. The follow-up [[TST-0062-The-Native-Scene-Keeps-Every-Note-Reachable]] audit checked every key's locate, visibility, center hit, camera inverse and unchanged priority band on all three fixtures. The overlap, clipping, view-return, camera/reader stability, counter and reload routes pass focused native checks; the existing [[TST-0058-Every-Note-Can-Be-Reached-In-The-Native-Prototype]] records a prior OS-delivered 200→201→200 reload walk with unchanged survivor pixels. These correctness checks are not drawing performance results. The current release build additionally prints selected, rejected, placed, visible and interactable counts in its headless output.

The 2026-10-01 close-out ran all 71 Rust tests, all 483 Deck tests and the prototype-tool suite (97 passed, six skipped), with no failures. The existing RISK-0005 covers the chance of overclaiming an uncapped result as a fair speed comparison; this task added no new external dependency or write route. Full visual parity and scored timing remain under TASK-0094 and TASK-0092.
