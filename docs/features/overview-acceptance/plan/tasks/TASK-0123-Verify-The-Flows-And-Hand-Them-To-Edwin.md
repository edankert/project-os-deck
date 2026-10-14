---
type: '[[task]]'
id: TASK-0123
title: Verify the flows and hand them to Edwin
status: backlog
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

- [ ] npm test in desktop passes with the command, date, passed, failed and skipped counts recorded.
- [ ] The adoption table changes only the capability rows used by S5 to S7 and dates their scope.
- [ ] The payload risk and change note name the flows, shell verbs and image route, including sidecar-owned limitations.
- [ ] Edwin has one active acceptance test per flow, with an explicit step comparing person use with an agent-session refusal.
- [ ] All task evidence is recorded, FEAT-0029 reaches review, and no human design, test or feature verdict is recorded by this run.
- [ ] Documentation checks and git diff --check pass; changes are committed on lane/codex with the required Codex co-author trailer.

## Steps

- [ ] Run the node suites and documentation validation without opening windows.
- [ ] Finish the adoption, change, risk and acceptance notes with observed evidence.
- [ ] Commit the reviewable work and hand the review and human walks to Claude and Edwin.

## Notes

The user authorizes implementation in this worktree on `lane/codex`. Claude merges; this run does not push, merge, open windows or write either sibling repository. Completed work and test evidence are recorded before this task moves to done.

## Evidence

Not run yet.
