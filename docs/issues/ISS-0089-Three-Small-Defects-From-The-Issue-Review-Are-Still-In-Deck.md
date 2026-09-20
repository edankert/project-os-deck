---
type: "[[issue]]"
id: ISS-0089
aliases: ["ISS-0089"]
title: "Three real defects found by the 2026-09-19 issue review are still in Deck, each small enough to fix with one test"
status: fixed
phase: []
owner: user:edwin
created: 2026-09-19
updated: 2026-09-20
source: ["The issue review of 2026-09-19 (project-os-dev FEAT-0036, TASK-0141)", "Edwin, 2026-09-19: 'Do all 5 steps in the suggested order'"]
reported_by: review
question: ""
severity: medium
component: "multiple"
parent: ""
related: []
tests: []
---

# Three small defects from the issue review are still in Deck

## Problem

On 2026-09-19 every open issue in this repo was checked against the code. Three are real, still present, and small: each is a few lines in one place, and a test can prove it. **This ticket is the work order for fixing them.** Each line links the issue that holds the evidence.

## How to work this ticket

1. **One issue at a time.** Read its note first. Its section headed "Checked against the code, 2026-09-19" gives the evidence and the fix.
2. **Make the fix, with a test that fails without it.** Run the test with the fix, then with the fix removed, and record both results in the issue note. A test that cannot fail does not count. A docs-only item needs no test.
3. **Close the issue.** Set it to `fixed`, and add a section saying what changed, which test guards it, and the commit.
4. **Tick the box below** and commit, naming the paths.
5. **If a fix turns out to be bigger than described**, or changes something Edwin should see first, do not force it. Note that in the issue, leave it open and move on.

## The Three

- [x] [[ISS-0085-Three-Rules-The-Feature-Added-Survive-Being-Broken-With-Every-Check-Still-Passing|ISS-0085]]: no test checks the outer field's default capacity of 64 notes (`description.ts:435`). Add the assertion to `descriptions.test.mjs`.
- [x] [[ISS-0080-The-Measurement-Prints-Its-Numbers-And-Keeps-Them-Nowhere|ISS-0080]]: the layout measurement prints its numbers and keeps them nowhere (`main.ts:570`). Write the JSON to a gitignored `measurements/` directory as well.
- [x] [[ISS-0075-The-Smoke-Run-Takes-The-Keyboard-Away-Twenty-Three-Times|ISS-0075]]: the smoke run takes the keyboard away 24 times, because `main.ts:1907` calls `app.focus({steal:true})`. Add a no-focus mode, and have `run-smoke.sh` hand over to `smoke-in-a-box.sh` on macOS.

This ticket closes when every box is ticked, or its issue says why it was left.

## Closed, 2026-09-20

All three boxes are ticked. Each issue is `fixed` and carries a section naming what changed, the test that guards it, and the result of running that test with the fix taken out. None of the three turned out bigger than described, so none was left open.

| issue | what was done | guarded by |
|---|---|---|
| ISS-0085 | `descriptions.test.mjs` asserts the band table's four capacity defaults on the `readBand` path | [[TST-0030-A-Description-Parses-Or-Says-Why-Not]] |
| ISS-0080 | `saveMeasurement` writes `measurements/<timestamp>.json` and `main.ts` prints the path last | [[TST-0057-The-Measurement-Is-Kept-In-A-File]] |
| ISS-0075 | `run-smoke.sh` hands over to `smoke-in-a-box.sh` on macOS; `--no-focus` and `--on-screen` name the two runs on the real screen | [[TST-0036-The-Smoke-Run-Opens-A-Workspace-Or-Says-What-It-Skipped]] |

Worked under [[TASK-0085-Fix-The-Three-Defects-The-Issue-Review-Left-In-Deck]]; the change note is [[CHG-20260920-The-Smoke-Run-Leaves-The-Keyboard-Alone]]. `npm test` passes 483 of 483 and `bash tools/scripts/validate-docs.sh` passes.
