---
type: "[[test]]"
id: TST-0040
aliases: ["TST-0040"]
title: "The field deals every view into three bands: owed in front and never moved by a hand, the view in the middle, finished work behind, over the real payloads"
status: active
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[TASK-0029-The-Band-Function]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/field.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh field"
covers: ["[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]", "[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]"]
issues: []
tasks: ["[[TASK-0029-The-Band-Function]]", "[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0053-Pull-Forward-And-Push-Behind]]"]
artifacts: []
adequacy: "Measured 2026-09-10 against the built modules, five mutations and five killed. Making the owed row need a held note fails 5. Sending a pushed note to the front fails 2. Ordering the front band without the neighbourhood first fails 1. Dealing the sidecar’s double listing twice fails 1. A push refusal that never refuses fails 1."
mutation_score: "5 mutations, 5 killed (2026-09-10)"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0032-Band-And-Face-Follow-The-Description-And-The-Vocabularies-Match-The-Cockpit]]", "[[DES-0002-The-Glass-Cockpit]]"]
---
# The field deals every view into three bands

## Purpose

The field shows what needs a person in front, the view's own notes in the middle, and finished work behind. This suite checks the deal that decides it, `desktop/src/shared/field.ts`, over the navigation payloads recorded from this repository and from Your Trainer, which is where the front band overflows in the normal case. [[TST-0032-Band-And-Face-Follow-The-Description-And-The-Vocabularies-Match-The-Cockpit]] checks the band table itself; this one checks Glass's use of it, with the desk's and the hands' inputs.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh field`.

## Expected results

- All seven views put owed first, and have rows for the neighbourhood, a pull and a push; the three views that gather their own obligations say so in the table.
- A note the sidecar lists twice is dealt once, owed, under its own heading.
- Over the real payloads, every owed note is in the front band or counted past it, nothing owed is in the middle or behind, only finished work is behind, and every note is dealt or counted.
- Your Trainer's Issues view fills the front band and counts more than twenty past it.
- A pulled note is in front with a hand counted; a pushed one is behind; an owed note stays in front when pushed, and the refusal names it in words.
- While a note is held, its neighbourhood fills the front band first, from inside the view and outside it, and the owed count does not change.

## Evidence

2026-09-10: 9 of 9 pass.

## Adequacy (who verifies this test?)

See `adequacy:` above.
