---
type: "[[test]]"
id: TST-0081
title: "The overview route is read-only and cached"
status: active
owner: system:codex
created: 2026-10-14
updated: 2026-10-15
source: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
phase: "[[PHASE-0005-Overview]]"
scope: feature
level: integration
entrypoint: "desktop/tests/overview-route.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh overview-route"
covers: ["[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]"]
issues: []
tasks: ["[[TASK-0144]]", "[[TASK-0116-Serve-And-Print-The-Overview]]"]
artifacts: []
adequacy: "The suite observes build calls and response data across revisions. Refused methods and missing workspaces must return their specific failures rather than a success payload."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[PHASE-0005-Overview]]"]
---

# The overview route is read-only and cached

## Purpose

The overview is readable through Deck’s host and updates with the index without rebuilding on every request.

The test holds no verdict in its status. Its command builds the modules and runs the node suite.

## Procedure

- Drive the host handler with Node HTTP messages against a temporary workspace; also request it through a real localhost socket.
- Repeat the request at the same revision, then change notes and ledger files independently. Check sealed histories, platform gaps and malformed ledgers.
- Try write methods and unknown workspaces; run the print command against a temporary repository.

- Change the verification day and snapshot staleness threshold without changing the note index; the manual-test fill refreshes.

## Expected results

- The model is returned on the served host and a changed revision refreshes it.
- Repeated reads reuse the current model and no write method mutates notes.
- The command prints phase counts or parseable JSON and exits without a window.

## Evidence

2026-10-15: `cd desktop && npm test` passes 764 tests, with zero failures and zero skips. The overview-route suite passes 13 tests. Manual verification refreshes when the local date crosses the project threshold and when SNAPSHOT.yaml changes that threshold, without requiring a note-index revision. The executable check holds no verdict in its note status.

## Adequacy

The suite observes build calls and response data across revisions. Refused methods and missing workspaces must return their specific failures rather than a success payload.
