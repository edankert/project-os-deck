---
type: "[[test]]"
id: TST-0065
aliases: ["TST-0065"]
title: "A note opens at the size a person chose: its own size first, then the size last chosen on that view, then a first-use size, and a small window changes what is drawn and never what is stored"
status: active
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/reading-size.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh reading-size"
covers: ["[[FEAT-0017-An-Opened-Note-Stands-In-The-Middle-Of-Its-Neighbours]]", "[[ISS-0071-The-Note-In-The-Middle-Is-Not-The-Size-The-Person-Chose]]"]
issues: []
tasks: ["[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0051-The-Ring-Keeps-Order-Clears-The-Pane-And-Moves-On-Arcs]]", "[[DES-0003-Collections-And-Documents-On-Glass]]"]
---

# A note opens at the size a person chose

## Purpose

ISS-0071 was a note that changed size as soon as it was dragged. The rule that replaces it is in two pure modules, `desktop/src/shared/panes.ts` and `desktop/src/shared/store-state.ts`, and this suite checks it there: which size a note opens at, what a resize changes, and what a small window may and may not do.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh reading-size`.

## Expected results

- A note with a size of its own opens at that size, whatever the view prefers.
- A note with no size opens at the size last chosen on that view of that workspace; with none, at 560 by 520.
- Putting a note on the desk writes its size on its card, so resizing another note afterwards does not change it.
- Resizing a note changes that note and the view's preference, and no other note.
- Moving a note changes its place and not its size.
- A field smaller than the note draws it smaller; the stored size is untouched, and a wider field draws it at its stored size again.
- A state file written before reading sizes existed opens, with no preference.
