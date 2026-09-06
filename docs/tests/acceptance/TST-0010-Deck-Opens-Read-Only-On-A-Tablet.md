---
type: "[[test]]"
id: TST-0010
aliases: ["TST-0010"]
title: "Deck served over the local network opens on a tablet, reads the notes and refuses writes"
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
covers: ["[[FEAT-0008-One-Renderer-Two-Hosts]]"]
issues: []
tasks: []
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
area: "two hosts"
---

# Deck served over the local network opens on a tablet

## Purpose

The third exit criterion of [[PHASE-0001-Deck]]. It needs a tablet on the same network, which is why it is walked.

## Procedure

- Start Deck with its host bound beyond loopback and note the address it reports.
- Open that address in Safari on a tablet on the same network.
- Move through the views and open several notes.
- Confirm no pop-out window action is offered anywhere in the interface.
- From the tablet, attempt a write against the API path with a tool that can send a `POST`, and observe the response.

## Expected results

- The tablet shows the same views and cards as the shell.
- No shell-only action is present in the interface, rather than present and disabled.
- The `POST` is refused with 405 and nothing changes in the repository.

## Evidence (fill after running)

- The walk's verdict is a dated event in the release ledger, not a status on this note.
