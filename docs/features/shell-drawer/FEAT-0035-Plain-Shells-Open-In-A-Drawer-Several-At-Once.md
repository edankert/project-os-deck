---
type: "[[feature]]"
id: FEAT-0035
aliases: ["FEAT-0035"]
title: "Plain shells open in a drawer at the bottom of Deck, several at once, one tab each, each named by its workspace"
status: review
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-23
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'", "Edwin 2026-09-07, PHASE-0004: 'I want to see if we can introduce the t3.codes console solution instead of our current console.'"]
goal: "In Deck's shell Edwin opens a drawer of plain terminals, several at once, each in a workspace's folder or a session's worktree, without leaving Deck."
requirements: []
tasks: ["[[TASK-0205]]", "[[TASK-0206]]", "[[TASK-0211]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"
reviewed_by: ["model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-23
review_verdict: approved
review_round: 2
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

Built on 2026-10-22, [[TASK-0205]] and [[TASK-0206]]. [[TST-0107]] (`bash tools/scripts/run-desktop-tests.sh shell-drawer`) has 8 checks on a fake pty; `cd desktop && npm test` passes. The walk `bash tools/scripts/walk-in-a-box.sh shell-drawer --copy` ran real shells through node-pty in a Deck window in the container: 9 checks, all held.

Not yet shown: that quitting Deck leaves no shell process running, in a real quit. The suite shows every shell is killed, and Deck's quit calls it, but no run has looked for leftover processes afterwards. Edwin's acceptance test is [[TST-0108]].

## Review

**Round one, 2026-10-22, at b65ccf4: changes requested by both reviewers.** Both ran `claude-opus-5-5` from the packet, each in its own worktree. Neither could refute a behaviour in the code; the refutations are of the tests and of one claim.

What they found, each fixed in [[TASK-0211]]:

- Nothing tested that quitting ends the shells. Deleting `shells.closeAll()` from `shutdown()` passed every check, and [[TST-0108]] had no line looking for a shell left after a quit. Both reviewers ran real shells through node-pty themselves and found the mechanism works.
- Nothing tested the served page's capability guard in `Host.shells()`.
- The claim that the terminal frame has no bridge was wrong. The frame is served from Deck's own origin, so script in it could reach the page's bridge; what keeps it harmless is that it runs only Deck's own script files.
- A window reloaded or closed left its shells running with no tab to reach them until Deck quit.
- An exit that arrived before a frame was ready was lost, and a paste over 65,536 characters was dropped without a word.

Left as they are: every shell's output goes to every Deck window, which now draws every running shell; the frame's own messages are checked by origin and source, a guard no node suite runs because it lives in the frame; and a session whose worktree was deleted would open its shell in a missing folder, which node-pty refuses with its own error.

**Round two, 2026-10-23, at 86854d0: approved by both reviewers.** Each broke every fix in turn and saw a check fail. The quit is covered by a check on real shells and by a reading of `shutdown()`, which no suite can run. One reviewer found the fourth finding only half fixed: a window already open did not pick up a shell another window opened later. It does now, with a check ([[TASK-0211]]). Whether [[TST-0108]] finds no shell left after a real quit is Edwin's step.

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Adoption row this moves: `shell.terminal` ([[REFERENCE-COCKPIT-ADOPTION]]), as `replaced by` the drawer, updated at close-out.
