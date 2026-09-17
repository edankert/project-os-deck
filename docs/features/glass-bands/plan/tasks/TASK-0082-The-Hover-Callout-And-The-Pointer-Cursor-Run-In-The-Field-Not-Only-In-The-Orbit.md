---
type: "[[task]]"
id: TASK-0082
aliases: ["TASK-0082"]
title: "The hover callout and the pointer cursor run in the field as well as in the orbit, and the check that stands for the cursor asserts the cursor"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: 2026-09-17
source: ["[[ISS-0081-Resting-The-Pointer-On-A-Tile-Does-Nothing-Because-The-Handler-Only-Runs-In-The-Orbit]]", "Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17"]
parent: "FEAT-0018"
effort: "S"
due: ""
depends: []
blocks: []
related: ["[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]", "[[ISS-0083-Two-Smoke-Checks-Cannot-Fail-And-One-Of-Them-Stands-For-The-Cursor]]"]
tests: ["[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]", "[[TST-0056-Every-Note-Is-Somewhere-And-A-Finished-Note-Can-Be-Pulled-Forward]]"]
---

# The hover callout and the pointer cursor run in the field

## Objective

**[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]] wrote a callout and a cursor for the quiet band's tiles, and put them inside a listener that returns unless the arrangement is the orbit.** So neither has ever run. This task opens the guard to the field, and replaces the check that was supposed to catch it.

## Detail

The listener at `desktop/src/renderer/glass.ts:1551` opens with `if (this.arrangement !== 'orbit' || look !== null || event.buttons !== 0) return;`. Two of those three tests belong: `look` means a turn is in progress, and `buttons` means a button is down. The arrangement test does not, now that the field paints tiles the orbit's `dotAt` is the analogue of.

The body already branches on the arrangement in the two places it must, lines 1566 and 1568, so opening the guard is the whole change on the renderer's side.

The check that should have caught this is `record(typeof cursor === 'string', ...)` in `desktop/src/main/smoke-glass.ts`, which passes whatever the renderer does. It becomes an assertion that the cursor over a tile is `pointer`, and a second check reads the callout's text. Both are [[ISS-0083-Two-Smoke-Checks-Cannot-Fail-And-One-Of-Them-Stands-For-The-Cursor]]'s first two actions.

## Acceptance

- Resting the pointer on a quiet-band tile in the Glass field shows the pointer cursor.
- Resting on a tile shows a callout naming the note under the pointer, and moving off it hides the callout again.
- The orbit's own hover behaviour, a link quoted and a dot named, is unchanged. **Amended 2026-09-17 after round two of the review:** one thing in the orbit did change, and it is the change the fix wanted everywhere. Moving the pointer from a dot onto a card, a pane, the compass or the bar now clears the pointer cursor, where before it was left behind claiming the background was clickable. The same clearing happens on `pointerleave`. Saying "unchanged" was wrong; this line says what changed and why it is right.
- A turn in progress and a held button still suppress both, as they do in the orbit today.
- The smoke check asserts `cursor === 'pointer'` rather than that a string was returned, and fails when the guard is closed again.

## Steps

- [ ] Drop `this.arrangement !== 'orbit'` from the line 1551 listener's guard, keeping `look` and `buttons`.
- [ ] Assert the cursor and the callout in the smoke run, and drop the rectangle line 2035 computes and never reads.
- [ ] Record in [[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]] that closing the guard again makes the cursor check fail.

## Where this stands

**2026-09-17: written, and not yet verified by a run.** The guard at `desktop/src/renderer/glass.ts` now tests only `look` and `event.buttons`, so the listener runs in the field as well as the orbit and the tile branch below it is reachable. Two things were added while the guard was open: the cursor is cleared when the pointer moves over a card, a pane, the compass or the bar, and it is cleared again on `pointerleave`, because a pointer cursor left behind over the background would claim it is clickable when it is not.

**The check that stands for this now asserts the cursor.** `record(typeof cursor === 'string', ...)` is gone; in its place the run rests the pointer on a tile and asserts `cursor === 'pointer'`, asserts the callout names the note under it, and asserts both go away when the pointer moves off. Those three replace one check that could not fail.

**What is owed: a run.** These are renderer checks, so only the smoke suite can settle them, and it opens windows. Docker was not running on 2026-09-17, so [[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]]'s container was not available either. `npm test` (468 checks) and both typechecks pass; nothing here is verified by them.
