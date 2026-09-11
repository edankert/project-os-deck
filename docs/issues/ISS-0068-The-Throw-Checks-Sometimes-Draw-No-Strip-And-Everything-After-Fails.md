---
type: "[[issue]]"
id: ISS-0068
aliases: ["ISS-0068"]
title: "The throw checks sometimes draw no target strip, and every Glass check after them fails in a cascade"
status: triage
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-11
updated: 2026-09-11
source: ["Smoke runs on 2026-09-11 while building FEAT-0015"]
severity: medium
component: tests
parent: ""
related: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TASK-0055-Throw-To-A-Screen]]"]
tests: []
---

# The throw checks sometimes draw no target strip

## Problem

**About one full loopback smoke run in six fails in the throw section, and every Glass check after it fails too.** The drag toward the field's right edge sometimes draws no target strip: the first failure reads "the target strip appears at the edge the card approached (undefined)". The orbit checks, the drift check and the FEAT-0015 checks that follow then fail as well, and the run's verdict is a long list that hides its one cause. On 2026-09-11 it happened once in three runs of `bash tools/scripts/run-smoke.sh both`, and once in a Glass-only run the day before, which was blamed on a deliberate break that could not have caused it. Five Glass-only runs and four full runs passed.

The cause is not known. Candidates: the window losing the keyboard or the pointer to a window the throw section opens (a reader and a desk panel beside it), a pointer capture left from an earlier check, or a pane covering the card the drag starts on.

## Why it matters

The `deck-smoke` continuous-integration job runs the same checks, so this can fail a run for no defect in Deck, and the cascade makes it look like many.

## Next

Catch it once with `DECK_SMOKE_DEBUG=1`, which prints the targets list, the card and the strip, and find the cause. Then make the throw section recover: when the strip does not appear, say why and leave the pointer released, so one failure stays one failure.
