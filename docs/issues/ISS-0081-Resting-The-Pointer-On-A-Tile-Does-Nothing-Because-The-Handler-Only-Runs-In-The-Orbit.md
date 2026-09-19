---
type: "[[issue]]"
id: ISS-0081
aliases: ["ISS-0081"]
title: "Resting the pointer on a quiet-band tile shows neither the note's name nor the pointer cursor, because the handler that would show them returns before it reaches the tile code"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: "2026-09-19"
source: ["Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round one, 2026-09-17"]
reported_by: review
severity: high
component: renderer
parent: ""
related: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]", "[[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
tests: []
---

# Resting the pointer on a tile does nothing

## Problem

**Move the mouse over a finished note in the quiet band and nothing happens: no name appears and the cursor stays an arrow.** The code that would do both was written, and it cannot run.

`desktop/src/renderer/glass.ts:1552` opens the `pointermove` listener with `if (this.arrangement !== 'orbit' || look !== null || event.buttons !== 0) return;`. That guard predates this feature and was not touched by it. Everything below it therefore runs only in the orbit. The tile branch added at lines 1566 to 1570 asks `this.arrangement === 'orbit' ? this.dotAt(x, y) : this.tileAt(x, y)` and then `if (this.arrangement !== 'orbit')` — both tests whose false side is the only side that can be reached. The Glass field is the only arrangement that paints tiles, so the tile half is dead.

Two things follow. `showTileCallout` is never called from anywhere in the program. And `field.style.cursor` is assigned in exactly one place, line 1567, inside the same dead branch, so it is never set over a tile.

The click half of [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] is genuinely fixed and is not affected: `pointerup` reaches `tileAt` through a different listener at line 1626, guarded on `look` rather than on the arrangement, and the smoke run broke that path on purpose and saw it fail.

## Expected

Resting the pointer on a tile names the note and shows the pointer cursor, which is what [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]'s acceptance line asks for and what [[TASK-0076-Anything-Visible-Is-Clickable-On-The-Canvas-Too]]'s scope lists as "a pointer cursor, a hover callout".

## Evidence

Reproduced by reading the built source.

```
$ grep -n "showTileCallout" desktop/src/renderer/glass.ts
1345:  private showTileCallout(hit: string | null, x: number, y: number): void {
1569:        this.showTileCallout(hit, x, y);
```

The only call is line 1569, inside the branch the line 1552 guard makes unreachable. `grep -n "style.cursor" desktop/src/renderer/glass.ts` likewise returns one assignment, line 1567, in the same branch.

The check that should have caught this cannot fail; it is [[ISS-0083-Two-Smoke-Checks-Cannot-Fail-And-One-Of-Them-Stands-For-The-Cursor]].

## Risk scan

No trigger applies: widening an existing guard adds no dependency, no env var, no path and no new long-running step.

## Next Actions

- [ ] Let the listener run in the field as well as the orbit, keeping the `look` and `buttons` guards, and assert the cursor is `pointer` rather than merely a string.

## Where this stands

**2026-09-17: fix written, not yet verified by a run.** [[TASK-0082-The-Hover-Callout-And-The-Pointer-Cursor-Run-In-The-Field-Not-Only-In-The-Orbit]] opened the guard so the listener runs in the field, and replaced the check that could not fail with three that assert the cursor, the callout and their removal. None has been run: they are smoke checks and the suite opens windows. This stays `open` until a run settles it.

## Checked against the code, 2026-09-19: already done

Evidence: `desktop/src/renderer/glass.ts:1597-1621`: the field's `pointermove` listener now returns only on `look !== null || event.buttons !== 0`; the orbit guard is gone. Line 1617 sets `field.style.cursor = hit !== null ? 'pointer' : ''` and line 1619 calls `this.showTileCallout(hit, x, y)` when the arrangement is not the orbit. The smoke run has not executed this code: the fix is in commits `fb4982b` and `223d582`, which are among 18 commits not yet pushed (`git rev-list --count origin/main..main` is 18), and the last `deck-smoke` CI run (2026-09-12) failed on an unrelated DES-0001 verb check.

**Belongs to:** [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]] (TASK-0082), PHASE-0002 Glass. **Next:** the first smoke run after the push confirms it; reopen this issue if `resting on a tile shows the pointer cursor` fails.

Checked as part of project-os-dev FEAT-0036 (TASK-0141).
