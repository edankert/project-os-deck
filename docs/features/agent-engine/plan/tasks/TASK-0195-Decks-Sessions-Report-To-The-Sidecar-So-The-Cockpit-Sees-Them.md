---
type: "[[task]]"
id: TASK-0195
aliases: ["TASK-0195"]
title: "Deck's sessions report to the sidecar through its agent hook and its approvals ask, so the cockpit sees Deck's agents and their permission requests"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"
effort: M
due: ""
depends: ["[[TASK-0194]]"]
blocks: []
related: ["[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]"]
tests: ["[[TST-0104]]"]
---

# Deck's sessions report to the sidecar

**The cockpit sees a session Deck started as it sees its own: in its agent list, in its sessions and, while one waits, in its Needs you.** Deck's main process posts each session's events to the sidecar the same way the cockpit's Claude plugin and Codex hooks do.

## Definition of Done

- [x] Session start, each prompt, each tool use, a permission request, the end of a turn and the end of the session are posted to `POST /api/agent-hook` with `hook_event_name`, `session_id`, `agent` (`claude` or `codex`), `cwd` and the fields the cockpit's `agent_hooks.py` reads. Nothing else is sent: no reply text, and the prompt only where the cockpit's own hook sends it.
- [x] Each permission request is also offered with `POST /api/cockpit/approvals/ask`. When Deck has its answer, Deck withdraws it with `/api/cockpit/approvals/handed-back`. If the record that comes back says the cockpit answered first, that answer is the one the agent gets.
- [x] The posts come from the main process over loopback, with the JSON content type, as [[ADR-0003-Deck-Writes-Through-The-Shell]] requires. They use whichever sidecar Deck is attached to, borrowed or its own ([[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]).
- [x] A sidecar that is down or refuses a post never stops the session; the post is dropped and logged once.
- [x] The suite checks the posts against a recording fake sidecar.
- [x] Checked once by hand against the real sidecar: a Deck session appears in `/api/cockpit/sessions` and `/api/cockpit/agent-state`, and an open request in `/api/cockpit/approvals`. Recorded in Notes, ids only.

## Steps

- [x] Read `../project-os-cockpit/src/project_os_cockpit/agent_hooks.py` and `approvals.py` for the payload each event needs, and send exactly that.
- [x] If a field Deck needs is missing, such as the start ticket, file an issue in the cockpit repository rather than changing the sidecar.

## Notes

The sidecar keeps an approval open only for its configured wait; that wait is for the cockpit plugin, which then falls back to the terminal's own prompt. Deck has no terminal prompt, so Deck's own Needs you holds the request until it is answered, whatever the sidecar's record says.

## What was built (2026-10-22)

- `desktop/src/main/agents/sidecar-report.ts`: `SidecarReporter` turns each session's records into the cockpit's hook events at `POST /api/agent-hook`: SessionStart, UserPromptSubmit with the prompt, PreToolUse and PostToolUse with the tool, PostToolUse with an edit's `file_path`, PermissionRequest, Stop at a turn's end and SessionEnd. Every event carries `session_id` (Deck's own id), `agent` and `cwd`. No reply text is sent.
- Each permission request is offered with `/api/cockpit/approvals/ask`. While it is open, Deck reads the record every two seconds, and a cockpit answer of `granted` or `denied` goes to the agent. Once Deck has its answer, the offer is withdrawn with `/approvals/handed-back`. A post that fails is dropped and logged once per session; the session goes on.
- **Two faults the real sidecar showed**, both fixed with a check each. The events of one session arrived out of order, because each change posted on its own; they now go through a queue per session. And the request ids repeat from session to session, while the sidecar knows a request by its tool use id, so an ask was answered with another session's old record; the id offered is now `<session>:<request>`.
- [[TST-0104]] has 20 checks against a recording fake sidecar. Posting without the queue fails the order check.

## Checked by hand against the real sidecar (2026-10-22)

The cockpit's sidecar for this repository, at `http://127.0.0.1:8770`, with the fake provider (no model): the session appeared in `/api/cockpit/sessions`; its request appeared in `/api/cockpit/approvals` as open, and was handed back once answered; nine events arrived in order; afterwards no approval was left. `/api/cockpit/agent-state` is a route Deck can post to but not read, so it was not read; `/api/cockpit/agents` lists the agent kinds, not sessions. Ids of the check sessions began `deck-sidecar-check-`. Two leftover records from a first, crashed run and a manual probe were closed by posting SessionEnd for their sessions.
