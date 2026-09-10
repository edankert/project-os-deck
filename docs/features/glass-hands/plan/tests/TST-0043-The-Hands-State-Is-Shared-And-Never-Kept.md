---
type: "[[test]]"
id: TST-0043
aliases: ["TST-0043"]
title: "The hands’ state is shared and never kept: pull, push and let go are store transitions the persister drops, a pane is the desk record Spread saves, and the surface is Glass unless chosen"
status: active
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[TASK-0053-Pull-Forward-And-Push-Behind]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/hands.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh hands"
covers: ["[[FEAT-0014-The-Hands]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
issues: []
tasks: ["[[TASK-0053-Pull-Forward-And-Push-Behind]]", "[[TASK-0054-A-Held-Note-Is-A-Pane]]", "[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]"]
artifacts: []
adequacy: "Measured 2026-09-10 against the built modules, eight mutations and eight killed. Persisting the session fails 1. A pull that leaves the note pushed fails 1. A resize with no minimum fails 1. A raise that changes nothing fails 1. A widen that keeps the other pane in the column fails 1. A snap that ignores headers fails 1. A surface the store does not check fails 1."
mutation_score: "8 mutations, 8 killed (2026-09-10); reading the surface back from the file, added for ISS-0060, is killed too"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0002-The-Store-Broadcasts-And-Survives-A-Restart]]", "[[TST-0005-Every-State-Round-Trips-Through-Its-Address]]"]
---
# The hands' state is shared and never kept

## Purpose

A pull or a push lasts for the session: every window shares it, and a restart forgets it. A pane's place and size are the opposite: they are the desk record Spread already saves. This suite checks both halves in the reducer and in the store's file, and checks that the surface is Glass unless a person chose otherwise.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh hands`.

## Expected results

- A pull and a push are recorded per workspace, and the later gesture wins; let go clears both for this workspace and no other.
- The persister writes no session part, a session read off disk is ignored, and the desk itself is kept.
- The hands' and the panes' actions cross the window channel; `restore` still does not.
- A pane is resized to no less than 280 by 160, a move keeps its size, and the size survives a restart and a saved desk; a desk saved before panes existed reads as it did.
- Raising a pane puts it at the end of the desk; one reading column at a time; a pane dropped on a header snaps below the whole stack.
- The surface starts as Glass, refuses a name nothing draws, and an address writes it only when it is not Glass; neither the yaw nor the hands are part of an address.

## Evidence

2026-09-10: 10 of 10 pass.

## Adequacy (who verifies this test?)

See `adequacy:` above.
