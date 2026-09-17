---
type: "[[issue]]"
id: ISS-0087
aliases: ["ISS-0087"]
title: "The fix for the clipped promoted card left it clipped, because the minimum heights were guessed rather than added up and were low enough that the floor meant to apply them never applied at all"
status: open
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-17
updated: 2026-09-17
source: ["Independent review of [[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]], round two, 2026-09-17"]
severity: medium
component: renderer
parent: ""
related: ["[[ISS-0084-A-Promoted-Tile-Is-Drawn-In-The-Tiles-Box-So-The-Detail-It-Was-Promoted-To-Show-Is-Clipped]]", "[[TASK-0084-A-Promoted-Card-Is-Laid-Out-At-The-Size-Its-Promotion-Earned]]", "[[TST-0055-Detail-Follows-Apparent-Size]]", "[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
tests: ["[[TST-0055-Detail-Follows-Apparent-Size]]", "[[TST-0042-Nothing-Blurs-And-Only-Near-Cards-Are-Promoted]]"]
---

# The minimum heights were guessed, so the floor never applied

## Problem

**[[ISS-0084-A-Promoted-Tile-Is-Drawn-In-The-Tiles-Box-So-The-Detail-It-Was-Promoted-To-Show-Is-Clipped]] was answered with a rule that did nothing.** `MIN_BOX_FOR` said the smallest box each detail level needs, and `promotedBox` floored a promoted card's height at it. Both numbers were written from an estimate rather than from the stylesheet, and they were too small: `full` was 62 where its rows add up to 92.

Two things follow from that. A promoted card at the promotion threshold was 130 by 64, still too short for the four rows `full` draws, so **the clipping the fix existed to remove was still there**. And because a card's own proportions give more height than the stated minimum at every width — 64 against 62 at the threshold, 104 against 92 at `more` — the `Math.max` never once chose the floor. **The floor was dead code.**

The arithmetic, from `desktop/src/renderer/deck.css`. `body` sets `font: 13px/1.5`, so `line-height: 1.5` is inherited as a number and each row is its own font size times 1.5. `.fc-top` is 16.5 (the mark at 11px is the tallest child), `.fc-title` is 12.5px at `line-height: 1.25` and clamps to two lines, so 31.3, `.fc-face` and `.fc-owed` are 15.8 each, and `.field-card` adds 12 pixels of padding. That is 91.4, and `.field-card` carries `overflow: hidden`.

**There was a witness to the right number the whole time.** `CARD_BOX` is 186 by 92, and a front-band card has drawn `full` in 92 pixels since [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] without clipping. The correct height was already on screen.

## Expected

The minimum heights are the stylesheet's own numbers rather than an estimate, and the floor is the thing that decides a promoted card's height rather than decoration beside a card's proportions.

## Evidence

Reproduced. Each mutation was applied, rebuilt, the full node suite run, and the file restored with `git checkout -- <file>`.

Before the fix in `223d582`, with the guessed heights:

```
promotedBox(130) -> { width: 130, height: 64 }   full needs 92
deleting the MIN_BOX_FOR height floor           465/465 pass — dead code
```

After:

```
promotedBox(130) -> { width: 130, height: 92 }
promotedBox(210) -> { width: 210, height: 129 }
deleting the MIN_BOX_FOR height floor           468 pass, 2 fail
full's height set back to 62                    468 pass, 2 fail
promotedBox returning the 58x16 tile box        466 pass, 4 fail
.fc-title's clamp dropped from 2 lines to 1     469 pass, 1 fail
```

## Risk scan

No trigger applies. One new coupling is worth naming: `detail.ts` now encodes numbers that live in `deck.css`, which is two copies of one fact. [[TST-0042-Nothing-Blurs-And-Only-Near-Cards-Are-Promoted]] reads the built stylesheet and fails if any of those sizes, line-heights or clamps change, so the copies cannot drift silently. The alternative — measuring a real card at runtime — would put layout reads in the frame loop, which is what the field is measured on.

## Where this stands

**2026-09-17: fixed in the pure layer and verified there; the on-screen result is not verified.** `MIN_BOX_FOR` is computed by `heightFor`, which adds the rows `DETAIL_SHOWS` names at the stylesheet's sizes. `full` lands on 92, equal to `CARD_BOX.height`, and [[TST-0055-Detail-Follows-Apparent-Size]] asserts that equality so the witness is part of the check rather than an argument in a comment. Whether a real promoted card now draws without clipping is settled by the smoke check `every promoted card draws its <level> without clipping it`, which has not been run.

## Next Actions

- [ ] Run the smoke suite and confirm no promoted card's `scrollHeight` passes its `clientHeight`.
