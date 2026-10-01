---
type: "[[task]]"
id: TASK-0105
title: "Remove the native Glass evaluation from the tree"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Edwin 2026-10-01: 'This is in the electron application, discard the rust solution also started in this project.'"]
parent: "[[FEAT-0019-Native-Glass-Is-Measured-Without-Population-Caps]]"
effort: small
due: ""
depends: []
blocks: []
related: ["[[RISK-0005-A-Native-Prototype-Wins-By-Doing-Less-Work]]", "[[RISK-0006-Native-Rendering-Leaves-Decks-Reader-And-Tablet-Behind]]", "[[FEAT-0020-Collections-And-Full-Notes-Live-On-Glass]]"]
tests: []
verification_waiver: "Removal only: no behaviour is added. Verified by the TypeScript build and the full node suite passing after the removal, recorded under Verification."
waiver_expires: 2026-10-31
---

# Remove the native Glass evaluation from the tree

Edwin dropped the Rust renderer experiment on 2026-10-01. Glass is delivered in the existing Electron application. This task takes the experiment out of the repository and closes its notes.

## Definition of Done

- [x] `prototypes/native-glass/` is no longer in the working tree. It was never committed, so it is moved to the macOS Trash rather than deleted, and can be put back until the Trash is emptied. — `~/.Trash/project-os-deck-prototypes-native-glass-2026-10-01/native-glass`; `ls prototypes` reports no such directory.
- [x] The Electron application no longer carries the code that existed only to replay the Rust prototype's fixtures and traces: `--measure-fixture`, `desktop/src/main/measure-fixture.ts`, `desktop/src/renderer/fixture-trace.ts` and the three hooks they used in the renderer. — `rg -n 'fixture|native' desktop/src/main/main.ts desktop/src/renderer/renderer.ts desktop/src/renderer/glass.ts desktop/package.json .gitignore` finds nothing.
- [x] FEAT-0019 and its nine earlier tasks are `cancelled`, its tests are `retired` and RISK-0005 and RISK-0006 are `closed`. — each note carries a dated section with the reason. Two departures from the plan: TASK-0087 and TASK-0089 had been `done` and are `cancelled` too, because the tests that verified them are retired with the prototype; and TST-0059, which was never run, rests at `ready` because the validator rejects a retired manual test with no run date.
- [x] Notes that describe the evaluation as work in progress say it was dropped. — PHASE-0002 (scope paragraph and its exit criterion, marked cut), `docs/PHASES.md`, TASK-0099 and the snapshot's focus note.
- [x] The build and every node suite pass. — see Verification.

## Steps

1. Move `prototypes/` to the Trash.
2. Remove the fixture diagnostic from `desktop/` and the two ignore rules for the prototype's build output.
3. Set the statuses above and correct PHASE-0002, `docs/PHASES.md` and the snapshot's focus note.
4. Write the change note.

## Notes

The removed Electron code is in commit `becb1e7` if it is ever wanted. The re-recorded test fixtures under `desktop/fixtures/` and the owed-surge cases in `field.test.mjs` and `band-and-face.test.mjs` stay: they test the Electron application and do not depend on the prototype. `measureTurn`'s optional per-frame record also stays, because TASK-0099 needs per-frame intervals to report stalls.

## Verification

2026-10-01, after the removal: `cd desktop && npm test` built both TypeScript projects and ran 483 tests, 483 passing, 0 failing. One of them had been failing before this task for an unrelated reason and was fixed here: `evaluator.test.mjs` counted nineteen features in this repository, and the plan of 2026-10-01 had added four.

Compared with the commit before the evaluation's code was first committed (`292a7da`), `desktop/src` now differs only in `measureTurn`'s optional per-frame record in `glass.ts`.
