---
type: '[[task]]'
id: TASK-0123
title: Verify the flows and hand them to Edwin
status: done
phase: '[[PHASE-0005-Overview]]'
owner: system:codex
created: '2026-10-14'
updated: '2026-10-14'
source:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
- '[[REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF]]'
parent: '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
effort: ''
due: ''
depends:
- '[[TASK-0120-Draw-The-Acceptance-Flows-From-Recorded-Evidence]]'
- '[[TASK-0121-Serve-Only-Images-Under-The-Workspaces-Docs]]'
- '[[TASK-0122-Send-A-Persons-Flow-Actions-Through-The-Shell]]'
blocks: []
related:
- '[[RISK-0009-Acceptance-Flows-Depend-On-Changing-Sidecar-Payloads-And-Guards]]'
- '[[DES-0005-The-Overview-Is-Drawn-Not-Written]]'
tests:
- '[[TST-0085-Flow-Scenes-And-Payloads-Keep-The-Recorded-Evidence]]'
- '[[TST-0086-The-File-Route-Serves-Only-Workspace-Images]]'
- '[[TST-0087-Flow-Actions-Use-The-Shell-And-Preserve-Refusals]]'
---

# Verify the flows and hand them to Edwin

## Definition of Done

- [x] npm test in desktop passes with the command, date, passed, failed and skipped counts recorded.
- [x] The adoption table changes only the capability rows used by S5 to S7 and dates their scope.
- [x] The payload risk and change note name the flows, shell verbs and image route, including sidecar-owned limitations.
- [x] Edwin has one active acceptance test per flow, with an explicit step comparing person use with an agent-session refusal.
- [x] All task evidence is recorded, FEAT-0029 reaches review, and no human design, test or feature verdict is recorded by this run.
- [x] Documentation checks and git diff --check pass; changes are committed on lane/codex with the required Codex co-author trailer.

## Steps

- [x] Run the node suites and documentation validation without opening windows.
- [x] Finish the adoption, change, risk and acceptance notes with observed evidence.
- [x] Commit the reviewable work and hand the review and human walks to Claude and Edwin.

## Notes

The user authorizes implementation in this worktree on `lane/codex`. Claude merges; this run does not push, merge, open windows or write either sibling repository. Completed work and test evidence are recorded before this task moves to done.

## Evidence

2026-10-14: `npm test` from `desktop/` passed 718 tests, with 0 failures and 0 skips. The TypeScript build passed. The three linked executable notes cover 30 focused tests: 11 scene and payload checks, 4 image-route checks and 15 renderer and shell write checks. They stay active because a command note holds no verdict in its status.

`bash tools/agents/check-docs-first.sh`, `bash tools/scripts/validate-docs.sh` and `git diff --check` passed. Documentation validation reports the repository's existing acceptance and review warnings and the explicitly authorized DES-0005 design-gate warning; it reports no errors. `python3 tools/scripts/sync-snapshot.py` derives the finished task and review feature statuses from their notes.

The image audit used `sips -g pixelWidth -g pixelHeight` and filesystem byte counts: six flow fixtures, nine recorded payloads, 25 images, 1,604,537 image bytes and a maximum width of 900 pixels. Raster previews of the scenes were inspected without opening a window.

Implementation commits are `602e9bb` (scenes and fixtures), `9ad200d` (image route) and `a50ffcb` (registered flows and shell writes), after the preflight in `c84de57`. This close-out commit records the handoff at review. Every commit carries the requested Codex co-author trailer. No push, merge, Electron run, human verdict or sidecar write was performed.

Claude receives the S3 gate integration question in FEAT-0029 and the source range for a review packet. Edwin receives TST-0088, TST-0089 and TST-0100. RISK-0009 stays open for changing payloads and the sidecar-owned transition and identity limits.
