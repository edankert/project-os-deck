---
type: "[[test]]"
id: TST-0019
aliases: ["TST-0019"]
title: "The desk is a chosen set of cards a person arranges, and it survives being saved and reopened"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-11
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
adequacy: "Rebuilding every card on a move fails the identity check while every position is still correct. Saving the desk by reference rather than by copy fails the copy check. The clamp ARITHMETIC is guarded twice and both checks fail when reverted: one drives the old content-measured bound and fails if the drift is absent, the other fails if any two of forty cards land in the same place. WHICH BOUND THE RENDERER CALLS is not guarded, because no suite loads desktop/src/renderer/: the close-out reviews of 2026-09-07 reverted that one line twice, at 153 checks and again at 165, and every check stayed green both times ([[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]). That half rests on the acceptance walk."
mutation_score: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: approved
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

- `bash tools/scripts/run-desktop-tests.sh desk-model`: 19 checks, all passing on 2026-09-07.
- The desktop suites run 165 checks in total on that date, this one included.

## Adequacy (who verifies this test?)

Rebuilding every card on a move fails the identity check while every position is still correct, which is exactly the failure equality would miss. Saving the desk by reference rather than by copy fails the copy check, because a later move rewrites the saved arrangement. Returning the same slot twice fails the placement check.

**The clamp is a different case and this section used to overclaim it.** The sentence "removing the clamp fails the smaller-window check" was here until 2026-09-07 and was false twice over. The check calls the pure function directly, so it fails only if that function is deleted; and the product change is one line in the renderer's `drawDesk`, which reverting leaves every check green, because no suite loads `desktop/src/renderer/` ([[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]).

What this suite does now guard about the clamp is the ARITHMETIC, and it guards it hard: one check drives the old content-measured bound and **fails if the drift is absent**, so it cannot pass by accident; another builds forty cards down a desk taller than its window and fails if any two are drawn in the same place. Both wrong answers are pinned. Which bound the renderer actually calls is still settled by the walk.

## Notes

Pointer input itself is the part a machine cannot settle here. This suite covers the model under the drag, so whether a card follows the pointer, and whether the drop lands where a person meant, is still decided by the acceptance walk in `docs/tests/acceptance/`.

The suite loads the BUILT modules under `desktop/dist`, not the TypeScript sources. That is the house rule stated in `desktop/tests/helpers.mjs`: a check that reads source text survives the rename that breaks the behaviour it claims to protect.

## Independent review — 2026-09-07

**Verdict: changes-requested.** Clean context, separate session. The suite is a good test of `shared/store-state.js` and `shared/desk.js`; the `adequacy` field claims more than it guards.

- **"Removing the clamp fails the smaller-window check" is not true of the product.** The check at `desktop/tests/desk-model.test.mjs:153` calls `clampToSurface` directly, so it fails only if that function is deleted. The restore path never calls it: `clampToSurface` appears once in the renderer, inside the drag handler (`renderer.ts:510`), and `drawDesk` places restored cards at their raw stored coordinates. Removing the clamp from the product changes nothing this suite can see.
- **No node suite loads anything under `desktop/src/renderer/`.** Every module the tests import is under `shared/` or `main/`, and `render.test.mjs` reads the built stylesheet as text. The renderer half of TASK-0024 and TASK-0025 — the pointer handlers, the pool, the placement — is covered only by the Electron smoke run, which drags one card on an unscrolled desk and then calls `webContents.reload()`. A renderer reload is not the "Quitting Deck and starting it again" that TASK-0025's third criterion names.

The rest of the suite guards what it says it does: the identity check would fail if `move-card` rebuilt untouched cards, and the copy check would fail if `save-desk` stored the live array by reference. Reword the `adequacy` field to claim only those, and record the renderer path as walked rather than checked.

## Where this stands

**2026-09-07, review: changes requested, and made.** The review's sharpest point about this suite: its clamp check called the pure function directly, so it passed whether or not the application ever called it, and the application did not ([[ISS-0007-Four-Smaller-Defects-The-Review-Found-In-The-Renderer]]). Two checks were added that assert the DEFECT as well as the fix, using the real numbers from a desk scrolled below its own window ([[ISS-0005-A-Card-Jumps-When-The-Desk-Has-Scrolled]]).

**2026-09-07, close-out review: the verdict moves to approved and the `adequacy` field stops overclaiming.** The second review of the day measured what the first one argued ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]): it replaced the clamp call in the built renderer with a plain assignment and every one of the 153 checks still passed. So the sentence "Removing the clamp fails the smaller-window check" was false and is gone. What this suite does guard, it guards — the identity check and the copy check both fail when their behaviour is reverted. The clamp is covered by the acceptance walk and by nothing automated, which is [[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] and not a fault of this note.

## 2026-09-07, the second close-out review: the clamp was fixed twice, because the first answer was wrong

**The first fix removed the creep and broke the desk.** Clamping every card to the window is stable, and it squeezes a desk flat: no painted card exceeds the viewport, so the desk never grows enough to scroll to the rest. Forty cards on a 900x600 desk drew 24 distinct positions — sixteen cards on top of another card. The review reproduced it before anything shipped.

**The bound is the desk's own extent**: the window unioned with every saved position. Stable, because it is a pure function of what was saved rather than a measurement of the last paint; and correct, because a card at y=2000 makes the desk 2000 tall and is reached by scrolling, which is what a desk that scrolls is for. The clamp still catches a negative coordinate.

Both wrong answers are now pinned by checks in `desktop/tests/desk-model.test.mjs`, so neither can come back quietly.

**Amended 2026-09-11 ([[FEAT-0015-Each-View-Keeps-Its-Own-Desk]]).** Edwin asked that day for a desk for each view, with some notes kept on every view. The expected result "A desk holds what a person put on it, from more than one view if they want" now reads: a view's desk holds what a person put on it on that view, plus the notes they keep on every view. `desk-model.test.mjs` checks the new rule. A note marked "on every view" is what still crosses views, and a state file written before the change reads every held note as on every view, so nothing on screen changed on the day it landed.
