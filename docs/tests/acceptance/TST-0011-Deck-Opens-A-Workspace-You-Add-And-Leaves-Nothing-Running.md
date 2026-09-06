---
type: "[[test]]"
id: TST-0011
aliases: ["TST-0011"]
title: "Deck opens a workspace you add, and leaves nothing running when you quit"
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
covers: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
area: "shell"
---

# Deck opens a workspace you add

## Purpose

The claim a person settles for [[FEAT-0002-Deck-Opens-A-Workspace]]: Deck opens, a folder you point it at becomes a workspace or is refused with a reason, and quitting cleans up after itself.

## Procedure

- Start Deck with `cd desktop && npm start`.
- Add a project-os repository from the rail, and open it.
- Add a folder that is neither a repository nor a vault, and read what Deck says.
- With the cockpit open on the same repository, open it in Deck and check the status line: it should say it is using the sidecar that is already running.
- Quit Deck. In a terminal, look for a sidecar process still running for that repository.

## Expected results

- The workspace appears in the rail with its name and kind, and its notes are drawn as cards.
- The folder that is neither is refused, and the message names what it was looking for.
- Opening a repository the cockpit already has open reuses that sidecar rather than starting a second one.
- After quitting, no sidecar that Deck started is still running. A sidecar the cockpit started is still running, which is correct.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
