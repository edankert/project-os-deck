---
type: "[[issue]]"
id: ISS-0092
title: "The window smoke run in CI fails about half the time on one Glass check, a second press through a document that is still growing"
status: open
phase:
owner: unassigned
created: 2026-10-16
updated: 2026-10-16
source: ["CI deck-smoke runs on main, 2026-10-14 to 2026-10-16"]
reported_by: "agent:claude"
question: ""
severity: medium
component: "desktop/src/main/smoke-glass.ts"
parent: ""
related: ["[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
tests: []
tasks: ["[[TASK-0170]]", "[[TASK-0171]]", "[[TASK-0172]]"]
---

# The window smoke run in CI fails about half the time on one Glass check

## Problem

**The `deck-smoke` run on main goes red about half the time on one check, and the code under test has not changed between a red run and a green one.** Of the last twelve runs, six failed, and every failure names the same Glass check: a second press should meet the first note's document while that document is still growing over a row. A red smoke run that means nothing teaches people to ignore it, and hides a real failure behind the noise. The check is in `desktop/src/main/smoke-glass.ts`.

## Repro

Push to main and watch `deck-smoke`. Runs on the same code differ: `d296ebe` passed and `707b700`, which changed only overview files and notes, failed.

## Expected

The check either passes every time on code that works, or fails only when the press really misses the growing document.

## Actual

The check tries six times and reports, for each try, when the press arrived: "132 ms, beside the document by the time the press arrived; 204 ms, beside the document by the time the press arrived; 903 ms, the document never lay over the row; 177 ms, …; 646 ms, the document never lay over the row; 1075 ms, the document never lay over the row". It also reports "two rows were in reach" and, once, "a pinch zooms the field to 0.97×". On CI's machine the document's growth and the press do not line up within the window the check allows.

## Evidence

- Red runs on main: `707b700`, `65c6397`, `fd5120d`, `e049e7b`, `90cd432`, `6e9fed6`, `3533894`. Green: `d296ebe`, `0c6f772`, `5f8815b`, `c2050b8`, `7f53640` (`gh run list --workflow deck-smoke.yml`).
- The failing line in the log of `707b700`'s run: "FAILED smoke lan: document: a second press met the first note's document while it was growing over the row, so that it can be shown to go through it (…)".

**2026-10-16, a second cause found, by the note itself.** On `c4f1c70`, which filed this issue and changed nothing else, the smoke run also failed fourteen keyboard and lift checks. This issue is the only issue at triage, and two of the smoke's choices depend on what is at the top of the Issues view: the keyboard check's two presses of Down landed on a group heading, and the lift checks took this issue, which has almost no neighbours. [[TASK-0170]] makes both choices independent of what is at triage. It also shows the family this issue belongs to: checks that read the live corpus break when a note is added.

**2026-10-16, the corpus pinned.** At Edwin's choice the smoke run now reads its notes at a pinned commit ([[TASK-0171]]), and the checks that depended on the corpus pass. What still fails on CI (`1fd54a4`) is timing: this issue's document-growth check, and two checks that each failed on one host and passed on the other ("V on its header gives it back to Features alone" on loopback, "a surface switch each leave the focus" on the network).

**2026-10-16, accepted.** Edwin: "go ahead and fix the document-growth check and other possible timing checks as suggested" ([[TASK-0172]]).

## Next Actions

- [ ] Triage: decide whether the check should measure the document's position when the press lands (and wait for it to be over the row) rather than time the press against the growth.
- [ ] Until then, read a red `deck-smoke` by its failing line: this one is this issue, anything else is real.
