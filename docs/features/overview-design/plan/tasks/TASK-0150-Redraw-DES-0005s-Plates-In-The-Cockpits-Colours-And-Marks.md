---
type: "[[task]]"
id: TASK-0150
title: "DES-0005's plates are redrawn in the cockpit's colours and marks on both workspaces, with the wheel in both colourings"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'Review and suggest how to handle.' and, approving the plan, 'yes go ahead, use both claude and codex'", "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"]
parent: "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"
effort: S
due: ""
depends: ["[[TASK-0145]]", "[[TASK-0146]]", "[[TASK-0147]]", "[[TASK-0148]]", "[[TASK-0149]]"]
blocks: []
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0130]]"]
tests: ["[[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]]"]
---

# DES-0005's plates are redrawn in the cockpit's colours and marks

**Every plate in DES-0005 is drawn again from the changed screen code, on Deck and on your-trainer, so Edwin judges the design from what Deck now draws.** The wheel gets two plates per workspace, one per colouring, so he can choose.

## Definition of Done
- [ ] `node desktop/scripts/overview-plates.mjs` regenerates all plates after TASK-0145 to TASK-0149 land; the wheel is drawn in the state colouring and in the type colouring on both workspaces.
- [ ] Every caption in DES-0005 is rewritten for what the new plate shows, in the cockpit's words, with its words-at-rest count.
- [ ] DES-0005's revision entry for 2026-10-15 says the plates were redrawn, and its status stays `proposed`.
- [ ] TST-0094 passes on the new plates, and checks the two wheel colourings are both present.
- [ ] The interactive page `DES-0005-the-overview.html` is regenerated and its back and forward work as in Deck.

## Steps
- [ ] Add the second wheel colouring to the plate script.
- [ ] Regenerate, look at every plate, rewrite the captions.

## Notes

Claude lane, last of the run: it waits on every other task.
