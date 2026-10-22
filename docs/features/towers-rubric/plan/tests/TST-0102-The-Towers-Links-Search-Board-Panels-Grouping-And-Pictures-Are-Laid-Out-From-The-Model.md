---
type: "[[test]]"
id: TST-0102
aliases: ["TST-0102"]
title: "The towers' links, search, next-up board, needs-you panel, ages, weeks, grouping by feature and pictures are laid out from the overview model on both workspaces"
status: active
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[TASK-0181]]"]
phase: "[[PHASE-0005-Overview]]"
scope: feature
level: unit
entrypoint: "desktop/tests/overview-towers.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh overview-towers"
covers: ["[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"]
issues: []
tasks: ["[[TASK-0181]]", "[[TASK-0182]]", "[[TASK-0183]]", "[[TASK-0184]]", "[[TASK-0185]]", "[[TASK-0186]]", "[[TASK-0187]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0080-The-Overview-Classifies-And-Places-Every-Ticket]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
---

# The towers' new parts are laid out from the model

## Purpose

**This suite checks the pure layout behind each of the seven ideas, on Deck's and your-trainer's fixtures, without a window.** The 3D view and the flat plan draw from that layout, so a wrong curve or a missing picture shows here first. The suite does not exist yet; each task of FEAT-0031 adds its checks to it in the same commit.

## Checks

- Every ticket has its first paragraph, owner and last update; the pictures list matches the page's helpers on the same notes. (TASK-0181)
- A selected ticket's links are every ticket it names or that names it, capped at 240, with ids only at 40 or fewer; the flat plan gets the same links. (TASK-0182)
- Search matches word starts in ids and titles; the board lists the focus feature's tasks in the page's order. (TASK-0183)
- The needs-you count equals the model's, split by reason; ages count to a given today; every closed ticket is in one week or among the undated. (TASK-0184)
- By feature and by phase, every ticket is placed exactly once. (TASK-0185)
- Pictures stand at their tickets, at most three per ticket and eighteen in all, sized by nearness; the host refuses any path the list does not hold. (TASK-0186)
