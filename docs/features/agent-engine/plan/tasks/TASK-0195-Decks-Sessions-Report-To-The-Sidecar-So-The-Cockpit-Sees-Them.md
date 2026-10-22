---
type: "[[task]]"
id: TASK-0195
aliases: ["TASK-0195"]
title: "Deck's sessions report to the sidecar through its agent hook and its approvals ask, so the cockpit sees Deck's agents and their permission requests"
status: doing
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

- [ ] Session start, each prompt, each tool use, a permission request, the end of a turn and the end of the session are posted to `POST /api/agent-hook` with `hook_event_name`, `session_id`, `agent` (`claude` or `codex`), `cwd` and the fields the cockpit's `agent_hooks.py` reads. Nothing else is sent: no reply text, and the prompt only where the cockpit's own hook sends it.
- [ ] Each permission request is also offered with `POST /api/cockpit/approvals/ask`. When Deck has its answer, Deck withdraws it with `/api/cockpit/approvals/handed-back`. If the record that comes back says the cockpit answered first, that answer is the one the agent gets.
- [ ] The posts come from the main process over loopback, with the JSON content type, as [[ADR-0003-Deck-Writes-Through-The-Shell]] requires. They use whichever sidecar Deck is attached to, borrowed or its own ([[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]).
- [ ] A sidecar that is down or refuses a post never stops the session; the post is dropped and logged once.
- [ ] The suite checks the posts against a recording fake sidecar.
- [ ] Checked once by hand against the real sidecar: a Deck session appears in `/api/cockpit/sessions` and `/api/cockpit/agent-state`, and an open request in `/api/cockpit/approvals`. Recorded in Notes, ids only.

## Steps

- [ ] Read `../project-os-cockpit/src/project_os_cockpit/agent_hooks.py` and `approvals.py` for the payload each event needs, and send exactly that.
- [ ] If a field Deck needs is missing, such as the start ticket, file an issue in the cockpit repository rather than changing the sidecar.

## Notes

The sidecar keeps an approval open only for its configured wait; that wait is for the cockpit plugin, which then falls back to the terminal's own prompt. Deck has no terminal prompt, so Deck's own Needs you holds the request until it is answered, whatever the sidecar's record says.
