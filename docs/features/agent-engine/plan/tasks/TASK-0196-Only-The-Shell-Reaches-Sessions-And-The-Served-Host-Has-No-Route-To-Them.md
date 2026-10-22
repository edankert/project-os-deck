---
type: "[[task]]"
id: TASK-0196
aliases: ["TASK-0196"]
title: "Only the shell reaches sessions: the preload bridge carries them, the capability set gains agents, and Deck's served host has no route to them"
status: doing
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

- [ ] The preload bridge (`desktop/src/preload.ts`) exposes the session calls and a subscription to session events; the main process checks each call's arguments.
- [ ] The capability set (`desktop/src/shared/capability.ts`) gains `agents`: true in the shell, false on the served page.
- [ ] Deck's host (`desktop/src/main/host.ts`) forwards none of the sidecar's agent, session or approval routes, and serves no session data of its own. The host suite checks that each of those paths answers 404 or 405 ([[RISK-0015]]).
- [ ] The renderer's host bridge (`desktop/src/renderer/host-bridge.ts`) gives the served page no session calls at all.

## Notes

The served page shows no session, not even read-only. Reason: the sidecar itself keeps prompt text loopback-only (its deliveries routes), and a tablet on the LAN is not loopback. A read-only view for the tablet would be a new decision.
