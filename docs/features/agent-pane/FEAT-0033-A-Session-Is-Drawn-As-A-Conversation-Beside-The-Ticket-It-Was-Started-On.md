---
type: "[[feature]]"
id: FEAT-0033
aliases: ["FEAT-0033"]
title: "A session is drawn as a conversation in the side pane beside the ticket it was started on, agents stand over their tickets on the towers, and Work on this starts one"
status: review
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-23
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'", "Edwin 2026-10-22, on DES-0006: 'I think side pane as suggested but open for discussion - The ones they started on (is this not the same?)'"]
goal: "In Deck's shell, Edwin opens any agent session from its marker on the towers or from the Agents list, reads its conversation in the side pane, answers its permission requests in place, sends it a prompt, and starts a new one from a ticket with Work on this."
requirements: []
tasks: ["[[TASK-0197]]", "[[TASK-0198]]", "[[TASK-0199]]", "[[TASK-0200]]", "[[TASK-0201]]", "[[TASK-0209]]"]
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"
reviewed_by: ["model:claude-opus-5-5", "model:claude-opus-5-5"]
review_date: 2026-10-23
review_verdict: approved
review_round: 2
related: ["[[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]]", "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]", "[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[RISK-0013]]", "[[RISK-0015]]", "[[RISK-0016]]"]
---

# A session is drawn as a conversation beside its ticket

## Goal

**Edwin sees each agent standing over the ticket it was started on, opens it, and reads and answers it in the side pane.** This draws what [[FEAT-0032-Deck-Starts-And-Owns-Claude-And-Codex-Sessions-Each-Tied-To-The-Ticket-It-Was-Started-On]] runs, the way [[DES-0006-Agent-Sessions-Stand-Beside-The-Work]] draws it. Where this note and the design page disagree, the page wins unless a line below says otherwise.

## Scope

On Deck's towers (`desktop/src/renderer/overview-towers-view.ts`, `desktop/src/renderer/overview.ts`) and new modules `desktop/src/shared/agent-pane.ts` and `desktop/src/renderer/agent-pane.ts`:

- **The session pane**, wide, on the right: the head, context and usage bars and minutes, the tickets the session moved, then the conversation turn by turn. Prompts are bubbles with their real text; the agent's steps are chips with counts; edits show lines added and removed with the diff behind a press; the plan is a checklist; permission requests stand at their turn with Approve and Deny. A waiting session ends with "Claude is waiting for you".
- **The composer**: model, effort, access level, Send; Interrupt while working; Resume, Open its shell and Stop.
- **Agents on the towers**: a marker over each session's start ticket, coloured by state and ringed by agent; a working one breathes.
- **The Agents list**, left middle: every session, Deck's and the cockpit's.
- **Work on this** on a ticket's card, with its dialog.

Out of scope:

- The served host. It shows no session, no marker and no Work on this ([[RISK-0015]]).
- Sending a prompt to one of the cockpit's own sessions. Those open read-only in the pane, with what the sidecar records.
- A larger session window over the ring. Edwin chose the side pane and left it open; the layout is kept separate from where it is drawn, so the window can come later.
- Any cost. Context and usage show; dollars never do.

## Decisions taken in planning

- **The real words are shown in the shell.** The design page draws counts because Deck's repository is public. A live pane shows a session that stays on Edwin's machine, so it shows the prompts and replies themselves ([[RISK-0016]] covers anything committed).
- **The cockpit's sessions stand over the first ticket they moved**, as on the design page, because the cockpit records no start ticket. Deck's own sessions stand over their exact start ticket.
- **The open session is part of the overview's address**, like the selected ticket.

## Acceptance

- Each session on the workspace stands over its start ticket on the ring and in the flat plan, and appears once in the Agents list.
- Opening a session draws its turns in order, with each permission request at the turn it was asked; Approve and Deny reach the agent.
- Send, Interrupt, Resume and Stop act on the session, and the access level never offers skipping permissions.
- Work on this starts a session on that ticket with the ticket's own words as the first prompt, and its marker appears over the ticket.
- The served page shows no marker, no Agents list, no pane and no Work on this.

## Verification

Built on 2026-10-22, [[TASK-0197]] to [[TASK-0201]]. [[TST-0105]] (`bash tools/scripts/run-desktop-tests.sh agent-pane`) has 20 checks on both overview fixtures; `cd desktop && npm test` passes. The walk `bash tools/scripts/walk-in-a-box.sh agent-sessions --copy` ran the screens in a real Deck window in the container, with the suite's scripted agent: 24 checks, all held. It found three faults, each fixed (see [[TASK-0201]] and [[TASK-0208]]).

Not yet shown: a real agent in the pane (Edwin allowed one real session, which was read-only and ran before the pane existed). Edwin's acceptance test is [[TST-0108]], `draft` until FEAT-0034 and FEAT-0035 give it its last steps.

## Review

**Round one, 2026-10-22, at 09c2d87: changes requested by both reviewers.** Both ran `claude-opus-5-5` from the packet, each in its own worktree, and broke three guards each; a check failed for five of the six.

What they found, each fixed in [[TASK-0209]]:

- An open session with no marker dropped out of the overview's address. A session on no ticket, or on a ticket off the ring, opened in the pane, but back and forward lost it, the panels on the right stayed under the pane, and Escape offered no "Close the session". One line in `wheelScene` took the open session from the marker.
- Three things the Scope promises were not built at that commit: the context and usage bars, the tickets a session moved, and Open its shell. Open its shell came with [[TASK-0206]] in FEAT-0035; the other two are built now.
- The Agents list left sessions out: the cockpit's were cut to ten before anything was drawn, and the drawn list showed five with no "+N more".
- No check failed when `agentsFor` answered an empty list instead of nothing with no bridge, the served page's guard.
- The composer kept one session's words and an armed Stop when another opened, and a failed Send lost its words without saying why.

Also changed: a cockpit session that has ended reads as stopped, not idle. Left as they are: the model, effort and access choices in the composer are shown, not changeable, because they are chosen when a session starts; Resume beside an enabled Send on an idle session sends "Carry on." when the box is empty.

**Round two, 2026-10-23, at 86854d0: approved by both reviewers.** Between them they broke about twenty guards and a check failed for each but one: both found that removing the loop that draws the bars passed every check, because only the pane's model was checked. A check now reads the bars and the Moved line as the pane draws them, and the text given back after a Send whose call throws ([[TASK-0209]]). One reviewer did not get to Open its shell, which [[TASK-0206]] built and the other checked by reading.

## Links

- Plan: [PLAN.md](plan/PLAN.md)
- Adoption rows this moves: `shell.agents.strip`, `shell.agents.attention` and `api.read.agents` ([[REFERENCE-COCKPIT-ADOPTION]]), updated at close-out.
