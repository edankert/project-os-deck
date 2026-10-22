---
type: "[[risk]]"
id: RISK-0015
aliases: ["RISK-0015"]
title: "The page Deck serves to a tablet could reach a session, a permission answer or a shell, which would let anyone on the network act on Edwin's machine"
status: open
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"]
phase: "[[PHASE-0004-Parity]]"
likelihood: low
impact: high
mitigation: ["[[TASK-0196]]", "[[TASK-0202]]", "[[TASK-0205]]"]
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]"]
---

# The page Deck serves to a tablet could reach a session or a shell

## Description

Sessions, permission answers and shells are the most powerful controls Deck has had: each runs commands. The served host is on the LAN for a tablet and is read-only by ADR-0001 and ADR-0003. A forwarded route, or a renderer call that falls through to the host, would hand those controls to the network. Showing session text there would also send prompts beyond loopback, which the sidecar itself refuses.

## Mitigation

- Sessions and shells are reached through the preload bridge only
- The host forwards no agent, session or approval route
- The capability set says agents: false on the served page
- The host suite checks every such path answers 404 or 405

## Triggers

- The served page shows a marker, a pane, Work on this or ⌘ Shells; the host answers 200 on an agent path.
