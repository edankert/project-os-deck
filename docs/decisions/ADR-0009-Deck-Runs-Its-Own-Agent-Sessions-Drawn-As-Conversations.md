---
type: "[[adr]]"
id: ADR-0009
aliases: ["ADR-0009"]
title: "Deck runs its own Claude and Codex sessions and draws each as a conversation beside the tickets it works on, the way T3 Code does, with a shell drawer beside them"
status: accepted
owner: user:edwin
created: 2026-10-22
updated: 2026-10-22
source:
  - "Edwin 2026-10-21: 'Sorry, one more thing to consider since this needs to be a project-os based deck, it also needs to have the claude and codex terminal functionality. Including the Needs You section and the project overview panels of the cockpit? Review and suggest how to introduce this. (Note: the terminals could be more like the T3code solution.'"
  - "Edwin 2026-10-22: 'I agree with option B, start after the overview phase and start the design page for the agent sessions.'"
  - "Edwin 2026-09-07, PHASE-0004: 'I want to see if we can introduce the t3.codes console solution instead of our current console.'"
decision: "Deck starts and owns its own agent sessions: Codex through `codex app-server` and Claude through Anthropic's Agent SDK, each session drawn as a conversation (messages, the plan, files and diffs, permission requests answered in place) and tied to the ticket it works on. A plain shell is a drawer beside them. The sessions report to the cockpit's sidecar the way the cockpit's own do, so either app sees them. It is built in PHASE-0004 Parity, after PHASE-0005 Overview, and drawn first as DES-0006."
context: "The cockpit runs one terminal per workspace inside tmux and learns what an agent does through a Claude Code plugin and Codex hook settings that post to its sidecar. Deck has no terminal code and a read-only connection to the sidecar. T3 Code (MIT, 0.1.1, alpha) has moved from a streamed terminal to a chat-style harness: agents run through `codex app-server` and the Claude Agent SDK, never in a terminal, and its packages are private, so it cannot be used as a library."
alternatives:
  - "A. Copy the cockpit's terminal (tmux, xterm.js, the plugin and hooks). Proven and shares sessions with the cockpit, but a raw terminal is the most text-heavy option, against DES-0005's 'drawn, not written'."
  - "C. Run T3 Code beside Deck and drive it over its MCP endpoint, or embed its web window. Little to build, but alpha, its own look, no knowledge of tickets, and phone notifications only through its hosted relay."
consequences:
  - "New dependencies when it is built: the Claude Agent SDK and node-pty (for the shell drawer); a risk note for each."
  - "Answering permission requests and handing prompts to agents need the sidecar's shell secret: Deck must start its own sidecar with `--secret-stdin`, and only Deck's main process makes those calls, never the renderer or the served host (ADR-0003)."
  - "The routes the sidecar allows only from this machine stay off Deck's served host, which can serve a tablet."
  - "Deck's sessions are not the cockpit's tmux sessions: a session started in one app is seen in the other through the sidecar, not attached to."
  - "Satisfies PHASE-0004's exit criterion that the console decision is recorded as an ADR naming what was evaluated and what was chosen."
supersedes: ""
superseded: ""
amends: ""
related: ["[[PHASE-0004-Parity]]", "[[FEAT-0030-Agent-Sessions-Needs-You-And-The-Overview-Panels-Are-Drawn-Before-They-Are-Built]]", "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[REFERENCE-COCKPIT-ADOPTION]]"]
---

# Deck runs its own agent sessions, drawn as conversations

**Deck will start its own Claude and Codex sessions and show each one as a conversation standing beside the ticket it works on, not as a terminal.** Edwin chose this on 2026-10-22 from three options, and asked for it to be built after the Overview phase and drawn first.

## Context

The cockpit runs agents inside one terminal per workspace. It learns what they do from a Claude Code plugin and Codex hook settings that post to its sidecar, and it answers permission prompts through a secret only its main process holds. Deck has none of this.

T3 Code, which Edwin asked to be considered on 2026-09-07, is no longer a terminal streamed to a window. It is a chat-style harness: it runs Codex through `codex app-server` and Claude through Anthropic's Agent SDK, draws each session as messages, command output, changed files and diffs, and answers permission requests in place. A plain shell is a separate drawer. Its packages are private, so Deck can copy its design but not use its code.

## Decision

Option B of the three Edwin was shown on 2026-10-21:

- Deck's main process starts and owns the sessions: Codex through `codex app-server` (JSON-RPC), Claude through the Agent SDK's `query()`, with resume.
- Each session is drawn as a conversation: the prompt, the agent's steps as tool chips, the plan, files touched with their diffs, the tickets whose status it changed, and permission requests as Approve and Deny.
- A session belongs to a ticket. "Work on this" on a ticket starts one, optionally in its own worktree. The ring shows a marker at the tower of every ticket an agent is working on.
- A shell drawer holds plain terminals, several at once.
- Sessions report to the sidecar the way the cockpit's do, so the cockpit's Needs you sees Deck's agents and Deck's sees the cockpit's.

## Alternatives

- **A. Copy the cockpit's terminal.** Proven, and it shares the tmux sessions with the cockpit. Rejected because a raw terminal is the most text-heavy of the three, against the overview's rule that it is drawn, not written.
- **C. Run T3 Code beside Deck.** Almost nothing to build. Rejected because it is alpha, looks like itself, knows nothing of tickets, and pushes notifications only through its hosted relay.

## Consequences

- When it is built, Deck depends on the Claude Agent SDK and on node-pty for the drawer, each with a risk note.
- The sidecar's shell secret is needed to answer permissions and hand prompts over. Deck starts its own sidecar with `--secret-stdin`, and only the main process uses it (ADR-0003).
- The routes the sidecar allows only from this machine stay off Deck's served host.
- Deck's sessions and the cockpit's terminals are separate processes; each app sees the other's through the sidecar.
- This is the ADR [[PHASE-0004-Parity]]'s exit criteria ask for.

## Decision record

> [!note] Build started — 2026-10-22 (user:edwin)
> Edwin: "Can you build the DES-0006 functionality?" PHASE-0005 Overview has nothing left to build, so PHASE-0004 Parity opens now and the build is FEAT-0032 to FEAT-0035. The decision above is unchanged.
> One consequence is read narrowly while building: Deck answers its own sessions' permission requests in its main process, which needs no shell secret, and keeps borrowing a running sidecar (RISK-0001). It holds the secret, and answers the cockpit's requests, only for a sidecar it started (TASK-0204). This is open for Edwin in PHASE-0004.
