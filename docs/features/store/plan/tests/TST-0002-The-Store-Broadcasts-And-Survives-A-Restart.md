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

## Evidence

- `bash tools/scripts/run-desktop-tests.sh store`: 12 checks, all passing on 2026-09-06.
- In the running application: a note focused in the main process moved the HIGHLIGHTED CARD in a second window, and closing a desk in one window took the other window from one card to thirty. Both are read from the page, not from the state the page holds. **The first version of this check read `window.__deckLastState`**, which passed while the cards never moved; the independent review caught it, and the defect it was hiding — the repaint was missing from the subscription — is fixed.
- The state file round-tripped through a real restart of the smoke run before that run was given a state directory of its own.

## Adequacy (who verifies this test?)

Verified by mutation on 2026-09-06. Removing the try/catch around a subscriber's first paint makes "one window that throws while rendering does not stop the others" fail. Weakening the field-level normalisation (`str` returning the raw value) makes "a damaged state file leaves Deck starting from defaults" fail. One mutation was NOT caught: deleting the early `typeof value !== 'object'` return in `normaliseState`. That guard turns out to be redundant, because the field-by-field normalisation already yields defaults for a number or an array, and that path is guarded.
