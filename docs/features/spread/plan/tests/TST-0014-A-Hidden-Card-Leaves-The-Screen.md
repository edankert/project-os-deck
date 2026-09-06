---
type: "[[test]]"
id: TST-0014
aliases: ["TST-0014"]
title: "A card the pool has hidden leaves the screen, and no stylesheet rule can put it back"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[ISS-0001-Cards-From-The-Previous-View-Stay-On-Screen]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/render.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh render"
covers: ["[[ISS-0001-Cards-From-The-Previous-View-Stay-On-Screen]]"]
issues: ["[[ISS-0001-Cards-From-The-Previous-View-Stay-On-Screen]]"]
tasks: []
artifacts: []
adequacy: "Removing the rule makes this suite fail on its first assertion, and makes the smoke run report 1 card marked and 30 on screen — which is the defect as Edwin saw it."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]", "[[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]]"]
---

# A hidden card leaves the screen

## Purpose

Guards [[ISS-0001-Cards-From-The-Previous-View-Stay-On-Screen]]. The card pool marks a spare card with the `hidden` attribute, and an author rule that sets `display` beats the browser's own rule for hidden elements. So the renderer can be entirely right about which cards belong to the view and still show the previous view underneath it.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0014` reproduces it locally without writing anything.

## Procedure

- Parse the built stylesheet into rules, with comments stripped, so what is read is the rules and not the prose about them.
- Assert some rule matches `[hidden]` and sets `display: none !important`.
- Assert no other rule sets `display` with `!important`, since one would outrank the guard.
- Assert the card rule still sets `display`, which is what makes the guard necessary and says so where somebody would otherwise remove it.

## Expected results

- A hidden element is displayed by nothing.
- The collision that caused the defect is documented by a failing test rather than by a comment alone.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh render`: 4 checks, all passing on 2026-09-06.
- The behavioural half is the smoke run, which counts what the browser displays rather than what the DOM is marked as: `every card the pool hid left the screen` and `the screen shows what the view says it has`.

## Adequacy (who verifies this test?)

Verified by removing the fix on 2026-09-06. This suite fails on `a hidden element is displayed by nothing`. The smoke run fails with `1 marked, 30 shown` and `says 1, shows 30`, which is the defect exactly as it was reported. Restoring the rule turns both green.
