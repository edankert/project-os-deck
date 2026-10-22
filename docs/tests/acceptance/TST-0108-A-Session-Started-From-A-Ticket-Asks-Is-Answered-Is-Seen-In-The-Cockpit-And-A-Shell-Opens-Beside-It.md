---
type: "[[test]]"
id: TST-0108
aliases: ["TST-0108"]
title: "A session started from a ticket in Deck asks before it acts, is answered in place, is seen in the cockpit, and a shell opens beside it"
status: draft
owner: user:edwin
created: 2026-10-22
updated: 2026-10-22
source: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"]
phase: "[[PHASE-0004-Parity]]"
scope: system
level: acceptance
entrypoint: "Deck desktop, the towers ring"
command: ""
last_verified: ""
covers: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]", "[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]", "[[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]", "[[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]"]
issues: []
tasks: ["[[TASK-0201]]"]
artifacts: []
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[TST-0103]]"]
area: "agents"
after: ["[[TST-0103]]"]
---

# A session started from a ticket asks, is answered, is seen in the cockpit, and a shell opens

## Purpose

**Edwin checks in Deck itself that he can start an agent on a ticket, answer what it asks, see it from the cockpit, and open a shell beside it.** It stays `draft` until [[TASK-0201]] checks these steps against the build.

## Setup

Deck and the cockpit both open on Deck's own repository; the cockpit's sidecar is the one running. Claude Code and `codex` are signed in. A real session spends a little of Edwin's usage; pick a ticket whose work only reads, or Stop the session after its first request.

## Steps

1. On the towers, press a backlog task's tower, then Work on this on its card.
2. Choose Claude, leave Ask before acting and This checkout, and press Start.
3. Ask it, in the composer, to run a command that writes, for example `touch deck-check.txt`. A command that only reads, such as `git status`, runs without asking: Claude Code allows read-only commands in its default mode.
4. Press Approve on the request at its turn.
5. In the cockpit, look at its agents and its Needs you.
6. In Deck, press ⌘ Shells, then New shell, then Open its shell in the session's pane.
7. Repeat steps 1 to 4 with Codex.
8. Press ◫ Overview twice, then quit and reopen Deck.

## Expect

- The session's marker stands over the task's tower, and the pane shows the first prompt filled from the task.
- The request appears at its turn and at the top of Needs you before you answer; after Approve the agent goes on and the request shows its outcome.
- The cockpit lists the Deck session in its agents, and showed the request as waiting while it was open.
- Two shell tabs are open, one named by the workspace and one in the session's folder; both take input.
- The overview panels hide and come back; after reopening, the session is listed as idle with Resume, and the panels keep their last state.
- Nothing in Deck offered to skip permissions.

## Not this check

- The served page on the tablet showing no session: [[TST-0104]] and the host suite check it.
- Answering one of the cockpit's own requests from Deck: that depends on which sidecar is running ([[TASK-0204]]).
