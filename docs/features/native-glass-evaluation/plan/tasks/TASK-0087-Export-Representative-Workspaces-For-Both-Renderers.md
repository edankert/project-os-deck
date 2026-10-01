---
type: "[[task]]"
id: "TASK-0087"
title: "Export complete workspace fixtures and deterministic larger datasets"
status: "done"
phase: "[[PHASE-0002-Glass]]"
source: ["[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"]
parent: "[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"
effort: "M"
due: ""
depends: ["[[TASK-0086-Define-The-Native-Glass-Experiment-And-Baseline]]"]
blocks: ["[[TASK-0089-Give-Every-Note-A-Stable-Reachable-Place]]", "[[TASK-0092-Measure-Native-Glass-Against-The-Current-Deck]]"]
related: ["[[RISK-0005-A-Native-Prototype-Wins-By-Doing-Less-Work]]"]
tests: ["[[TST-0060-The-Native-Glass-Fixtures-Reconcile-And-Regenerate]]"]
owner: "user:edwin"
created: "2026-09-28"
updated: "2026-09-29"
---

# Export complete, representative inputs for the experiment

## Outcome and ownership

Both renderers receive traceable inputs with the same identities and realistic note content. This task owns the proposed prototype `tools/` exporter and generator, fixture schema, manifests and the minimal current-renderer fixture adapter.

## Definition of Done

- [x] A versioned fixture schema records workspace identity, relative path, displayed note ID, title, properties, status, priority, resolved view membership/order/groups, links and representative bodies. Evidence: `tools/fixture.mjs`, `tools/audit-fixture.mjs` and [[TST-0060-The-Native-Glass-Fixtures-Reconcile-And-Regenerate]].
- [x] The exporter consumes Deck's resolved data rather than reimplementing the view-description evaluator. Exported identity is workspace plus relative path, so duplicate displayed IDs remain distinct. Evidence: the `fieldEntries`/`bandOf` export path and four duplicate displayed IDs verified by [[TST-0060-The-Native-Glass-Fixtures-Reconcile-And-Regenerate]].
- [x] Every selected source record is accounted for as exported or explicitly rejected with a reason. Invalid input is reported, never silently omitted. Evidence: the exporter refuses unreadable notes, selected records without bodies and duplicate selected paths; the auditor checked 3,174/3,174 frozen all-notes bodies and the exact non-template source set in [[TST-0060-The-Native-Glass-Fixtures-Reconcile-And-Regenerate]].
- [x] Frozen real-workspace fixtures and deterministic generated fixtures meet the workload definitions in [BENCHMARK.md](../BENCHMARK.md). Evidence: Deck, cockpit and frozen Your Trainer all-notes, Features and Issues exports; 200/10,000/50,000 generated fixtures; native headless placement and the retained profile/hash checks in [[TST-0060-The-Native-Glass-Fixtures-Reconcile-And-Regenerate]].
- [x] Generated content includes realistic body lengths, links, long titles, Unicode, right-to-left text and a densely populated quiet band. Population growth preserves a reproducible seed. Evidence: the 10,000-note `r2` fixture has 2,000 quiet notes, 910 non-ASCII and 167 Arabic titles, a 142-character longest title, 24,080-byte longest body and seed 190028; [[TST-0060-The-Native-Glass-Fixtures-Reconcile-And-Regenerate]] verifies its profile and regeneration.
- [x] A small shareable fixture is committed. Private exports and raw source bodies stay in the proposed ignored `prototypes/native-glass/local/` directory. Evidence: `prototypes/native-glass/fixtures/small-200.json`, `.gitignore` and the local paths in [[TST-0060-The-Native-Glass-Fixtures-Reconcile-And-Regenerate]].
- [x] Manifest hashes, source revision, export version, generation seed and population counts allow a run to identify its exact input. Evidence: the fixture manifests, runner provenance and independent byte-identical regenerations in [[TST-0060-The-Native-Glass-Fixtures-Reconcile-And-Regenerate]].

## Steps

1. Complete TASK-0086's contract. Describe the schema before either consumer depends on it.
2. Implement read-only export through Deck's existing data contracts. Add an adapter only where needed to feed frozen input through the real current renderer.
3. Capture all selected records, with a reconciliation count before and after validation. Preserve the view's meaning while allowing the candidate renderer to place all records.
4. Generate larger deterministic datasets by preserving content and relationship distributions. Avoid a repeated single short label as the main stress fixture.
5. Provide a manifest-listed set of notes for the acceptance walk: active, quiet, distant, long-body, linked, duplicate-display-ID and Unicode examples.
6. Record source workspace hashes or status before and after export. Document storage and clean rebuild of public fixtures in the prototype README once it exists.

## Verification and stop conditions

Author and link the task-specific executable or manual test notes when their commands or procedure exist, before closing this task. The acceptance walk and final evidence audit are feature-level context; later tasks’ reports are not prerequisites for this task’s own verification.

Add focused executable checks for record accounting, duplicate identity, invalid schema input, reproducibility and preserved resolved view data when the exporter exists. Demonstrate that deleting an exported record without adjusting its manifest or merging duplicate displayed IDs fails the relevant check. Confirm the source workspace remains unchanged.

Do not proceed to scored runs if native and current input differ without an explicit comparison label. A production population cap belongs in the measured control; it must not shrink the source fixture or disguise missing native records. Report unsupported Markdown and unresolved links instead of inventing content.

## Notes

The exporter and generator are under `prototypes/native-glass/tools/`. The latest frozen Your Trainer all-notes export selects 3,174 notes; earlier live exports remain under separate hashes. The 200-note committed fixture and 10,000/50,000-note local generated fixtures have fixed seeds and complete bodies. The actual production Glass fixture adapter reconciles selected, placed and omitted counts; a generated source workspace materializes all 10,000 bodies and passes Deck's note-index walk. Source-tree hashes are checked before and after diagnostic runs. [[TST-0060-The-Native-Glass-Fixtures-Reconcile-And-Regenerate]] records the passing accounting, reproducibility and source-immutability verification for this task.

`tools/audit-fixture.mjs` reconciles every fixture's selected count, unique canonical keys, body bytes, selected links and band distribution. Against the frozen Your Trainer source it verified all 3,174 all-notes bodies and all 319 Features and 519 Issues bodies; the all-notes selection exactly equals the non-template indexed records. The previous 10,000/50,000-note generated files referenced a profile hash without a retained input file. New ignored `generated-10000-frozen-r2.json` and `generated-50000-frozen-r2.json` use the retained frozen real export as their profile; each regenerated to a separate file with an identical byte hash. The old files and their diagnostics remain under their original hashes. New matched subsets, traces, a 10,000-body materialized workspace and matrix `run-matrix-20260929-frozen-r6.json` refer to the new files with zero missing inputs. The task-specific passing test documents the source-immutability and export accounting audit; TASK-0092 still owns scored measurement.

The native headless loader placed 10,000/10,000, 50,000/50,000 and 2,116/2,116 notes from the new files. A five-second production diagnostic on the new generated workspace kept 10,000 selected and 2,116 placed, then opened a real 5,887-character article. Four of its 299 actions were more than 100 ms late, so it is ineligible for matched timing and remains diagnostic. Matrix r6 gives the generated native subset no source root and names the materialized workspace only for the production reader; r5 incorrectly applied that source root to both and remains a draft.

Two fresh cockpit exports selected the same 1,727 all-notes, 159 Features and 315 Issues records with identical content, navigation, source-tree and revision hashes. The exporter checked source Git status, dirty diff and every indexed Markdown file before and after each export. It now refuses output inside the source note tree and refuses overwriting an existing fixture. The source audit reports unresolved links and embed/HTML markers without pretending they were rendered; its syntax counts are not a complete Markdown audit.
