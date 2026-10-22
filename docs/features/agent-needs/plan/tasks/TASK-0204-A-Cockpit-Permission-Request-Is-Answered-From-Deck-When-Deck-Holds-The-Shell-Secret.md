---
type: "[[task]]"
id: TASK-0204
aliases: ["TASK-0204"]
title: "A cockpit permission request is answered from Deck's Needs you when Deck started the sidecar and holds its shell secret, and otherwise says to answer it in the cockpit"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0034-One-Needs-You-And-The-Cockpits-Overview-Panels-Stand-On-Decks-Ring]]"
effort: M
due: ""
depends: ["[[TASK-0202]]"]
blocks: []
related: ["[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]", "[[RISK-0013]]", "[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]"]
tests: ["[[TST-0106]]"]
---

# A cockpit permission request answered from Deck

**When Deck started the workspace's sidecar itself, Approve and Deny on one of the cockpit's permission requests work in Deck; when Deck borrowed the cockpit's sidecar, the request says "Answer in the cockpit".**

## Definition of Done

- [x] When Deck starts its own sidecar, it passes `--secret-stdin` and writes the one line the sidecar reads (`{"secret": ...}`, 32 characters or more, made fresh at each start), held only in the main process.
- [x] Approve and Deny on a cockpit request post `/api/cockpit/approve` with the secret header from the main process. The secret never reaches a renderer, the served host, a log or the store.
- [x] A borrowed sidecar gives no secret, so the cockpit's requests show "Answer in the cockpit" and no buttons. Deck still never starts a second sidecar on a repository that has one ([[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]).
- [x] The suite checks both cases against a fake sidecar, and that the secret is not in any payload sent to a renderer.
- [ ] The window run for FEAT-0034 is held until Edwin says, and run in the container first. Moved to [[TASK-0203]], which finishes the feature's screens.

## Notes

ADR-0009 said Deck must start its own sidecar with `--secret-stdin`. That would break RISK-0001's mitigation whenever the cockpit is open on the same repository, which is most days. This task takes the narrower reading and leaves the choice to Edwin (PHASE-0004, Open questions).

## What was built (2026-10-22)

- When Deck starts a sidecar itself, it passes `--secret-stdin`. It writes one line with a fresh secret of 48 hex characters, then closes standard input. The secret stays in a private map of `SidecarSupervisor`, which `secretFor` reads only for a sidecar Deck owns. It is never on a handle, so it never travels with one.
- `answerCockpitApproval` in `desktop/src/shared/write-client.ts` posts `/api/cockpit/approve` with the secret in `X-Cockpit-Secret`. The new call `deck:agents:cockpit-answer` sends only an approval id and allow or deny, with the store's actor. With no secret it refuses, and Needs you shows "Answer in the cockpit" and no buttons. With no actor name it refuses too.
- [[TST-0106]] checks both cases, that the secret is in no payload a window is sent, and that the answer is refused with no actor.
- **Still Edwin's to confirm:** Deck answers the cockpit's requests only through a sidecar it started, the narrower reading of ADR-0009. Deck never starts a second sidecar on a repository whose cockpit is open (RISK-0001).
