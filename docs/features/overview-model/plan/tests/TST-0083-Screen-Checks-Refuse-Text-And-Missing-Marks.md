---
type: "[[test]]"
id: TST-0083
title: "Screen checks refuse text and missing marks"
status: active
owner: system:codex
created: 2026-10-14
updated: 2026-10-15
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
phase: "[[PHASE-0005-Overview]]"
scope: feature
level: unit
entrypoint: "desktop/tests/overview-checks.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh overview-checks"
covers: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
issues: []
tasks: ["[[TASK-0144]]", "[[TASK-0118-Check-Every-Screen-As-Data]]"]
artifacts: []
adequacy: "Independent defective scenes exercise each refusal. Boundary cases at 60 and 61 words catch off-by-one errors; identifier cases prevent treating phase numbers as counts."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[PHASE-0005-Overview]]"]
---

# Screen checks refuse text and missing marks

## Purpose

The scene checks enforce PHASE-0005’s word, number, address and list-twin rules without opening a screen.

The test holds no verdict in its status. Its command builds the modules and runs the node suite.

## Procedure

- Check a good scene and a deliberately text-heavy scene.
- Introduce count text without a count mark, a broken address, a missing ticket row and a mismatched action.
- Exercise registered page/flow addresses including dotted test-run steps, ticket IDs and phase-number exceptions.

## Expected results

- The good scene passes all four rules and each deliberate defect fails its own rule.
- Panel row and note text is exempt, while 61 words outside a panel still fail. Folded panel rows and custom ticket ids still require list twins.
- Only text shown at rest counts toward 60 words; ticket IDs do not count.
- Count references resolve and the list twin preserves ticket IDs and actions.

## Evidence

2026-10-15: 17 scene-check tests pass. Removing the panel row twin guard fails the new regression.

2026-10-14: the `overview-checks` suite passed 15 tests, with no failures or skips, in `cd desktop && npm test`. The full run passed all 737 tests. TASK-0140 records the first-review repairs; FEAT-0026 remains at review for Claude.

## Adequacy

The numeric-name regression fails without the new guard. It covers bare, padded, grouped, fractional and signed counts, ratios, percentages, scientific notation, spaced abbreviations and hexadecimal, octal and binary literals. Both rest and hover text are checked. Real names retain their digits.

The original five regressions failed before repair: multiple counts in one text, padded counts in labels, addresses naming another screen, prose disguised as id text and capitalised dashed words excluded from the word budget.

Independent defective scenes exercise each refusal. Boundary cases at 60 and 61 words catch off-by-one errors; identifier cases prevent treating phase numbers as counts.
