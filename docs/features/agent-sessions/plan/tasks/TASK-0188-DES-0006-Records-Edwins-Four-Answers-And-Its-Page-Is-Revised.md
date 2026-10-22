---
type: "[[task]]"
id: TASK-0188
title: "DES-0006 records Edwin's four answers, and its page stands each agent over the ticket it was started on and lets the overview panels be hidden"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Build the DES-0005 into the deck and for DES-0006: - I think side pane as suggested but open for discussion - The ones they started on (is this not the same?) - It should be possible to hide the overview panels - Think it would be good to do permission requests first?'"]
parent: "[[FEAT-0030-Agent-Sessions-Needs-You-And-The-Overview-Panels-Are-Drawn-Before-They-Are-Built]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[TASK-0178]]", "[[ADR-0009-Deck-Runs-Its-Own-Agent-Sessions-Drawn-As-Conversations]]"]
tests: ["[[TST-0101-DES-0006s-Page-Is-Drawn-From-Recorded-Sessions-As-Counts]]"]
---

# DES-0006 records Edwin's four answers, and its page is revised

**Edwin answered DES-0006's four questions on 2026-10-22; this task writes the answers into the design and changes its page to match.** Nothing is built in Deck. Building agent sessions still waits for [[PHASE-0004-Parity]], after Overview.

## Edwin's answers

- **(a) The session opens in the side pane, as drawn.** He keeps this open for discussion, so the bullet stays under "What is Edwin's to decide", marked as his current choice.
- **(b) Agents stand over the ticket they were started on.** He asked whether that is the same as the ticket they last moved on. It is not. The cockpit's `.cockpit/sessions.json` records no start ticket at all; its fields are `session_id`, `agent`, `started`, `ended`, `prompts`, `files`, `status_touched` and others. And one session moves many tickets: this session started on a Rubric review with no ticket and moved 49, first FEAT-0026 and last TASK-0179; your-trainer's session 7ca462d7 moved 68, first TST-0157 and last TST-0687. A session Deck starts with "Work on this" knows its ticket exactly. For a recorded session, the page uses the first ticket it moved.
- **(c) The overview panels can be hidden**, with a toggle in the header that is remembered.
- **(d) Needs you puts permission requests first.** The page already does (`desktop/scripts/agents-page.js`, "One Needs you"), so this only records the answer.

## Definition of Done

- [x] DES-0006 says each answer in its own words, with the reply to "is this not the same?" from above; its "What is Edwin's to decide" keeps only (a), marked as chosen and open; the "What the page draws" bullet on agents says "the ticket it was started on, or for a recorded session the first ticket it moved".
- [x] `desktop/scripts/agents-fixture.mjs` or `agents-page.js` stands each recorded session over the first ticket in its `status_touched` order, and the Agents list names that ticket.
- [x] The page's header has a toggle that hides and shows the overview panels, remembered in the browser.
- [x] The pictures are retaken with `desktop/scripts/agents-capture.cjs` and the page regenerated with `desktop/scripts/agents-page.mjs`.
- [x] TST-0101 (`bash tools/scripts/run-desktop-tests.sh agents-page`) checks the start ticket and still finds no prompt, reply or command text and no dollar cost on the page.

## Notes

FEAT-0030 is at `review`. This task adds work inside it, so the session that starts the task moves FEAT-0030 back to `doing`, as FEAT-0027 was moved when work was added.

## What was done (2026-10-22)

- DES-0006 has a section "Edwin's answers, 2026-10-22" with his words and the reply to "is this not the same?"; its "What is Edwin's to decide" keeps only the side pane, marked as his choice and open; the agents bullet and the overview panels bullet say what changed.
- **The start ticket.** `startOf(session)` in `desktop/scripts/agents-notes.mjs` gives the first ticket whose status the session changed, in the cockpit's own order, else the first it touched. `desktop/scripts/agents-page.mjs` adds it to each session as `start`, and `agents-page.js` stands the marker and names the Agents list's row by it. The session fixtures were not recaptured: they hold the sessions as they stood when DES-0006 was drawn. This session, d95491a5, now stands over FEAT-0026 in Overview rather than TASK-0179.
- **◫ Overview** shows at every width; on a wide window it hides and shows the panels and the browser keeps the choice (`des6-overview-panels`), and the Agents list moves up into their place. On a narrow window it shows them, as before.
- The page was regenerated and its pictures retaken with `desktop/scripts/agents-capture.cjs`, which now also checks that every placed agent stands over its start ticket and that the panels hide and come back; it adds `agents-deck-panels-hidden.jpg`.
- [[TST-0101-DES-0006s-Page-Is-Drawn-From-Recorded-Sessions-As-Counts]] checks `startOf`, every session's `start` on the page, this session standing on its first ticket and not its last, and the toggle; it still finds no prompt, reply or command text and no dollar cost. 5 checks pass.

FEAT-0030 stayed at `review`: these changes came after its two review rounds, which its Review section says.
