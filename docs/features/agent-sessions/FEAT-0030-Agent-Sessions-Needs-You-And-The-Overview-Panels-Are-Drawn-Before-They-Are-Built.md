---
type: "[[feature]]"
id: FEAT-0030
aliases: ["FEAT-0030"]
title: "Agent sessions, Needs you and the cockpit's overview panels are drawn before they are built: a design page from real recorded sessions"
status: review
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-21: 'it also needs to have the claude and codex terminal functionality. Including the Needs You section and the project overview panels of the cockpit? Review and suggest how to introduce this. (Note: the terminals could be more like the T3code solution.'", "Edwin 2026-10-22: 'I agree with option B, start after the overview phase and start the design page for the agent sessions.'"]
goal: "Edwin can look at Deck's agent sessions, its one Needs you and the cockpit's overview panels drawn from real recorded sessions and tickets, and accept or change the design before any of it is built."
requirements: []
release: ""
acceptance_exception: ""
acceptance: ""
design: "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"
related: ["[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]", "[[PHASE-0004-Parity]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[REFERENCE-COCKPIT-ADOPTION]]", "[[REFERENCE-RUBRIC-AGENTIC-OS-REVIEW]]"]
tasks: ["[[TASK-0178]]", "[[TASK-0188]]"]
---

# Agent sessions, Needs you and the overview panels are drawn before they are built

## Goal

**Edwin sees Deck's agent sessions as pictures before any of them is built.** [[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]] settles that Deck runs its own Claude and Codex sessions, drawn as conversations beside the tickets they work on. This feature draws that, with the one Needs you and the cockpit's overview panels, as a design page from the sessions the cockpit has recorded.

The build itself comes after [[PHASE-0005-Overview]] (Edwin, 2026-10-22), in features cut when [[PHASE-0004-Parity]] opens.

## Scope

- [[DES-0006-Agent-Sessions-Stand-Beside-The-Work]] and its page, drawn on the towers ring: agents at the towers they work on, a session opened as a conversation, Needs you with permission requests first, the cockpit's overview panels as pictures, the shell drawer, and starting a session from a ticket.
- The sessions come from the cockpit's own records (`.cockpit/sessions.json`, `approvals.json` and the agent state in each repository), reduced to what may be committed: ids, agents, states, times, tickets, file counts, cost and context, tool names and counts. No prompt or reply text.

Out of scope: any code in Deck's application. Building is PHASE-0004's work after Overview.

**What may be published** (Edwin, 2026-10-22, answering "3"): project-os-deck is a public repository and your-trainer a private one. Edwin accepts that your-trainer's ticket text (titles, exit criteria, first paragraphs) is in Deck's committed fixtures and pages, as it has been since 2026-10-14. The dollar cost of each session is left out; context and usage percentages stay.

## Acceptance

- DES-0006 is `proposed`, with its page and pictures on both workspaces, and asks Edwin what to change.
- Nothing on the page is entered by hand: sessions, tickets and counts come from the recorded files and the overview fixtures.

## Review

### Round one (TASK-0178)

2026-10-22: two independent Claude reviewers on `5d1e2ec`, one on the data, privacy and tests, one driving the page as a person. Both requested changes; no record text leaked and every count held. Found: nothing checked that the page draws agents; the note overstated the towers refactor; Deck's repository is public and your-trainer's private (Edwin chose to keep the ticket text and leave the dollar costs out); the conversation itself was not drawn; panels overlapped and the Agents list vanished at 1100 wide; smaller points. All answered in `f16b19e`, `a724cd9` and `0d107bd`, as listed in [[TASK-0178]]'s Review section.

### Round two (TASK-0178)

2026-10-22: two fresh independent Claude reviewers on `039d2c7`. Data and privacy: changes requested (the capture check exited 0 on failure; Codex edits read as zero; harness messages counted as prompts; the cost guard was narrow), all fixed in `56f6b1a`. Page: changes requested at 1100 wide only (the session pane over the Agents list and the drawer, the open drawer over Next up, the overview over the Agents list, a turn's requests newest first), fixed after it. Details in [[TASK-0178]]'s Review section. A gate runs two rounds at most.

## Where this stands

2026-10-22: started, with [[TASK-0178]]. Later the same day: DES-0006 is proposed with its page and pictures, reviewed in two rounds; at `review`, waiting on Edwin's verdict on DES-0006. The build waits for PHASE-0004, after Overview.
