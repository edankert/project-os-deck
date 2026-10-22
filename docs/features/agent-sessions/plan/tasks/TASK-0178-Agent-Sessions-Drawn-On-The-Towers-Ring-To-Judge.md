---
type: "[[task]]"
id: TASK-0178
title: "Agent sessions drawn on the towers ring to judge, from the cockpit's recorded sessions: agents at their towers, a session as a conversation, one Needs you, the overview panels and the shell drawer"
status: doing
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'I agree with option B, start after the overview phase and start the design page for the agent sessions.'"]
parent: "[[FEAT-0030-Agent-Sessions-Needs-You-And-The-Overview-Panels-Are-Drawn-Before-They-Are-Built]]"
effort: L
due: ""
depends: []
blocks: []
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[TASK-0176]]", "[[TASK-0177]]"]
tests: ["[[TST-0101-DES-0006s-Page-Is-Drawn-From-Recorded-Sessions-As-Counts]]"]
---

# Agent sessions drawn on the towers ring to judge

**This task draws Deck's agent sessions as a design page on the towers ring, from the sessions the cockpit has recorded, before anything is built** ([[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]). The page is [[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]'s.

## What the page draws

- **Agents at their towers.** Each recorded session stands as a marker at the tower of the ticket it worked on, in its agent's mark (Claude, Codex) and its state's colour: busy, waiting for you, needs you, idle. A line runs from it to every other ticket it changed.
- **A session opened as a conversation**, in the right pane, the way T3 Code draws one: the agent, model and effort, cost and context as bars, the ticket it works on as a cockpit row, its turns as cards with the agent's steps as tool chips (Read 12, Edit 5, Bash 8), the files it touched, the tickets whose status it changed, and a permission request as Approve and Deny.
- **One Needs you**: permission requests first, then agents waiting for you, then tickets by reason (as on the towers page), then work not pushed.
- **The cockpit's overview panels as pictures**: since you last looked, the count of each ticket type with how far along it is, the checks, decisions waiting, unreleased changes and acceptance tests owed.
- **The shell drawer** at the bottom, with several shells as tabs.
- **"Work on this"** on a ticket's card opens a new session: agent, model, effort, worktree, and the ticket's own action as the first prompt.

## Definition of Done

- [x] A script writes a fixture from each repository's `.cockpit/sessions.json`, `approvals.json` and `agent-state.json`, keeping ids, agents, states, times, tickets, file counts, cost and context, and tool names with counts; no prompt, reply or command text.
- [x] The page draws each item above from that fixture and the overview fixtures, on Deck and your-trainer, with no errors in a hidden window.
- [x] TST-0094 or a test of its own checks the fixture against the recorded files and that no text leaks into it.
- [x] Pictures on both workspaces are in DES-0006, which asks Edwin what to change.
- [ ] `cd desktop && npm test` passes. Two independent Claude reviewers review it.

## Verification

`desktop/scripts/agents-fixture.mjs` recorded, on 2026-10-22, each workspace's model now (Deck 418 tickets, your-trainer 2,810, the cockpit 1,388) and its ten most recent sessions, plus those its last six permission requests belong to, through `sessionsFrom` and `countTranscript` in `agents-notes.mjs`: ids, states (the live one from `agent-state.json` first), times, tickets, status changes, file counts, cost and use, prompt counts and tool counts. `desktop/scripts/overview-towers.mjs` became a function with hooks for a layer. The towers page it writes holds the same data as before; its code gains the hooks (a list of layers run after each build, extra pickable marks, the tower tops), which do nothing there since it adds no layer. `desktop/scripts/agents-page.mjs` writes the page with `agents-page.js` as the layer; `agents-capture.cjs` took twelve pictures in a hidden window with no page errors (Deck: 3 of 10 sessions placed on the ring; your-trainer 6; the cockpit 1). Found and fixed on the way: the page's "? Marks" button covered the workspace switch, and the towers page's pictures hid the agents standing over the same towers, so they are left off this page. TST-0101 (`bash tools/scripts/run-desktop-tests.sh agents-page`) checks the counting, that no text reaches a session (a title leaking or the recorded state winning over the live one each made it fail), that the fixtures hold no long or spaced string, and that the page holds every recorded session.
