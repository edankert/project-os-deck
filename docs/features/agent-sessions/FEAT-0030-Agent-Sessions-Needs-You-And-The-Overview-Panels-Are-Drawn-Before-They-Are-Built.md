---
type: "[[feature]]"
id: FEAT-0030
aliases: ["FEAT-0030"]
title: "Agent sessions, Needs you and the cockpit's overview panels are drawn before they are built: a design page from real recorded sessions"
status: doing
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-21: 'it also needs to have the claude and codex terminal functionality. Including the Needs You section and the project overview panels of the cockpit? Review and suggest how to introduce this. (Note: the terminals could be more like the T3code solution.'", "Edwin 2026-10-22: 'I agree with option B, start after the overview phase and start the design page for the agent sessions.'"]
goal: "Edwin can look at Deck's agent sessions, its one Needs you and the cockpit's overview panels drawn from real recorded sessions and tickets, and accept or change the design before any of it is built."
requirements: []
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[PHASE-0004-Parity]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]]"]
tasks: ["[[TASK-0178]]"]
---

# Agent sessions, Needs you and the overview panels are drawn before they are built

## Goal

**Edwin sees Deck's agent sessions as pictures before any of them is built.** [[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]] settles that Deck runs its own Claude and Codex sessions, drawn as conversations beside the tickets they work on. This feature draws that, with the one Needs you and the cockpit's overview panels, as a design page from the sessions the cockpit has recorded.

The build itself comes after [[PHASE-0005-Overview]] (Edwin, 2026-10-22), in features cut when [[PHASE-0004-Parity]] opens.

## Scope

- [[DES-0006-Agent-Sessions-Stand-Beside-The-Work]] and its page, drawn on the towers ring: agents at the towers they work on, a session opened as a conversation, Needs you with permission requests first, the cockpit's overview panels as pictures, the shell drawer, and starting a session from a ticket.
- The sessions come from the cockpit's own records (`.cockpit/sessions.json`, `approvals.json` and the agent state in each repository), reduced to what may be committed: ids, agents, states, times, tickets, file counts, cost and context, tool names and counts. No prompt or reply text.

Out of scope: any code in Deck's application. Building is PHASE-0004's work after Overview.

## Acceptance

- DES-0006 is `proposed`, with its page and pictures on both workspaces, and asks Edwin what to change.
- Nothing on the page is entered by hand: sessions, tickets and counts come from the recorded files and the overview fixtures.

## Where this stands

2026-10-22: started, with [[TASK-0178]].
