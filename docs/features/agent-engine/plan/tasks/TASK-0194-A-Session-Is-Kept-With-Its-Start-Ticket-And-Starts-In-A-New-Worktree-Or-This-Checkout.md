---
type: "[[task]]"
id: TASK-0194
aliases: ["TASK-0194"]
title: "A session is kept in Deck's store with the ticket it was started on, starts in a new git worktree or this checkout, and resumes after Deck restarts"
status: backlog
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"
effort: M
due: ""
depends: ["[[TASK-0191]]", "[[TASK-0192]]"]
blocks: ["[[TASK-0195]]", "[[TASK-0196]]"]
related: ["[[RISK-0016]]"]
tests: ["[[TST-0104]]"]
---

# A session is kept with its start ticket and starts in a worktree or this checkout

**A session Deck starts outlives the window and the app: Deck remembers it, the ticket it was started for and the folder it runs in.** The session manager in the main process owns every live provider.

## Definition of Done

- [ ] `desktop/src/main/agents/sessions.ts` starts a session for a workspace and a ticket with a provider, a model, an effort, an access level and a place (a new worktree or this checkout), and keeps its record in Deck's store.
- [ ] Each session's conversation is written to its own file under Electron's user-data folder, never inside a repository ([[RISK-0016]]).
- [ ] A new worktree is made with `git worktree add -b deck/<ticket>-<short id>` in `<repo>-worktrees/<ticket>-<short id>`, beside the repository. A dirty checkout does not stop it; a failed `git worktree add` gives a session that fails with git's message. Deck never removes a worktree.
- [ ] After a restart, every session that was working or waiting is shown as idle with Resume, and Resume continues it through its provider.
- [ ] Two sessions on one ticket are allowed and kept apart.
- [ ] The suite checks start, the store record, the worktree command line (against a temporary git repository), restart and resume, with the fake provider.

## Notes

The cockpit records no start ticket. For a session Deck starts, the ticket is exact; that is what FEAT-0033 draws the marker over.
