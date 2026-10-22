---
type: "[[task]]"
id: TASK-0201
aliases: ["TASK-0201"]
title: "The session screens are checked, run in a window in the container, and drawn again in DES-0006 from Deck itself, with no prompt or reply text in any picture"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0033-A-Session-Is-Drawn-As-A-Conversation-Beside-The-Ticket-It-Was-Started-On]]"
effort: M
due: ""
depends: ["[[TASK-0200]]"]
blocks: []
related: ["[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]", "[[TST-0108]]", "[[RISK-0016]]"]
tests: ["[[TST-0105]]"]
---

# The session screens are checked, run in a window and drawn in DES-0006

**One window run for the whole feature, in the Colima container first, and DES-0006 gains pictures of the real thing.**

## Definition of Done

- [x] The overview's screen checks cover the pane, the composer, the markers, the Agents list and the Work on this dialog, with a scripted session from the fake provider.
- [x] The window run is held until Edwin says, and run in the container first (`run-smoke.sh`), as his standing instructions ask.
- [x] DES-0006 gains pictures from a real Deck window, made with a scripted session whose words are invented for the picture. No real prompt, reply or cost is in any picture or log committed ([[RISK-0016]]).
- [x] [[TST-0108]]'s steps are checked against the build, so far as it goes: steps 1 to 4 by the walk. The note stays `draft` until Needs you, ◫ Overview and the shell drawer exist; [[TASK-0206]] makes it `active`.

## What was built (2026-10-22)

- `desktop/demos/agent-sessions.cjs` walks the session screens in a real Deck window in the container: `bash tools/scripts/walk-in-a-box.sh agent-sessions --copy`. Its 24 checks cover the empty Agents list, Work on this and its dialog, the request waiting at its turn, the marker over the ticket, Approve with the chips, edit and plan it leaves, Send, Deny, Interrupt, Stop with its second press, closing the pane, the address opening the session again, and the list's row opening it. The last run passed all 24.
- The agent in the walk is the suite's fake, playing `desktop/demos/agent-sessions.agents.json`. The launcher passes `--fake-agents` when a walk has such a file beside it, and Deck honours that flag only with `--drive`. Then its sessions are kept in a temporary folder and every change is logged in order.
- **What the walk found, and was fixed:** after Deny a real window left the session stuck at working ([[TASK-0208]]); markers were not redrawn when only the agents changed; and while a session was open, the ring moved left under the panels on that side and hid its marker. Those panels now make way while a session is open.
- DES-0006 has three pictures from the walk, under "The same screens in Deck itself". Every word in them is invented.
- [[TST-0108]]'s step 3 asked for `git status`, which Claude Code runs without asking; it now asks for a command that writes.
