---
type: "[[test]]"
id: TST-0002
aliases: ["TST-0002"]
title: "The store broadcasts to every window and survives a restart, including a corrupt state file"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0003-One-Store-In-The-Main-Process]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/store.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh store"
covers: ["[[FEAT-0003-One-Store-In-The-Main-Process]]"]
issues: []
tasks: []
artifacts: []
adequacy: "Reverting the atomic write to a plain `writeFileSync` fails the interruption case; removing the shape validation fails the wrong-shape case."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
---

# The store broadcasts to every window and survives a restart

## Purpose

The state lives once and every window sees it change. This suite tests the reducer as a pure function and the persistence as a file, without opening a window.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0002` reproduces it locally without writing anything.

## Procedure

- Apply each action to the reducer and assert the resulting state.
- Subscribe several fake windows, dispatch, and assert every subscriber received the new state exactly once.
- Close a subscriber and assert it is dropped rather than written to.
- Write the state, read it back and assert it round-trips.
- Corrupt the state file three ways — empty, truncated JSON, and valid JSON of the wrong shape — and assert each yields defaults rather than a throw.
- Assert the write is atomic by checking no partial file is left when the write is interrupted.

## Expected results

- The reducer is pure: the same state and action give the same result, and the input state is not mutated.
- Every live subscriber receives every change, and a closed one receives none.
- A bad state file leaves Deck starting from defaults, with the reason available.

## Evidence (fill after running)

- `bash tools/scripts/run-desktop-tests.sh store`, run from the repository root.

## Adequacy (who verifies this test?)

Reverting the atomic write to a plain `writeFileSync` fails the interruption case; removing the shape validation fails the wrong-shape case.
