---
type: "[[test]]"
id: TST-0055
aliases: ["TST-0055"]
title: "Detail follows apparent size: the thresholds are monotonic, the unzoomed field resolves to exactly what it draws today, a zoomed mid card reaches its face line, and the promotion threshold is not above the brief one"
status: active
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/detail.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh detail"
covers: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
issues: ["[[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]"]
tasks: ["[[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]", "[[TASK-0077-A-Tile-Large-Enough-Becomes-A-Real-Card]]"]
artifacts: []
adequacy: "Eight deliberate breaks across two rounds; all eight caught. The first three, 2026-09-12, were the threshold, the hysteresis and the level table. The next five, 2026-09-17, are the box-fits-detail rule: promotedBox returning the tile box (4 checks fail), deleting the MIN_BOX_FOR height floor (2), setting full back to 62 (2), the quiet cursor taking pointer events (1) and the title clamp dropping to one line (1). Each substitution was rebuilt before its run and the file restored with git checkout afterwards; the tree was clean after each."
mutation_score: "8/8 breaks caught, 2026-09-12 and 2026-09-17"
reviewed_by: model:claude-opus-5
review_date: 2026-09-17
review_verdict: approved
related: ["[[TST-0050-Zoom-Keeps-The-Point-Under-The-Pointer]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]", "[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
---

# Detail follows apparent size

## Purpose

How much of a note is drawn stops being a property of the band it stands in and becomes a property of how wide it is drawn. The thresholds are a pure function, so the whole of that decision is a table in this suite rather than three magic numbers in the renderer and a fourth in the canvas. One check matters most for trust: **at 1× the unzoomed field resolves to exactly what it draws today** — front cards at full detail, mid cards without their face line — so the change is visible only when a person zooms.

**This note must be committed together with its suite.** `command:` names `detail`, and [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]] writes `desktop/tests/detail.test.mjs`. Until that file exists, `python3 tools/scripts/run-tests.py` reports this test failing with exit 2 ("no suite called 'detail'"), which is the failure [[ISS-0028-A-Test-Note-Names-A-Suite-That-Does-Not-Exist]] recorded. Written at planning time on 2026-09-12 and not committed then.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh detail`.

## Expected results

- The function is pure, total and monotonic: a wider card never shows less.
- At 1×, a front-band card resolves to full detail and a mid-band card to brief.
- A mid-band card at 2.5× resolves past brief, so its face line and owed verb are drawn.
- A wide enough card reaches the level that names status, progress and the face's properties.
- The promotion threshold is exported from the same module and is not greater than the brief threshold.
- A width of zero, a negative width and a width of ten thousand each return a level rather than throwing.

## Evidence

**Run 2026-09-12, `node --test tests/*.test.mjs`: 457 checks, 457 passing.** `desktop/tests/detail.test.mjs` holds 9 of them; both typechecks clean.

**The widths the field actually draws, straight ahead at 1x on a 1600 by 900 window**, which is what the thresholds were read off rather than chosen against:

| band | drawn at | level | promoted |
|---|---|---|---|
| front | 138 px | full | — |
| mid | 119 px | brief | — |
| outer field | 92 px | brief | — |
| quiet, Your Trainer's 58 px tile | 34 px | tile | no |
| quiet, a small workspace's 140 px tile | 83 px | brief | yes |

The two rows that matter most are the last two. **The same threshold that makes the picture unchanged on a large workspace makes a small one's finished notes into real elements** — which is the reframing [[ISS-0073-Nothing-In-The-Quiet-Band-Can-Be-Clicked]] needed, from a yes-or-no about cost into one number. Your Trainer keeps painting tiles until a person zooms; this repository's 35 quiet notes are cards from the start, and get their click and their tab stop from being elements at all.

## Adequacy (who verifies this test?)

Three breaks, one per run, applied to `desktop/src/shared/detail.ts` and rebuilt. **All three caught**, each substitution confirmed applied before its run.

| The break | What failed |
|---|---|
| 1. The thresholds are out of order — `brief` and `full` swapped. | 5 checks, including "at 1x the unzoomed field shows exactly what it shows today" |
| 2. No width ever reaches `more` — the last branch removed, so every wide card stops at `full`. This is [[ISS-0074-Zoom-Makes-A-Card-Bigger-Without-Showing-More-Of-The-Note]]'s defect in its purest form. | 2 checks, including "a card wide enough reaches more" |
| 3. The promotion threshold is raised above the `brief` threshold, so a tile is promoted while it still shows only an id. | 3 checks, including "a quiet tile is promoted exactly when it first has something to say" |

The monotonicity check is not broken by any of the three, which is correct: it constrains the function's shape and not its numbers, and breaks 1 and 3 keep it monotonic. It earns its place against a future edit that inserts a level in the wrong order.

## Independent review, round one, 2026-09-17

`reviewed_by: model:claude-opus-5`, `review_verdict: approved`. Fresh session, notes and diff only; same model family as the author, which is what `reviewed_by` records.

**The suite guards what it claims.** Two deliberate breaks in `desktop/src/shared/detail.ts`, each rebuilt and run, each caught: widening the `full` threshold so a zoomed card never gains a level (2 checks), and removing the promotion hysteresis by setting `DEMOTE_AT = PROMOTE_AT` (1 check). The tree was restored with `git checkout --` after each and `git status` is clean.

**The last check records a trade that costs more than it says.** "The very largest quiet band is never promoted at the centre, and that is the trade" calls the cost detail, on the argument that TASK-0076's hit test and tab stop reach a painted tile. Reach by pointer and by Enter, yes. Not PULL: `this.pull(` has two call sites in `glass.ts`, a drag on a `.field-card` and the `p` key on a focused `.field-card`, and the quiet cursor's keydown handler takes only the arrows, Enter, Space and Escape. So on a 2700-note quiet band a finished note at the centre of the shelf cannot be brought to the front band at any zoom. The check is right about what it asserts; the sentence beside it understates what the threshold costs. Filed against the feature.

## Added 2026-09-17: the box a card is laid out in holds the detail it is asked for

Three checks, from [[TASK-0084-A-Promoted-Card-Is-Laid-Out-At-The-Size-Its-Promotion-Earned]] and [[ISS-0084-A-Promoted-Tile-Is-Drawn-In-The-Tiles-Box-So-The-Detail-It-Was-Promoted-To-Show-Is-Clipped]].

- **A promoted tile is laid out large enough for the detail it was promoted to show.** Over five shelf sizes and four zooms, every tile that promotes is checked against `holdsDetail`. The level's own minimum box is checked to hold it, and a box one pixel shorter is checked NOT to, so the check cannot pass vacuously.
- **A promoted tile does not jump in apparent width as it crosses the threshold.** The box is the apparent width, and the renderer draws it with no scale, so the frame before and the frame after are the same width.
- **A promoted tile is taller than the flat tile it replaces**, because it is a card and a card has a card's proportions.

**Adequacy, 2026-09-17, restated after round two.** The first version of this sentence said replacing `promotedBox` with the old behaviour makes all three checks fail. Round two showed that is true only of the band-box form of the defect: `promotedBox` returning a fixed 58 by 16 box makes checks 2 and 3 fail and **check 1 pass**, because check 1 took the level from the box's own width and `detailFor(58)` is `tile`, which 58 by 16 does hold. Check 1's width axis was true by construction for the same reason, and the loop asserting `holdsDetail(MIN_BOX_FOR[level], level)` was `x >= x`.

**What replaced it.** The minimum heights are now computed from the stylesheet's own sizes, `full` is asserted to equal `CARD_BOX.height` — the 92 pixels a front-band card has drawn full detail in since [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]] — and a fourth check asserts the height floor is what decides a promoted card's height rather than a card's proportions, which is the part that was dead code. Five breaks were run against the result and all five were caught; the counts are in `adequacy:`. Restored, all 470 node checks pass and `git status` is clean.
