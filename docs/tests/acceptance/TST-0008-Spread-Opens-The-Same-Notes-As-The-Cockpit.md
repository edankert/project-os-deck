---
type: "[[test]]"
id: TST-0008
aliases: ["TST-0008"]
title: "Spread opens the same notes as the cockpit, for this repository, checked side by side"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
area: "spread"
---

# Spread opens the same notes as the cockpit

## Purpose

The first exit criterion of [[PHASE-0001-Deck]]. Deck is not a second opinion about the record: for a project-os repository it shows what the cockpit shows.

## Procedure

- Open this repository in the cockpit and in Deck at the same time.
- Pick the features view in both.
- Compare the note ids listed, in order, and the status shown against each.
- Repeat for the issues view and the tests view.

## Expected results

- The same note ids appear in both, in the same order, with the same statuses.
- A difference is a defect in Deck, and is filed rather than explained.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
