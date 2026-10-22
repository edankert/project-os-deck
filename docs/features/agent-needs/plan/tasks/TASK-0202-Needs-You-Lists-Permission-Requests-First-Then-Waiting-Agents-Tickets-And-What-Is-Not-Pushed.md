---
type: "[[task]]"
id: TASK-0202
aliases: ["TASK-0202"]
title: "Needs you lists permission requests first, then the agents waiting for you, then the tickets by reason, then what is not pushed"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]"
effort: M
due: ""
depends: ["[[TASK-0195]]", "[[TASK-0197]]"]
blocks: ["[[TASK-0204]]"]
related: ["[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]", "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
tests: ["[[TST-0106]]"]
---

# Needs you: permission requests first

**One Needs you panel, top right, counts everything waiting on Edwin and lists it in the order he chose: permission requests, waiting agents, tickets, unpushed work.** It extends the needs-you panel FEAT-0031 built on the towers.

## Definition of Done

- [x] The count adds open permission requests and waiting agents to the tickets that need you.
- [x] Permission requests come first: Deck's own, answered in place with Approve and Deny; then the cockpit's, read from `/api/cockpit/approvals` by the main process, each with its session and tool, and the last answered one with its outcome.
- [x] Then the agents waiting for you; pressing one opens it in the pane.
- [x] Then the tickets by reason, as FEAT-0031's panel already lists them.
- [x] Then what is not pushed: the commits ahead of the upstream and the files changed, from `git rev-list --count @{u}..HEAD` and `git status --porcelain` in the main process. A branch with no upstream says so.
- [x] On the served page the panel shows the tickets by reason only; no request, agent or git line ([[RISK-0015]]).
- [x] [[TST-0106]] (`desktop/tests/agent-needs.test.mjs`) exists and checks the order, the count and the served page's narrower panel.

## Notes

The cockpit's requests are listed whether or not Deck can answer them. [[TASK-0204]] adds answering when Deck holds the sidecar's secret; until then each says "Answer in the cockpit".

## What was built (2026-10-22)

- `desktop/src/shared/agent-needs.ts` and `needsPanel` in `desktop/src/shared/overview-needs.ts`. In the shell, Needs you lists the permission requests first: Deck's own with Approve and Deny, then the cockpit's. After them come the agents waiting for you, then the tickets by reason, then what is not pushed. The count is requests plus waiting agents plus tickets. A Deck session that waits because of a request is counted once, as its request.
- `desktop/src/main/agents/needs.ts` gathers it in the main process. Deck's open requests come only from sessions at work; a request a restart left open is not offered. The cockpit's open ones come from the loopback-only `/api/cockpit/approvals`, leaving out those Deck offered itself. The work not pushed comes from git: the branch, its upstream, the commits ahead and the files changed. The window gets this through a new call, `deck:agents:needs`.
- **A reading recorded:** "the last answered one with its outcome" is the last request answered in Deck. The cockpit's list holds only live requests, so its own answers are not shown.
- The scene check now holds the count to the tickets drawn plus the requests and agents.
- The words on a permission request's buttons live in one constant, `ANSWER_WORD`, which the write-channel guard exempts instead of exempting a whole drawer.
- [[TST-0106]] (`desktop/tests/agent-needs.test.mjs`) has its checks on both fixtures, against a real git repository and a fake sidecar. Four guards were each broken in turn, and each break failed a check.
