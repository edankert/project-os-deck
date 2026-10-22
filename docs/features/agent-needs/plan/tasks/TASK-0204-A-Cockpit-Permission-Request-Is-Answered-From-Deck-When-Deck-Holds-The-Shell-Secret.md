---
type: "[[task]]"
id: TASK-0204
aliases: ["TASK-0204"]
title: "A cockpit permission request is answered from Deck's Needs you when Deck started the sidecar and holds its shell secret, and otherwise says to answer it in the cockpit"
status: backlog
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]"
effort: M
due: ""
depends: ["[[TASK-0202]]"]
blocks: []
related: ["[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]", "[[RISK-0013]]", "[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]"]
tests: ["[[TST-0106]]"]
---

# A cockpit permission request answered from Deck

**When Deck started the workspace's sidecar itself, Approve and Deny on one of the cockpit's permission requests work in Deck; when Deck borrowed the cockpit's sidecar, the request says "Answer in the cockpit".**

## Definition of Done

- [ ] When Deck starts its own sidecar, it passes `--secret-stdin` and writes the one line the sidecar reads (`{"secret": ...}`, 32 characters or more, made fresh at each start), held only in the main process.
- [ ] Approve and Deny on a cockpit request post `/api/cockpit/approve` with the secret header from the main process. The secret never reaches a renderer, the served host, a log or the store.
- [ ] A borrowed sidecar gives no secret, so the cockpit's requests show "Answer in the cockpit" and no buttons. Deck still never starts a second sidecar on a repository that has one ([[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]).
- [ ] The suite checks both cases against a fake sidecar, and that the secret is not in any payload sent to a renderer.
- [ ] The window run for FEAT-0034 is held until Edwin says, and run in the container first.

## Notes

ADR-0009 said Deck must start its own sidecar with `--secret-stdin`. That would break RISK-0001's mitigation whenever the cockpit is open on the same repository, which is most days. This task takes the narrower reading and leaves the choice to Edwin (PHASE-0004, Open questions).
