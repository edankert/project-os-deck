---
type: "[[task]]"
id: TASK-0178
title: "Agent sessions drawn on the towers ring to judge, from the cockpit's recorded sessions: agents at their towers, a session as a conversation, one Needs you, the overview panels and the shell drawer"
status: done
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
- [x] `cd desktop && npm test` passes. Two independent Claude reviewers review it.

## Verification

`desktop/scripts/agents-fixture.mjs` recorded, on 2026-10-22, each workspace's model now (Deck 418 tickets, your-trainer 2,810, the cockpit 1,388) and its ten most recent sessions, plus those its last six permission requests belong to, through `sessionsFrom` and `countTranscript` in `agents-notes.mjs`: ids, states (the live one from `agent-state.json` first), times, tickets, status changes, file counts, cost and use, prompt counts and tool counts. `desktop/scripts/overview-towers.mjs` became a function with hooks for a layer. The towers page it writes holds the same data as before; its code gains the hooks (a list of layers run after each build, extra pickable marks, the tower tops), which do nothing there since it adds no layer. `desktop/scripts/agents-page.mjs` writes the page with `agents-page.js` as the layer; `agents-capture.cjs` took twelve pictures in a hidden window with no page errors (Deck: 3 of 10 sessions placed on the ring; your-trainer 6; the cockpit 1). Found and fixed on the way: the page's "? Marks" button covered the workspace switch, and the towers page's pictures hid the agents standing over the same towers, so they are left off this page. TST-0101 (`bash tools/scripts/run-desktop-tests.sh agents-page`) checks the counting, that no text reaches a session (a title leaking or the recorded state winning over the live one each made it fail), that the fixtures hold no long or spaced string, and that the page holds every recorded session.

## Review

Round one, 2026-10-22, two independent Claude reviewers (`model:claude-opus-5-5`) on `5d1e2ec`. Both asked for changes; no text from the records leaked, and every count checked against the real records held.

- **Nothing checked that the page draws agents** (data). The capture run is now a check: it fails when a session with a ticket on the ring has no marker, when a session pane opens empty, or when Work on this does not open. Run on a copy with the agents layer removed, it failed naming every missing session.
- **The note said the towers page was byte for byte the same** (data). It holds the same data, plus hooks that do nothing there; said so now.
- **Deck's repository is public and your-trainer's is private** (data). Edwin chose to keep your-trainer's ticket text and to leave each session's dollar cost out (FEAT-0030, "What may be published"); the cost is gone from the fixtures, the page and the captions, and TST-0101 checks it stays gone.
- **The conversation itself was not drawn** (page). The fixtures now hold each session's last eight turns as counts (when it began, its steps, the files and lines it changed), and the pane draws them as a conversation the way T3 Code does: your prompt as a bubble without its words, the agent's steps, its edits, the permission requests at the turn they were asked, "waiting for you", and a box to answer in with the model, effort and access. The pane is wider for a session.
- **Panels overlapped** (page): the header ran over the pane, a ticket's card over the overview, the drawer over Next up and the weeks. The pane starts below the header, a card hides the panels under it, Next up and the weeks stand above the drawer's tabs, and the drawer makes room for an open pane.
- **At 1100 wide the Agents list was gone** (page). Below 1280 px the Agents list stays and the overview panels move behind a "◫ Overview" button.
- Also (page): a status a session set reads "set 12:56" when the ticket still has it; Escape closes the new-session dialog; choosing Codex offers Codex's models; sessions over one tower stand apart; "Agents waiting for you" says when it shows only the first three; the counts since you last looked say their type when pointed at; an open session stays open across a regroup.

Round two, 2026-10-22, two fresh independent Claude reviewers on `039d2c7`. Data and privacy: changes requested. No dollar cost and no record text is anywhere committed, and Claude's turn counts matched an independent recount, but: the capture check named missing agents yet exited 0, since Electron ignores `process.exitCode`; every Codex edit read as zero, since Codex writes its patches inside a script with escaped line breaks; Codex's harness messages (AGENTS.md, `<environment_context>`) and Claude's interruption and resumption notices counted as your prompts; and the cost guard caught only a key named `usd`. All fixed after it: the capture exits through `app.exit` (exit 0 on the page, 1 on a copy with the markers removed); escaped patches are counted (Codex session 01a13b4c now shows +708 −12 and more); harness text is not a prompt (the cockpit's bc4cdcaa has nine prompts, not ten); and TST-0101 now holds each session and its use to an exact list of fields. The fixtures were recorded again and the captions follow them. Page: changes requested at 1100 wide only; every other round-one page finding held (the conversation turn by turn, the pane below the header, the card hiding the panels under it, the drawer's tabs clear of Next up, the Agents list kept, "set", Escape, Codex's models, sessions apart, tooltips, a session kept across a regroup), with no regression and memory flat. At 1100 the wide pane hid the Agents list and sat over an open drawer, an open drawer covered Next up, the overview drew over the Agents list, and a turn's requests were listed newest first. Fixed after it: below 1280 px the session pane leaves the Agents list in view (at most 640 px, never closer than 420 px to the left), the drawer gives way to an open session and, when open on its own, hides Next up, the overview takes the Agents list's place, and a turn's requests read in the order they were asked; measured at 1100 in a hidden window. A gate runs two rounds at most; the verdicts stay the reviewers'.
