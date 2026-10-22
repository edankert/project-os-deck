---
type: "[[plan]]"
title: "Plan for FEAT-0034: one Needs you and the cockpit's overview panels"
status: draft
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]"]
implements: ["[[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]"]
related: ["[[PHASE-0004-Parity]]", "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
---

# Plan for FEAT-0034

Three tasks, one commit each. [[TASK-0202]] creates the `agent-needs` suite ([[TST-0106]]). [[TASK-0204]] carries the feature's one window run.

## Delivery sequence

1. [[TASK-0202]] Needs you in Edwin's order: permission requests, waiting agents, tickets by reason, unpushed work.
2. [[TASK-0203]] The four overview panels, Caught up through the shell, and the remembered ◫ Overview toggle.
3. [[TASK-0204]] Answering the cockpit's requests when Deck started the sidecar with `--secret-stdin`; "Answer in the cockpit" otherwise.

## Dependencies

- **Hard:** [[TASK-0195]] (Deck's requests reach the sidecar) and [[TASK-0197]] (a waiting agent opens in the pane) before TASK-0202.
- **Soft:** TASK-0203 can be built beside TASK-0202; it touches the left of the ring and Needs you the right.

## Open questions

- Whether Deck should start its own sidecar, with the secret, even when the cockpit's is running. The default is no ([[TASK-0204]], Notes).
