---
type: "[[feature]]"
id: FEAT-0034
aliases: ["FEAT-0034"]
title: "One Needs you, with permission requests first, and the cockpit's four overview panels stand on Deck's ring, hidden by one remembered toggle"
status: review
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-23
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'", "Edwin 2026-10-22, on DES-0006: 'It should be possible to hide the overview panels - Think it would be good to do permission requests first?'"]
goal: "On Deck's ring Edwin sees everything waiting on him in one Needs you, permission requests first, and the cockpit's overview panels (since you last looked, the record, the checks, decisions waiting), which one button hides."
requirements: []
tasks: ["[[TASK-0202]]", "[[TASK-0203]]", "[[TASK-0204]]", "[[TASK-0210]]", "[[TASK-0218]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"
reviewed_by: ["model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-23
review_verdict: approved
review_round: 2
related: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]", "[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]", "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]", "[[RISK-0015]]"]
---

# One Needs you and the cockpit's overview panels

## Goal

**Everything waiting on Edwin is in one panel, top right, in the order he chose: permission requests, waiting agents, tickets, unpushed work.** The cockpit's four overview panels stand top left, and ◫ Overview hides them. Both are drawn in [[DES-0006-Agent-Sessions-Stand-Beside-The-Work]].

## Scope

- **Needs you**, extending the panel [[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]] built: the count; permission requests (Deck's own, then the cockpit's); agents waiting; tickets by reason; commits ahead of the upstream and files changed.
- **The cockpit's overview panels**: since you last looked with Caught up; the record; the checks; waiting on a decision. ◫ Overview hides them at any width and Deck remembers the choice; the Agents list moves up into their place.
- **Answering the cockpit's permission requests**, when Deck started the sidecar and holds its shell secret.

Out of scope:

- Answering a cockpit request through a sidecar Deck borrowed. Such a request says "Answer in the cockpit".
- The cockpit's project line, its Open in cockpit button and its prompt commands (`shell.agents.project-line`, `shell.agents.open-in-cockpit`, `shell.agents.prompt-commands`).
- The served page beyond the tickets by reason ([[RISK-0015]]).

## Decisions taken in planning

- **Caught up is covered by ADR-0003.** Its decision is a write from the main process to an existing guarded sidecar endpoint over loopback, never through the served host, and `/api/cockpit/caught-up` is such an endpoint. DES-0006 said it was not covered yet; the clause about the verb registry is about note verbs. Recorded in [[TASK-0203]].
- **Deck holds the shell secret only for a sidecar it started.** Deck keeps borrowing a running sidecar ([[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]), which gives no secret, so it answers the cockpit's requests only when it started the sidecar itself. This narrows ADR-0009's consequence that Deck "must start its own sidecar with `--secret-stdin`"; it is Edwin's to confirm ([[TASK-0204]]).

## Acceptance

- Needs you's count equals the open permission requests, plus the waiting agents, plus the tickets that need you; its sections come in that order, then unpushed work.
- A permission request from one of Deck's sessions is answered from Needs you and the agent continues.
- With Deck's own sidecar, a cockpit request is answered from Deck and the cockpit's terminal goes on; with a borrowed one, it says "Answer in the cockpit" and has no buttons.
- Caught up empties since you last looked, and the cockpit's own digest is empty after it.
- ◫ Overview hides and shows the four panels and the choice survives a restart.

## Verification

Built on 2026-10-22, [[TASK-0202]] to [[TASK-0204]]. [[TST-0106]] (`bash tools/scripts/run-desktop-tests.sh agent-needs`) has 17 checks against both fixtures, a real git repository and a fake sidecar; `cd desktop && npm test` passes. The walk `bash tools/scripts/walk-in-a-box.sh agent-needs` ran the panels, ◫ Overview, Caught up and a request answered from Needs you in a real Deck window in the container: 12 checks, all held.

Not yet shown: a cockpit request answered from Deck through a sidecar Deck started, against the real cockpit (the suite shows Deck's side with a fake). Edwin's acceptance test is [[TST-0108]].

## Review

**Round one, 2026-10-22, at 7e9e42d: changes requested by one reviewer, approved with one finding by the other.** Both ran `claude-opus-5-5` from the packet, each in its own worktree.

What they found, each fixed in [[TASK-0210]]:

- A cockpit request would usually be gone before Needs you showed it. Deck started its sidecar with no approval wait, so the sidecar used its default of 5 s and handed the request back to the cockpit's terminal, while Deck read the requests every 15 s. Found by reading the code against the cockpit's; not run against a real cockpit.
- TST-0106's check that only a sidecar Deck started gives its secret matched the source text. Returning the secret for a borrowed sidecar, with the text kept, passed all 17 checks.
- Nothing tested the line that decides whether a cockpit request gets Approve and Deny. Setting it to true passed every check; the answer call would still have refused, so the harm was a wrong panel.

Also changed: a stopped sidecar's secret is forgotten with its record. Not changed: "the choice survives a restart" is shown by a window reload, which reads the same `localStorage` a restart does; the cockpit's four panels also draw on a served page, without Caught up, which nothing in the Scope rules out; and the answer action joins its fields with ":", which holds while session ids carry no colon, as Deck's and the cockpit's do not.

**Round two, 2026-10-23, at 86854d0: approved by both reviewers.** Each broke every fix in turn and saw a check fail for all three findings. Both found one line no check guarded: the start path could have gone back to writing the line without the wait. A check now fails if it does ([[TASK-0210]]). The renderer's 3-second timer is still guarded by reading only, as the task says.

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Adoption rows this moves: `shell.agents.approvals`, `shell.agents.permission-answer` (in part) and `shell.pages.overview` (the digest, watermark and unpushed commits) ([[REFERENCE-COCKPIT-ADOPTION]]), updated at close-out.
