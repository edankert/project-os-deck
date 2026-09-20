---
type: "[[task]]"
id: TASK-0085
aliases: ["TASK-0085"]
title: "Fix the three defects the 2026-09-19 issue review left in Deck, each with a test that fails when the fix is taken out"
status: done
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-20
updated: 2026-09-20
source: ["[[ISS-0089-Three-Small-Defects-From-The-Issue-Review-Are-Still-In-Deck]]", "project-os-dev PHASE-0007 step 3"]
parent: "[[ISS-0089-Three-Small-Defects-From-The-Issue-Review-Are-Still-In-Deck]]"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[ISS-0085-Three-Rules-The-Feature-Added-Survive-Being-Broken-With-Every-Check-Still-Passing]]", "[[ISS-0080-The-Measurement-Prints-Its-Numbers-And-Keeps-Them-Nowhere]]", "[[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times]]"]
tests: ["[[TST-0030-A-Description-Parses-Or-Says-Why-Not]]", "[[TST-0036-The-Smoke-Run-Opens-A-Workspace-Or-Says-What-It-Skipped]]", "[[TST-0057-The-Measurement-Is-Kept-In-A-File]]"]
---

# Fix the three defects the issue review left in Deck

This task is the work behind [[ISS-0089-Three-Small-Defects-From-The-Issue-Review-Are-Still-In-Deck]], which is the work order. It sits in `docs/tasks/` rather than under a feature plan because none of the three issues belongs to a feature: two are phase-level (PHASE-0002) and the third adds a missing check to a feature that is already done.

## Definition of Done
- [x] The outer field's default capacity of 64 is asserted on the path a workspace's own view description takes, not only where the built-in views write the number out.
- [x] The frame-rate measurement writes its JSON to a file and prints the path, so a trimmed terminal no longer costs the run.
- [x] An ordinary `run-smoke.sh` on a Mac takes the keyboard from nobody, and the run says which mode it is in before the first window opens.
- [x] Each of the three has a test that fails when the fix is taken out, with both results recorded in the issue note.
- [x] `npm test` and `bash tools/scripts/validate-docs.sh` pass.

## Steps
- [x] ISS-0085: assert the band table's four defaults in `desktop/tests/descriptions.test.mjs`.
- [x] ISS-0080: add `saveMeasurement` to `desktop/src/main/measure.ts`, call it from `main.ts`, gitignore `/measurements/`, and check it in a new suite.
- [x] ISS-0075: add `focusPolicy` to `desktop/src/main/smoke-support.ts`, honour it in `focusApp`, and make `run-smoke.sh` hand over to `smoke-in-a-box.sh` on macOS.

## Notes

All three are fixed. None turned out bigger than the work order described, so nothing was left open.

`npm test` passes 483 of 483 (470 before this work, plus one in `descriptions`, four in `measure-out` and eight in `smoke-support`). `npm run typecheck` is clean and `bash tools/scripts/validate-docs.sh` passes.

The smoke checks themselves still have not been run: the handover reaches `smoke-in-a-box.sh` and stops at "docker is installed but no daemon is running", and starting Docker is Edwin's call. Nothing here needs them — no fix touches the renderer — but eleven renderer checks have been owed since 2026-09-17 and this does not pay them.

Each issue note carries the evidence, the fix, the guarding test and the commit. The change note is `docs/changes/CHG-20260920-The-Smoke-Run-Leaves-The-Keyboard-Alone.md`.
