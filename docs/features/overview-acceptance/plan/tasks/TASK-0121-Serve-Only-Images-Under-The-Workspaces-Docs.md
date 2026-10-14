---
type: '[[task]]'
id: TASK-0121
title: Serve only images under the workspace’s docs
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
depends: []
blocks: []
related:
- '[[RISK-0009-Acceptance-Flows-Depend-On-Changing-Sidecar-Payloads-And-Guards]]'
- '[[DES-0005-The-Overview-Is-Drawn-Not-Written]]'
tests:
- '[[TST-0086-The-File-Route-Serves-Only-Workspace-Images]]'
---

# Serve only images under the workspace’s docs

## Definition of Done

- [x] GET and HEAD /deck/file/<workspaceId>/<docs-relative path> serve png, jpg, jpeg, gif, webp and svg only from that workspace’s docs root.
- [x] Unknown workspaces, traversal, symlink escapes, unsupported types and non-read methods are refused with no image bytes leaked.
- [x] Runtime image hrefs use this host route and the route suite exercises genuine localhost requests with no skips.

## Steps

- [x] Resolve a workspace’s docs root before opening a requested file.
- [x] Guard methods, extensions and resolved paths, then test successful and refused requests.

## Notes

The user authorizes implementation in this worktree on `lane/codex`. Claude merges; this run does not push, merge, open windows or write either sibling repository. Completed work and test evidence are recorded before this task moves to done.

## Evidence

2026-10-14: `node --test desktop/tests/file-route.test.mjs` passed 4 tests, failed none and skipped none after the TypeScript build. Real HTTP requests exercised all six formats, HEAD, unsafe paths, a symlink escape, refused methods and the three new sidecar GETs.
