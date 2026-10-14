---
type: '[[task]]'
id: TASK-0122
title: Send a person’s flow actions through the shell
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
depends: []
blocks: []
related:
- '[[RISK-0009-Acceptance-Flows-Depend-On-Changing-Sidecar-Payloads-And-Guards]]'
- '[[DES-0005-The-Overview-Is-Drawn-Not-Written]]'
tests:
- '[[TST-0087-Flow-Actions-Use-The-Shell-And-Preserve-Refusals]]'
---

# Send a person’s flow actions through the shell

## Definition of Done

- [ ] The design, test-run and accept flows register through registerScreen, read through input.read and map through the pure module.
- [ ] A person’s explicit control action is the only flow trigger for input.write; required reasons come through input.ask and cancelling writes nothing.
- [ ] Host, preload, main and write-client carry decide, mark-check and acceptance-run using the existing guarded sidecar endpoints.
- [ ] The actor remains the configured person in Deck’s store; an agent identity is never silently relabelled as a person.
- [ ] Fake-sidecar tests assert request bodies, the exact refusal text and zero writes from served-host controls.
- [ ] Deck does not add feature transitions or agent guards missing in the sidecar; limitations are visible and documented.

## Steps

- [ ] Read each existing endpoint and map the request through write-client, preload and main.
- [ ] Register the screens, request reasons where supported, and preserve refusal text.
- [ ] Exercise the real action handlers with fake inputs and the write client with the fake sidecar.

## Notes

The user authorizes implementation in this worktree on `lane/codex`. Claude merges; this run does not push, merge, open windows or write either sibling repository. Completed work and test evidence are recorded before this task moves to done.

## Evidence

Not run yet.
