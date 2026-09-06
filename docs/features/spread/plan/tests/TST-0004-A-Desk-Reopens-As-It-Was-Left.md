---
type: "[[test]]"
id: TST-0004
aliases: ["TST-0004"]
title: "A desk reopens as it was left, and a desk naming a note that is gone opens without it"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/desk.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh desk"
covers: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
issues: []
tasks: []
artifacts: []
adequacy: "Caching the band in the desk rather than reading it from the payload fails the status case; dropping the reconciliation fails the missing-note case."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
---

# A desk reopens as it was left

## Purpose

A desk is an arrangement with a name. This suite checks it round-trips through the store and that it degrades rather than fails when the workspace has moved on.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0004` reproduces it locally without writing anything.

## Procedure

- Save a desk of several cards with positions, reload it and assert the cards and positions match.
- Reconcile a desk against a note list that no longer contains one of its notes, and assert the card is dropped and counted.
- Reconcile against a list where a note changed status, and assert the card's band follows the list rather than the saved copy.
- Assert a card model built from a nav payload carries the id, title, type and status band the payload reported.

## Expected results

- A saved desk restores exactly.
- A desk missing one note opens with the rest and reports how many it dropped.
- A card's status band always comes from the current payload, never from what the desk saved.

## Evidence (fill after running)

- `bash tools/scripts/run-desktop-tests.sh desk`, run from the repository root.

## Adequacy (who verifies this test?)

Caching the band in the desk rather than reading it from the payload fails the status case; dropping the reconciliation fails the missing-note case.
