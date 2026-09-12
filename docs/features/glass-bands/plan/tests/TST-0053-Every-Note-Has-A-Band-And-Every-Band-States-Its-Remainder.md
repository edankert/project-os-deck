---
type: "[[test]]"
id: TST-0053
aliases: ["TST-0053"]
title: "Every note the view holds has a band and every band states its remainder: the four lists plus the four counts add up, the middle's remainder is placed rather than dropped, and a pushed note is never the one a capacity drops"
status: active
owner: user:edwin
created: 2026-09-12
updated: 2026-09-12
source: ["[[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: unit
entrypoint: "desktop/tests/field.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh field"
covers: ["[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]", "[[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]"]
issues: ["[[ISS-0079-Active-Work-Past-The-Mid-Bands-Capacity-Is-Drawn-Nowhere]]", "[[ISS-0078-The-Quiet-Band-Is-The-Only-Band-That-Insists-On-Drawing-Everything]]"]
tasks: ["[[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]]", "[[FEAT-0018-Every-Note-Has-A-Place-And-Anything-Visible-Can-Be-Reached]]"]
---

# Every note has a band and every band states its remainder

## Purpose

This suite is the discharge of [[ADR-0005-Four-Bands-And-Every-Band-States-What-It-Could-Not-Place]]'s rule: every band places at most its own capacity and states how many it did not place. The arithmetic that proves it is one line — the four band lists plus the four remainders equal the number of notes dealt — and it is run over the real payloads of all three workspaces, so it fails the moment a note is counted and then dropped.

**This note must be committed together with its suite.** `command:` names `field`, and [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]] extends `desktop/tests/field.test.mjs`. That file already exists and is named by [[TST-0040-The-Field-Deals-Every-View-Into-Three-Bands]], which keeps its own checks; this note names the new ones. Written at planning time on 2026-09-12 and not committed then.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh field`.

## Expected results

- For every view of all three workspaces, `front + mid + far + deep + frontOverflow + midOverflow + farOverflow + deepOverflow` equals the number of entries dealt.
- A note whose band rule says `mid`, past `midCapacity`, is in the outer field and not in `midOverflow`.
- `midOverflow` is non-zero only when the outer field is also full.
- The quiet band stops at `deepCapacity` and reports the rest as `deepOverflow`.
- A note a hand pushed behind is in the quiet band and is never one of the notes `deepOverflow` counts.
- A pulled note still takes a front-band spare slot; an owed note past the front capacity is still counted rather than demoted.
- A description naming no capacity gets the defaults, and every existing view deals as it does today except that the middle's remainder is placed.

## Evidence (fill after running)

- <paths and counts per workspace>

## Adequacy (who verifies this test?)

Four breaks, one per run, recorded by [[TASK-0072-Every-Band-Has-A-Capacity-And-The-Deal-Places-A-Fourth]]: drop the middle's remainder again; let the outer field take everyone; let the quiet band take everyone; drop a pushed note by capacity. Each must fail at least one check, and which one is written here.
