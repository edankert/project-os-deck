---
type: "[[task]]"
id: TASK-0207
aliases: ["TASK-0207"]
title: "Review round one: a request is never answered by an old record, an edit report closes nothing, a worktree session reaches the cockpit, and Codex's approvals stay a person's"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["FEAT-0032 independent review, round one, 2026-10-22: both reviewers not approved"]
parent: "[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"
effort: M
due: ""
depends: ["[[TASK-0196]]"]
blocks: []
related: ["[[RISK-0013]]", "[[RISK-0016]]"]
tests: ["[[TST-0104]]"]
---

# Review round one's findings on the session engine

Both reviewers of [[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]] returned it not approved. Each finding below is a defect in code this feature wrote, so it is fixed here.

## Definition of Done

- [x] **A resumed session's request is never answered by an earlier one.** Each provider numbered its requests from 1 on every start, so after a resume the sidecar handed back the first turn's granted record and Deck allowed a command nobody answered. A request's id is now the tool call's own id (Claude's tool use id, Codex's item id), unique for the whole session, and an offer whose record is not open when Deck first reads it is never trusted.
- [x] **The cockpit's card closes when its tool finishes.** The offer carries the tool call's own id, which the tool's PostToolUse also carries, so the sidecar closes the card itself.
- [x] **An edit report closes no approval.** It went with no tool use id, and the sidecar closes every live approval in a session when the id is empty. It now carries an id of its own.
- [x] **A session in a new worktree reaches the cockpit.** The sidecar refuses a hook whose folder is outside its repository, and a worktree sits beside it. Deck reports the workspace's repository as the folder.
- [x] **Codex's approvals are answered by a person.** Deck pins `approvalsReviewer: "user"` when it starts or resumes a thread, so a setting in `~/.codex/config.toml` cannot hand them to a model.
- [x] Stopping a session that is not running records that it stopped, so the cockpit hears SessionEnd; quitting Deck waits for every session to stop and every report to be sent.
- [x] [[TST-0104]] fails when the interrupt's denial, the end's denial or the served host's capability check is removed, and has a check for each finding above.
- [x] What the reviewers corrected in the wording is corrected: the cockpit keeps the prompt text in its gitignored `.cockpit/` folder, as it does for its own sessions; with Codex, "Edit files without asking" also runs commands in the sandbox without asking.

## What was built (2026-10-22)

- **Request ids.** Claude's request is `claude-ask-<tool use id>`, from the SDK's `toolUseID`; Codex's is `codex-ask-<item id>`. Each record keeps the tool call's id as `toolUse`, and the sidecar offer files the card under it. When an agent gives no id, a random one is used.
- **A stale record is never trusted.** After an offer, Deck reads the record the sidecar answered with. If it is not open, that answer belongs to an earlier request: Deck logs it and the request is answered in Deck only.
- **Reports.** An edit report carries `<session>:edit:<time>:<path>` as its tool use id. Every hook reports the workspace's repository as its folder (`root` on the session record) rather than the worktree. Stopping a session that is not running writes a stopped record, which reaches the sidecar as SessionEnd.
- **Codex.** `codexPolicy` adds `approvalsReviewer: "user"` to every thread start and resume.
- **Quitting.** `stopAgents` in `desktop/src/main/main.ts` waits up to 3 seconds for every session to stop and every report to be sent, before the sidecars stop. The quit menu and SIGINT or SIGTERM both go through it.
- The fake sidecar in [[TST-0104]] now hands back its existing record for a repeated session and tool use id, as the real one does. The fake agent still numbers its requests from one on each start, to exercise the guard.
- [[TST-0104]] has 31 checks. Each of the eight guards above was broken in turn, and each break failed at least one check. The end's denial first failed only by a 30-second timeout, which node counts as cancelled; its check now fails within half a second. The full node run passes 900.
