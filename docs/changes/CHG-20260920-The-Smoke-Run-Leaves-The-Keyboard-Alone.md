---
type: "[[change]]"
id: CHG-20260920-The-Smoke-Run-Leaves-The-Keyboard-Alone
aliases: ["CHG-20260920-The-Smoke-Run-Leaves-The-Keyboard-Alone"]
title: "The smoke run on a Mac leaves the keyboard alone, a measurement is kept in a file, and the outer field's default capacity is finally asserted"
status: merged
owner: user:edwin
created: 2026-09-20
updated: 2026-09-20
source: ["[[ISS-0089-Three-Small-Defects-From-The-Issue-Review-Are-Still-In-Deck]]", "project-os-dev PHASE-0007 step 3"]
commit: "90cac9b, c10932a, 4504e7b"
pr: ""
impacts: ["tools/scripts/run-smoke.sh", "desktop/src/main/smoke-support.ts", "desktop/src/main/main.ts", "desktop/src/main/measure.ts", "desktop/tests/smoke-support.test.mjs", "desktop/tests/measure-out.test.mjs", "desktop/tests/descriptions.test.mjs", ".gitignore", "docs/ARCHITECTURE.md"]
issues: ["[[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times]]", "[[ISS-0080-The-Measurement-Prints-Its-Numbers-And-Keeps-Them-Nowhere]]", "[[ISS-0085-Three-Rules-The-Feature-Added-Survive-Being-Broken-With-Every-Check-Still-Passing]]", "[[ISS-0089-Three-Small-Defects-From-The-Issue-Review-Are-Still-In-Deck]]"]
features: []
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0002-Glass]]", "[[TASK-0085-Fix-The-Three-Defects-The-Issue-Review-Left-In-Deck]]", "[[TST-0036-The-Smoke-Run-Opens-A-Workspace-Or-Says-What-It-Skipped]]", "[[TST-0057-The-Measurement-Is-Kept-In-A-File]]", "[[TST-0030-A-Description-Parses-Or-Says-Why-Not]]", "[[TST-0037-The-Renderer-Guards-Run-In-A-Real-Window]]", "[[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]]"]
---

# The smoke run leaves the keyboard alone

## Summary

**Running Deck's smoke checks on a Mac no longer takes the keyboard out of whatever you are typing in.** `bash tools/scripts/run-smoke.sh` hands the run to the Linux container instead, which has a screen of its own. Two other fixes ride along: a measurement run now keeps its numbers in a file, and the outer field's default capacity of 64 notes is asserted on the path a workspace's own view description takes. All three come from the 2026-09-19 issue review's work order.

## Impact

- No screen changed: all three are developer-facing. Deck itself draws exactly what it drew yesterday; what changed is what a command does to the machine it is run on, where a measurement's numbers end up, and which mistakes a test suite catches.

**What a person running the commands notices.**

- `bash tools/scripts/run-smoke.sh [loopback|lan|both]` on macOS now prints one line naming its mode and then runs in the container (`tools/scripts/smoke-in-a-box.sh`). It needs a Docker daemon, and exits 127 saying so when there is none — the same "environment gap" exit the runner already used for a missing Electron binary. Before this, the run opened windows on the real screen and brought Deck to the front about two dozen times; four consecutive runs of the same code gave four different failure sets depending on whether Edwin was typing.
- `--on-screen` is the old behaviour, by name: it runs here and says "it WILL take the keyboard about two dozen times".
- `--no-focus` runs here and takes nothing: windows are shown without being activated, pointer checks still run, and the checks that assert `document.hasFocus()` fail. The printed line says that before the run starts.
- `DECK_SMOKE_PLAN=1` prints the mode line and stops, which is how a person — or a test — asks what a command would do.
- Linux and CI are unchanged. There the `xvfb-run` re-exec already gave the run a screen of its own.
- `npm run measure` writes `measurements/<timestamp>.json` under the repository as well as printing the JSON, and prints that path as its last line. `--measure-out <dir>` names another directory. `/measurements/` is gitignored: a measurement is a reading of one machine on one day, so a note that quotes a number quotes its date and machine with it.

## What changed underneath

`focusPolicy` in `desktop/src/main/smoke-support.ts` decides whether a run may take the keyboard, beside the other decisions the smoke run makes about itself, so it can be driven without Electron. `focusApp` in `main.ts` consults it and calls `showInactive()` instead of `app.focus({ steal: true })` when the answer is no. `run-smoke.sh` makes the mode decision before anything opens and exports `DECK_SMOKE_NO_FOCUS=1` to pass it on. `saveMeasurement` in `measure.ts` writes the measurement; `main.ts` calls it inside a `try`, so a failed write cannot throw away numbers already printed.

The 24 `focusApp` calls are still 24 calls, and no smoke step is tagged by whether it needs the keyboard. Both were in ISS-0075's plan and neither is needed for the report it was filed on: inside the container there is no other application to take focus from.

## Documentation Coverage (All Types Considered)

- features: not-applicable
- requirements: not-applicable
- tasks: new ([[TASK-0085-Fix-The-Three-Defects-The-Issue-Review-Left-In-Deck]])
- issues: updated (ISS-0075, ISS-0080, ISS-0085 fixed; ISS-0089 closed)
- tests: new ([[TST-0057-The-Measurement-Is-Kept-In-A-File]]); updated (TST-0030, TST-0036, TST-0037)
- workflows: not-applicable — `run-smoke.sh` is documented in `docs/ARCHITECTURE.md`, which is updated, and carries no `WF-*` note
- decisions: not-applicable — no ADR; the container was already decided in TASK-0081
- risks: not-applicable, and the scan is below
- changes: new (this note)
- snapshot: updated

## Risk scan

One trigger applies: a front-door command gained modes, and the mode differs by platform. The hazard is a keyboard check quietly ceasing to run. It does not apply to CI, which is Linux and reaches the same branch it always did, and the five runner checks in `desktop/tests/smoke-support.test.mjs` assert that Linux is not diverted. Locally the cost is visible rather than silent: with no Docker daemon the command exits 127 and says why.

No other trigger applies: no dependency, no environment variable that is required (`DECK_SMOKE_NO_FOCUS` and `DECK_SMOKE_PLAN` are both optional), no credential, no licence, and no runtime increase. Docker was already a dependency of `smoke-in-a-box.sh`; what changed is that the default path on macOS now reaches it.

## Follow-ups
- [ ] Run the smoke checks in the container once the Docker daemon is up. They have not been run since 2026-09-17, and eleven renderer checks have never been executed (FEAT-0018's own note says so).
- [ ] ISS-0075's steps 1, 2 and 4 stay unbuilt and are recorded in its note: tag the steps that need the keyboard, take focus once per suite rather than 24 times, and the offscreen spike.
