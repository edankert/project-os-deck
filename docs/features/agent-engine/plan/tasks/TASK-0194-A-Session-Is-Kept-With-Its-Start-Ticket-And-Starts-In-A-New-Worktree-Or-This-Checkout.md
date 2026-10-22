---
type: "[[task]]"
id: TASK-0194
aliases: ["TASK-0194"]
title: "A session is kept in Deck's store with the ticket it was started on, starts in a new git worktree or this checkout, and resumes after Deck restarts"
status: done
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

- [x] `desktop/src/main/agents/sessions.ts` starts a session for a workspace and a ticket with a provider, a model, an effort, an access level and a place (a new worktree or this checkout), and keeps its record in Deck's store.
- [x] Each session's conversation is written to its own file under Electron's user-data folder, never inside a repository ([[RISK-0016]]).
- [x] A new worktree is made with `git worktree add -b deck/<ticket>-<short id>` in `<repo>-worktrees/<ticket>-<short id>`, beside the repository. A dirty checkout does not stop it; a failed `git worktree add` gives a session that fails with git's message. Deck never removes a worktree.
- [x] After a restart, every session that was working or waiting is shown as idle with Resume, and Resume continues it through its provider.
- [x] Two sessions on one ticket are allowed and kept apart.
- [x] The suite checks start, the store record, the worktree command line (against a temporary git repository), restart and resume, with the fake provider.

## Notes

The cockpit records no start ticket. For a session Deck starts, the ticket is exact; that is what FEAT-0033 draws the marker over.

## What was built (2026-10-22)

- `desktop/src/main/agents/sessions.ts`: `SessionManager` owns every live session. Records go in `<userData>/agents/sessions.json`, written atomically; each conversation in `<userData>/agents/<id>.jsonl`, one record a line. Nothing is written in a repository.
- **A new worktree** comes from `git worktree add -b deck/<ticket>-<id> <repo>-worktrees/<ticket>-<id> HEAD`, beside the repository, so neither the validator nor Deck's index walks it. A dirty checkout does not stop it; a refusal gives a failed session whose last record carries git's own words. Deck never removes a worktree.
- **After a restart** a session that was working or waiting comes back idle, with a record saying Deck restarted; a prompt to it resumes the agent by its own id. `stopAll` stops every live session, for Deck's quit.
- [[TST-0104]] has 16 checks, on a real temporary git repository and the fake provider. Keeping a session's state across a restart fails one.
