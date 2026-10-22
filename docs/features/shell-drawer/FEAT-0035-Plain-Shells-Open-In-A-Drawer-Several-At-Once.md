---
type: "[[feature]]"
id: FEAT-0035
aliases: ["FEAT-0035"]
title: "Plain shells open in a drawer at the bottom of Deck, several at once, one tab each, each named by its workspace"
status: planned
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'", "Edwin 2026-09-07, PHASE-0004: 'I want to see if we can introduce the t3.codes console solution instead of our current console.'"]
goal: "In Deck's shell Edwin opens a drawer of plain terminals, several at once, each in a workspace's folder or a session's worktree, without leaving Deck."
requirements: []
tasks: ["[[TASK-0205]]", "[[TASK-0206]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"
reviewed_by: ""
review_date: ""
review_verdict: ""
review_round: ""
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]", "[[RISK-0014]]", "[[RISK-0015]]", "[[RISK-0010-Three-Js-Is-A-New-Runtime-Dependency-Of-The-Renderer]]"]
---

# Plain shells open in a drawer

## Goal

**⌘ Shells opens a drawer of plain terminals at the bottom of Deck; each is a tab, and several run at once.** [[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]] put agents in conversations and plain shells in this drawer, as T3 Code does.

## Scope

- Shells owned by Deck's main process through `node-pty`, each in a folder: the current workspace's, or an agent session's worktree from its pane's Open its shell.
- A drawer drawn with xterm.js, vendored into the renderer the way three.js is, with tabs: New shell, switch, close.
- Every shell ends when Deck quits.

Out of scope:

- A shell that survives a Deck restart. PHASE-0004's console criterion asks for it; the drawer does not, and whether it is still wanted is Edwin's question.
- Consoles as furniture that drag, resize and fade over the field. That was PHASE-0004's earlier picture of a console; ADR-0009 and DES-0006 replaced it with the drawer.
- Running an agent in a shell. Agents run through FEAT-0032.
- The served host ([[RISK-0015]]).

## Acceptance

- ⌘ Shells opens the drawer; New shell opens a working login shell in the workspace's folder; three shells run at once in three tabs.
- Open its shell from a session opens a tab in that session's worktree.
- Quitting Deck leaves no shell process running.
- The served page has no drawer and no ⌘ Shells.

## Verification

Not built yet. [[TST-0107]] is `bash tools/scripts/run-desktop-tests.sh shell-drawer`; [[TASK-0205]] creates it. Edwin's acceptance test is [[TST-0108]].

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Adoption row this moves: `shell.terminal` ([[REFERENCE-COCKPIT-ADOPTION]]), as `replaced by` the drawer, updated at close-out.
