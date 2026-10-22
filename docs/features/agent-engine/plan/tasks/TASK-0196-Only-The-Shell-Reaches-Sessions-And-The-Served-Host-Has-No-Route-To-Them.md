---
type: "[[task]]"
id: TASK-0196
aliases: ["TASK-0196"]
title: "Only the shell reaches sessions: the preload bridge carries them, the capability set gains agents, and Deck's served host has no route to them"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]"
effort: S
due: ""
depends: ["[[TASK-0194]]"]
blocks: ["[[TASK-0197]]"]
related: ["[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[RISK-0015]]"]
tests: ["[[TST-0104]]"]
---

# Only the shell reaches sessions

**A window in the shell can list, start, answer, send to and stop sessions; a page served to the tablet cannot do any of it, and cannot read a session either.** This is the door FEAT-0033 draws through.

## Definition of Done

- [x] The preload bridge (`desktop/src/preload.ts`) exposes the session calls and a subscription to session events; the main process checks each call's arguments.
- [x] The capability set (`desktop/src/shared/capability.ts`) gains `agents`: true in the shell, false on the served page.
- [x] Deck's host (`desktop/src/main/host.ts`) forwards none of the sidecar's agent, session or approval routes, and serves no session data of its own. The host suite checks that each of those paths answers 404 or 405 ([[RISK-0015]]).
- [x] The renderer's host bridge (`desktop/src/renderer/host-bridge.ts`) gives the served page no session calls at all.

## Notes

The served page shows no session, not even read-only. Reason: the sidecar itself keeps prompt text loopback-only (its deliveries routes), and a tablet on the LAN is not loopback. A read-only view for the tablet would be a new decision.

## What was built (2026-10-22)

- `desktop/src/main/agents/ipc.ts`: seven calls (`list`, `conversation`, `start`, `send`, `answer`, `interrupt`, `stop`), each argument checked. A start names its workspace by id and Deck's own list gives the folder; a folder the window sends is ignored. Only Claude and Codex, the two access levels, the two places, a ticket id shaped as one, and a non-empty prompt are accepted; an answer only allows or denies.
- `desktop/src/main/main.ts` makes the session manager in `<userData>/agents` with both providers and the sidecar reporter, sends every change to every window as `deck:agents:change`, and stops every session when Deck quits.
- The preload bridge has an `agents` namespace; the capability set has `agents`, true in the shell and false when served; the renderer's `Host.agents()` is null on a served page.
- Deck's host forwards none of the sidecar's agent, session or approval routes: ten of them, by GET and by POST, answer 403 or 405, and the fake sidecar received nothing.
- **ADR-0003's guard caught the reporter.** It posted to the sidecar outside the write client, which the write-channel suite forbids. The post now leaves through `postAgentReport` in `desktop/src/shared/write-client.ts`, which sends only to the three agent-report paths and refuses any other before sending.
- [[TST-0104]] has 25 checks. The full node run passes: 888, with the count of Deck's features now 35.
