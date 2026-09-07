---
type: "[[test]]"
id: TST-0019
aliases: ["TST-0019"]
title: "The desk is a chosen set of cards a person arranges, and it survives being saved and reopened"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/desk-model.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh desk-model"
covers: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
issues: []
tasks: ["[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]", "[[TASK-0025-Cards-Are-Dragged-And-Removed]]"]
artifacts: []
adequacy: "Rebuilding every card on a move fails the identity check while every position is still correct. Saving the desk by reference rather than by copy fails the copy check. Removing the clamp fails the smaller-window check."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]", "[[TASK-0025-Cards-Are-Dragged-And-Removed]]", "[[TST-0004-A-Desk-Reopens-As-It-Was-Left]]"]
---

# The desk is chosen and arranged

## Purpose

The desk used to be whatever the flow layout produced from the whole view. That is why a saved desk was worth nothing, and why Deck's state file held no desks after a day of use. What is on the desk, and where each card sits, is state now. This suite is over that state.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0019` reproduces it locally without writing anything.

## Procedure

- Open a workspace and assert the desk starts with nothing on it.
- Put a note on the desk, assert it is there, take it off, assert it is gone.
- Put the same note on twice and assert the second attempt changes nothing.
- Change the view and assert the desk keeps its cards.
- Open a second workspace, assert its desk is empty, put a card on it, return to the first and assert the first desk came back.
- Drag one card of three and assert the other two are the objects they already were, checked by identity rather than equality.
- Move a card to the position it already holds and assert the state is unchanged.
- Save a desk, wander off by clearing it and putting something else on, reopen the saved desk and assert exactly the saved cards and positions come back.
- Move a card after saving and assert the saved desk is unchanged.
- Reconcile a desk naming three notes against a view that shows one, and assert it opens with that one and counts the two it dropped.
- Ask for slots for three new cards and assert each lands where nothing already is.
- Ask for slots on a surface only one card wide and assert the cards stack downwards rather than off the side.
- Clamp a position far outside the surface and assert the card stays reachable, in both directions and with fractional input rounded.
- Clamp a position saved on a large display against a small window and assert the card comes back on screen.

## Expected results

- A desk holds what a person put on it, from more than one view if they want, and nothing else appears on it by itself.
- Dragging one card moves that card and no other. The check is identity, so a rewrite of untouched cards fails even when every position is still right.
- A saved desk is a copy taken at the moment of saving, so later dragging does not quietly rewrite it.
- A desk naming a note the view no longer shows opens with the rest and reports how many it dropped.
- A card is never dragged somewhere it cannot be reached from, and a desk saved on a large display opens on a laptop.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh desk-model`: 14 checks, all passing on 2026-09-07.
- The desktop suites run 143 checks in total on that date, this one included.

## Adequacy (who verifies this test?)

Rebuilding every card on a move fails the identity check while every position is still correct, which is exactly the failure equality would miss. Saving the desk by reference rather than by copy fails the copy check, because a later move rewrites the saved arrangement. Removing the clamp fails the smaller-window check, and returning the same slot twice fails the placement check.

## Notes

Pointer input itself is the part a machine cannot settle here. This suite covers the model under the drag, so whether a card follows the pointer, and whether the drop lands where a person meant, is still decided by the acceptance walk in `docs/tests/acceptance/`.

The suite loads the BUILT modules under `desktop/dist`, not the TypeScript sources. That is the house rule stated in `desktop/tests/helpers.mjs`: a check that reads source text survives the rename that breaks the behaviour it claims to protect.
