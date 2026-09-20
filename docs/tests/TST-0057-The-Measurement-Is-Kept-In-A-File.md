---
type: "[[test]]"
id: TST-0057
aliases: ["TST-0057"]
title: "A measurement run writes its numbers to a file as well as printing them, so a trimmed terminal no longer costs the run"
status: active
owner: user:edwin
created: 2026-09-20
updated: 2026-09-20
source: ["[[ISS-0080-The-Measurement-Prints-Its-Numbers-And-Keeps-Them-Nowhere]]"]
phase: "[[PHASE-0002-Glass]]"
scope: system
level: unit
entrypoint: "desktop/tests/measure-out.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh measure-out"
covers: ["[[ISS-0080-The-Measurement-Prints-Its-Numbers-And-Keeps-Them-Nowhere]]"]
issues: ["[[ISS-0080-The-Measurement-Prints-Its-Numbers-And-Keeps-Them-Nowhere]]"]
tasks: ["[[TASK-0085-Fix-The-Three-Defects-The-Issue-Review-Left-In-Deck]]"]
artifacts: []
adequacy: "Taking the write out of saveMeasurement and leaving it returning the path fails three of the four checks, the first of them by name ('the measurement was printed and kept nowhere'). Overwriting one run with the next fails the two-files check, which is what makes the second-level timestamp load-bearing rather than decorative."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0002-Glass]]", "[[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]"]
---

# The measurement is kept in a file

## Purpose

`npm run measure` takes a person's screen for several minutes and needs Deck's window in front, so its output costs more than any other check's. Until 2026-09-20 it printed the numbers and saved them nowhere. On 2026-09-12 a run went through a `tail` that kept the last seventy lines, two of the three workspaces were lost, and the measurement had to be taken again ([[ISS-0080-The-Measurement-Prints-Its-Numbers-And-Keeps-Them-Nowhere]]). The write lives in `desktop/src/main/measure.ts` rather than in `main.ts`, which is what lets this suite drive it without Electron.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0057` reproduces it locally without writing anything.

## Procedure

- Save a measurement into a temporary directory and assert the file exists and parses back to exactly what was printed.
- Save into a directory that does not exist and assert it is created, because `measurements/` is in no clone and the first run is the one worth keeping.
- Assert the saved file ends in a newline, so `cat` and `tail` behave.
- Save twice with timestamps four minutes apart and assert two files, named `2026-09-20T14-03-05Z.json` and `2026-09-20T14-07-41Z.json`.
- Assert the name carries no colon, so it is one word to a shell.

## Expected results

- A measurement survives a trimmed pipe, a closed terminal and a scrollback limit.
- The run's last printed line is the path to the file, so it is the line a person keeps.
- Two runs on one day do not overwrite each other.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh measure-out`: 4 checks pass, 2026-09-20.
- With `saveMeasurement`'s write removed and the function left returning the path, the same command fails three of the four, the first saying "the measurement was printed and kept nowhere", 2026-09-20.

## Adequacy (who verifies this test?)

The first check is the defect's own shape: it asks the filesystem, not the function's return value, so a `saveMeasurement` that computes a path and writes nothing fails it. What this suite does not cover is `main.ts` calling it — that is one line at the end of the `--measure` branch, and nothing but a real measurement run exercises it. The directory `measurements/` is gitignored; a measurement quoted in a note carries its date and the machine it was taken on.
