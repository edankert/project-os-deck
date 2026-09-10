---
type: "[[test]]"
id: TST-0044
aliases: ["TST-0044"]
title: "The neighbourhood is read once per note per revision and shared by the lift and the reach, what held notes share is their intersection, and a throw is recognised from pointer samples and window bounds"
status: active
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0055-Throw-To-A-Screen]]", "[[TASK-0056-Reach]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/reach-and-throw.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh reach-and-throw"
covers: ["[[FEAT-0010-Lifting-A-Note]]", "[[FEAT-0014-The-Hands]]"]
issues: []
tasks: ["[[TASK-0036-The-Neighbourhood-Takes-The-Front-Band]]", "[[TASK-0037-What-These-Share]]", "[[TASK-0055-Throw-To-A-Screen]]", "[[TASK-0056-Reach]]"]
artifacts: []
adequacy: "Measured 2026-09-10 against the built modules, five mutations and five killed. A cache that never caches fails 1. A shared set that counts notes joined to one fails 1. A throw that ignores speed fails 1. A Needs-you strip offered as a target fails 1. A tablet never offered fails 1."
mutation_score: "5 mutations, 5 killed (2026-09-10)"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---
# The neighbourhood is read once, and a throw is recognised

## Purpose

Lifting a note and reaching for one read the same thing, what the note links to and what links to it, and a person reaching across a band of cards must not send the sidecar a request per card. What several held notes share is computed from those same answers. And a throw is a judgement about a drag: where it was going and how fast. All three are pure and tested here without a window.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh reach-and-throw`.

## Expected results

- The context payload is read the way the sidecar sends it, type groups flattened and each neighbour's path kept, so a neighbour from outside the view can be opened.
- A note's context is requested once per index revision, however many times and however concurrently it is asked; a failed request is not cached; an older revision is forgotten.
- The reach waits between 300 and 700 ms, and a press-and-hold at least 400.
- What held notes share, over zero, one, two and three held notes, never counts a held note.
- A quick drag off the right edge is a throw toward the right; a hesitation at the edge and a fast drag inside the field are not; both thresholds are inputs.
- The strip names the windows that way, nearest first, an empty display that way and the tablet last, and never a Needs-you strip; a new reader lands at the display's near edge.

## Evidence

2026-09-10: 8 of 8 pass.

## Adequacy (who verifies this test?)

See `adequacy:` above.
