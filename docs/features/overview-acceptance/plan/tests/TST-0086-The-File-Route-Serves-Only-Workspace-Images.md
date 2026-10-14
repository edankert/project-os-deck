---
type: '[[test]]'
id: TST-0086
title: The file route serves only workspace images
status: active
owner: system:codex
created: '2026-10-14'
updated: '2026-10-14'
source:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
phase: '[[PHASE-0005-Overview]]'
scope: feature
level: integration
entrypoint: desktop/tests/file-route.test.mjs
command: bash tools/scripts/run-desktop-tests.sh file-route
covers:
- '[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]'
issues: []
tasks:
- '[[TASK-0121-Serve-Only-Images-Under-The-Workspaces-Docs]]'
- '[[TASK-0123-Verify-The-Flows-And-Hand-Them-To-Edwin]]'
artifacts: []
adequacy: ''
mutation_score: ''
reviewed_by: ''
review_date: ''
review_verdict: ''
review_round: ''
related:
- '[[DES-0005-The-Overview-Is-Drawn-Not-Written]]'
---

# The file route serves only workspace images

## Purpose

The image route reads only permitted images from the selected workspace.

## Procedure

- Start the real host against temporary workspace fixtures created inside this worktree.
- GET and HEAD every allowed image type and compare status, content type and body behavior.
- Request traversal, encoded traversal, symlink escape, missing and non-image files; send each non-read method.

## Expected results

- Only permitted files below the resolved docs root are returned.
- HEAD returns no body; every non-read request refuses without forwarding a write.

## Evidence

Not run yet. The executable check holds no verdict in its note status.

## Adequacy

The suite must exercise behavior and independent refusal cases, rather than search implementation source for symbol names.
