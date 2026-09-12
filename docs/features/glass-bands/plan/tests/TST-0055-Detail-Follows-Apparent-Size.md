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
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
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

## Evidence (fill after running)

- <the threshold table, and the chosen numbers>

## Adequacy (who verifies this test?)

Three breaks, one per run, recorded by [[TASK-0074-Detail-Follows-Apparent-Size-Not-The-Band]]: thresholds out of order; a level that never reaches the most detailed; a promotion threshold above the brief threshold. Each must fail at least one check, and which one is written here.
