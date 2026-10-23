---
type: "[[task]]"
id: TASK-0209
aliases: ["TASK-0209"]
title: "An open session stays in the overview's address with no marker, the pane shows context and usage and the tickets the session moved, and the Agents list leaves no session out"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["FEAT-0033 independent review, round one, 2026-10-22: both reviewers asked for changes"]
parent: "[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]"
effort: M
due: ""
depends: []
blocks: []
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[RISK-0016]]"]
tests: ["[[TST-0105]]"]
---

# The pane keeps its session in the address and shows usage and the tickets moved

**Round one of FEAT-0033's review found that a session with no marker on the ring drops out of the overview's address, and that the pane lacks three things the feature's Scope promises.** Both reviewers asked for changes.

## What the reviewers found

- **A session with no marker loses its address.** A session on no ticket, or on a ticket that is not on the ring, opens in the pane, but the address has no `session=`. Back and forward lose it, the panels on the right stay drawn under the pane, and Escape offers no "Close the session". The cause is one line in `wheelScene`, which took the open session from the marker instead of from the address.
- **The pane has no context or usage bars.** No session record carries them.
- **A Deck session's pane lists only its start ticket**, not the tickets it moved.
- **The Agents list leaves sessions out.** The cockpit's sessions were cut to ten before any marker or row was made, and the drawn list shows five rows with no "+N more".
- **No test fails when the served page's guard breaks**: `agentsFor` answering `[]` instead of undefined with no bridge passed every suite.
- **The composer keeps one session's text and armed Stop when another opens**, and a failed Send loses the text without saying why.

## Definition of Done

- [x] An open session is in the wheel's address whether or not it has a marker; the right panels make way and Escape offers "Close the session".
- [x] A session records its context use and its usage limits as they are reported, as a `usage` record, never a cost; the pane's head draws them as two bars.
- [x] A Deck session's pane lists the tickets the session moved, from the cockpit's record of the same session.
- [x] Every cockpit session is kept, and the drawn Agents list says how many more there are than it draws.
- [x] A test fails when `agentsFor` answers anything but undefined with no bridge.
- [x] Opening or closing a session clears the composer's text and an armed Stop; a failed Send puts the text back and says why.
- [x] [[TST-0105]] has a check for each, and fails when each is undone.

## What was built (2026-10-23)

- `wheelScene` (`desktop/src/shared/overview-wheel.ts`) takes the open session from the address whenever the page has sessions to show.
- A `usage` record (`desktop/src/shared/agent-types.ts`) carries the context in tokens against its window, and the limit as a percentage with its span. Claude's provider reads the last main-conversation call's tokens and the result's largest `contextWindow`, never its costs, and the `rate_limit_event`'s share used. Codex's reads `thread/tokenUsage/updated` and `account/rateLimits/updated`. `paneOf` draws the latest of each as the head's two bars, amber from 80%.
- `deckSummaries` reads the cockpit's record of each Deck session by its id and lists the tickets it moved; the pane shows them under the bars.
- `cockpitSummaries` keeps every session (the cockpit keeps at most 50). The window's Agents list scrolls; the flat picture draws five and says "+N more sessions". A cockpit session that has ended reads as stopped.
- The composer forgets its text and an armed Stop when the pane opens another session or closes; a Send that fails, or whose call throws, puts the text back and says why.

[[TST-0105]] has 26 checks and [[TST-0104]] 34. Each guard above was broken once on the committed code, eleven in all, and a check failed for each. The first attempt at two of them proved nothing: one removed line changed nothing the checks looked at, so a check now gives a usage record before the first prompt; the other did not compile.

**After round two (2026-10-23).** One reviewer found the bars and the "Moved" line were checked only as the pane's model, not as drawn: removing the drawing passed every check, and so did a Send whose call throws. A [[TST-0105]] check now opens the pane on a stand-in page and reads both bars, the Moved line, and the text given back after a thrown Send; each of the three breaks fails it. The overview's call that hands the pane its moved tickets is still guarded by reading. [[TST-0105]] has 27 checks.
