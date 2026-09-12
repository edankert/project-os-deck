---
type: "[[issue]]"
id: ISS-0080
aliases: ["ISS-0080"]
title: "The measurement prints its numbers to stdout and writes them nowhere, so a run whose output is trimmed is a run that has to be taken again on somebody's screen"
status: triage
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["Found while taking [[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]'s measurement, 2026-09-12"]
severity: low
component: tests
parent: ""
related: ["[[TASK-0079-The-Field-Is-Measured-Again-On-All-Three-Workspaces]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[PHASE-0002-Glass]]"]
tests: []
---

# The measurement prints its numbers and keeps them nowhere

## Problem

**`runMeasure` ends with `console.log(JSON.stringify(...))` and writes no file.** The measurement takes a person's screen for several minutes and needs the window in front, so its output is expensive in a way no other check's is — and it survives only as long as whatever was reading stdout. On 2026-09-12 the first run's output went through a `tail` that kept the last seventy lines, two of the three workspaces were lost, and the measurement had to be taken a second time. Five minutes of somebody's machine, for nothing.

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

- [ ] Write the JSON to a dated file, print the path, and decide whether measurements are committed.
