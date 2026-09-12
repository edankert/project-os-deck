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

## Extended 2026-09-12 by [[TASK-0075-The-Field-Draws-Four-Bands-And-States-Every-Remainder]]

Three checks were added to the same stylesheet suite, because they are the same kind of claim: a rule read off the built CSS rather than off the prose that explains it.

- **No rule hides a card's face line or owed verb by which band it is in.** This is [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]'s defect stated as a rule. Putting the old `[data-band="mid"]` selector back fails it.
- **Every level `desktop/src/shared/detail.ts` names has a rule, and they hide progressively less.** A level with no rule draws the same as the one below it, silently.
- **The `more` level draws something.** It is the level nothing has ever drawn, so without a rule the field would stop at `full` however far a person zoomed, and nothing else would say so.

