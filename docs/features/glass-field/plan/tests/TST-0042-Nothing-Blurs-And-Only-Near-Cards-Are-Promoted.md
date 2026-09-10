---
type: "[[test]]"
id: TST-0042
aliases: ["TST-0042"]
title: "Nothing in the stylesheet blurs or puts a backdrop filter over the field, only near-band cards are promoted, and the containers let the pointer through"
status: active
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[TASK-0031-The-Field-Renders-And-Turns]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/glass-style.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh glass-style"
covers: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
issues: []
tasks: ["[[TASK-0031-The-Field-Renders-And-Turns]]"]
artifacts: []
adequacy: "Measured 2026-09-10 against the built stylesheet, two mutations and two killed. A blur on the field card fails 1. `will-change` on a pane fails 1. The containers’ pointer rule is checked by name, and the smoke run’s hit test is the check that the pointer actually lands."
mutation_score: "2 mutations, 2 killed (2026-09-10)"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[REFERENCE-DES-0002-REVIEW]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---
# Nothing blurs, and only near cards are promoted

## Purpose

The DES-0002 review measured the prototype's blur and found it came back as a backdrop filter over the moving field. Distance in Glass is fog and less detail, and this suite reads the built stylesheet, the one both hosts serve, to hold that. Comments are stripped first, because the comment explaining the rule names what it forbids.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh glass-style`.

## Expected results

- No rule sets `backdrop-filter`, and no `filter` uses `blur(`.
- `will-change` is set on `.field-card` and nothing else.
- `.field-card` is 186 by 92 pixels with its transform origin at the centre, which is `CARD_BOX`.
- The field's containers are `pointer-events: none`, and the cards and the panes' header and body take the pointer.

## Evidence

2026-09-10: 4 of 4 pass.

## Adequacy (who verifies this test?)

See `adequacy:` above.
