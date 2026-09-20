---
type: "[[issue]]"
id: ISS-0080
aliases: ["ISS-0080"]
title: "A frame-rate measurement is lost if its terminal output is cut off, because the numbers are printed but never saved to a file"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: "2026-09-20"
source: ["Found while taking [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]'s measurement, 2026-09-12"]
reported_by: agent
severity: low
component: tests
parent: ""
related: ["[[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[PHASE-0002-Glass]]"]
tests: ["[[TST-0057-The-Measurement-Is-Kept-In-A-File]]"]
---

# The measurement's numbers are printed but never saved

## Problem

**The frame-rate measurement prints its numbers to the terminal and saves them nowhere, so a run whose output is cut off has to be taken again.** `runMeasure` ends with `console.log(JSON.stringify(...))` and writes no file. The measurement takes a person's screen for several minutes and needs the window in front, so its output is expensive in a way no other check's is — and it survives only as long as whatever was reading stdout. On 2026-09-12 the first run's output went through a `tail` that kept the last seventy lines, two of the three workspaces were lost, and the measurement had to be taken a second time. Five minutes of somebody's machine, for nothing.

## Expected

The run writes its JSON to a file as well as printing it, and says where. Then a trimmed pipe, a closed terminal or a scrollback limit costs nothing.

## Suggestion

One line beside the `console.log` in `desktop/src/main/main.ts`: write to `measurements/<ISO date>.json` under the repository, or to the path a `--measure-out` argument names, and print that path last so it is the line a person keeps. A directory of dated measurements is also what the phase's frame-time criterion wants to cite, instead of a number copied into a note with no run behind it.

## Evidence

- `desktop/src/main/main.ts`: `console.log(JSON.stringify({ measurements: results }, null, 2));` and nothing else.
- Found on 2026-09-12 while taking [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]'s numbers.

## Risk scan

No trigger applies: writing a file under the repository adds no dependency, env var or exposure. The path should be gitignored or deliberately committed, and which is a small decision worth making rather than defaulting into.

## Next Actions

- [x] Write the JSON to a dated file, print the path, and decide whether measurements are committed. Done 2026-09-20: written to `measurements/`, which is gitignored.

## Checked against the code, 2026-09-19: still true, kept

**What a user notices:** If the terminal output of a measurement is trimmed or closed, the numbers are gone, and several minutes of the person's screen have to be given up again.

Evidence: `desktop/src/main/main.ts:570` is still `console.log(JSON.stringify({ measurements: results }, null, 2));`, and `grep -n "writeFileSync" desktop/src/main/main.ts desktop/src/main/measure.ts` finds no write of the measurement (only a screenshot at `:947` and a test fixture at `:1772`).

**Belongs to:** PHASE-0002-Glass, no feature. Small fix: one write beside line 570, and a test that the file is written. **Next:** Write the JSON to a dated file under a gitignored `measurements/` directory and print its path last. Gitignored is an assumption; commit them instead if the phase criterion should cite them.

Checked as part of project-os-dev FEAT-0036 (TASK-0141).

## Fixed, 2026-09-20

**A measurement run now writes its numbers to `measurements/<timestamp>.json` under the repository and prints that path as its last line.** `saveMeasurement` in `desktop/src/main/measure.ts` makes the directory if it is not there, writes `{ measurements: [...] }` — the same object that is printed — and returns the path. `main.ts` calls it right after the `console.log` in the `--measure` branch, inside a `try`, so a write that fails says so and does not throw away numbers already on screen. `--measure-out <dir>` names a different directory.

**The directory is gitignored.** A measurement is a reading of one machine on one day, with whatever else was running on it; a note that quotes a number quotes its date and machine with it. `/measurements/` is anchored in `.gitignore` for the reason the inbox entry there gives.

**The test fails without the fix.** Taking the write out of `saveMeasurement` and leaving it returning the path fails three of the four checks in `desktop/tests/measure-out.test.mjs`, the first by name: "the measurement was printed and kept nowhere". With the write in place `bash tools/scripts/run-desktop-tests.sh measure-out` passes 4 of 4. Both runs were made on 2026-09-20.

**Not covered:** `main.ts` calling `saveMeasurement` is one line that only a real `npm run measure` exercises, and a measurement run takes Edwin's screen. The write itself is covered.

**Guarded by** [[TST-0057-The-Measurement-Is-Kept-In-A-File]] (`bash tools/scripts/run-desktop-tests.sh measure-out`). **Commit:** `c10932a`. **Worked under** [[TASK-0085-Fix-The-Three-Defects-The-Issue-Review-Left-In-Deck]].
