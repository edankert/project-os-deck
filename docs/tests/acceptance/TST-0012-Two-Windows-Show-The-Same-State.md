---
type: "[[test]]"
id: TST-0012
aliases: ["TST-0012"]
title: "Two windows show the same state, and Deck reopens where you left it"
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
covers: ["[[FEAT-0003-One-Store-In-The-Main-Process]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
area: "store"
---

# Two windows show the same state

## Purpose

The claim a person settles for [[FEAT-0003-One-Store-In-The-Main-Process]]. The cockpit fails this: two of its windows never see each other change.

## Procedure

- Open Deck on a workspace, then open a panel in its own window with Pop out.
- In the first window, open a different card.
- Look at the second window without touching it.
- Save a desk in one window and look at the desk list in the other.
- Quit Deck completely and start it again.

## Expected results

- The second window follows the first: the card that is open in one is marked as current in the other, with no reload and no click.
- A desk saved in one window appears in the other's list.
- After a restart Deck reopens the same workspace, the same view and the same note, with that note showing in the reader.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
