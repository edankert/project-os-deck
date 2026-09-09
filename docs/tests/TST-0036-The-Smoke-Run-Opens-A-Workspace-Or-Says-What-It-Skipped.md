---
type: "[[test]]"
id: TST-0036
aliases: ["TST-0036"]
title: "The smoke run opens a workspace by default, and a run that skipped checks is not a run that passed"
status: active
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["[[ISS-0022-The-Smoke-Run-Says-A-Popped-Out-Desk-Never-Draws-A-Card]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: unit
entrypoint: "desktop/tests/smoke-support.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh smoke-support"
covers: ["[[ISS-0022-The-Smoke-Run-Says-A-Popped-Out-Desk-Never-Draws-A-Card]]"]
issues: ["[[ISS-0022-The-Smoke-Run-Says-A-Popped-Out-Desk-Never-Draws-A-Card]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
tasks: []
artifacts: []
adequacy: "Making the default path one directory shallower or deeper fails the first check, because it asserts the default is a real project-os workspace and not merely a string. Letting a skipped check count as a pass fails the fourth, which is the defect's own shape."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
---

# The smoke run opens a workspace, or says what it skipped

## Purpose

The smoke run is the only thing that drives Deck's renderer, and until now nothing checked the smoke run. On 2026-09-08 it reported that a popped-out desk window drew no cards and that a card put on that desk never arrived. The window was fine. What had happened is that `npm run smoke` carried no `--workspace`, opened none, and ran the panel checks against a workspace that did not exist ([[ISS-0022-The-Smoke-Run-Says-A-Popped-Out-Desk-Never-Draws-A-Card]]). This suite checks the two decisions that allowed it, both of which now live in a module that loads without Electron.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0036` reproduces it locally without writing anything.

## Procedure

- Compute the default workspace from where the BUILT module sits, which is what the smoke run passes, and assert the result is a real project-os workspace rather than merely a path that parses.
- Assert the default is the repository above `desktop/`, so a drift of one directory is caught by name.
- Assert a run with no failures and nothing skipped is ok.
- Assert a failure is not ok.
- Assert a SKIPPED check is not ok either, and that the verdict carries what was skipped.

## Expected results

- `npm run smoke` and the documented `electron . --smoke --workspace <path>` run the same checks.
- A run that could not check half of Deck says which half, and does not report success.

## Evidence (fill after running)

- `bash tools/scripts/run-desktop-tests.sh smoke-support`: 4 checks pass, 2026-09-09.
- `npm run smoke` with no flags: `ok: true`, no failures, nothing skipped, 2026-09-09.

## Adequacy (who verifies this test?)

The first check is the one that resists a plausible-looking mistake: it does not compare the default against a string, it opens it and asks whether it is a workspace, so a wrong number of `..` steps fails rather than passing against an equally wrong expectation. The fourth check is the defect's own shape written as a rule — a partial run is not a pass — and it fails the moment somebody makes `ok` depend on failures alone again.

**What this does not cover.** The smoke run itself still needs Electron and is still not in CI ([[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]). This suite checks the part of it that can be checked without one, which is the part that was wrong.
