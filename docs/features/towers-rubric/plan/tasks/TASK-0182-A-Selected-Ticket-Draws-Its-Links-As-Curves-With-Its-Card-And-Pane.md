---
type: "[[task]]"
id: TASK-0182
title: "A ticket selected on the ring draws its links as curves, with its card and its pane, and the flat plan draws the links too"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Build the DES-0005 into the deck'"]
parent: "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"
effort: L
due: ""
depends: ["[[TASK-0181]]"]
blocks: ["[[TASK-0183]]", "[[TASK-0185]]", "[[TASK-0186]]"]
related: ["[[TASK-0176]]", "[[TASK-0167]]", "[[RISK-0010]]"]
tests: ["[[TST-0102]]"]
---

# A selected ticket draws its links as curves, with its card and pane

**Pressing a ticket on Deck's towers ring selects it where it stands and draws a curve to every ticket it links to or that links to it.** This is the first of TASK-0176's three ideas, as DES-0005's towers page draws it.

## Definition of Done

- [ ] In 3D, each curve rises from the selected ticket in the linked ticket's type colour, with a light running along it, into other phases, the shelf and the core as well. Everything else fades; linked tickets are outlined, with their ids when there are 40 links or fewer. Up to 240 links are drawn.
- [ ] With a phase brought close, the rest of the ring, the shelf and the core come back faded while something is selected.
- [ ] The flat plan draws the same links as lines from the same layout, so a machine without WebGL shows them too.
- [ ] The card stands where the legend was: type mark, id, title, status in the cockpit's words, feature, phase, owner, last update, the red line when it needs you, and the linked tickets counted by type. Its buttons frame the ticket and its links, bring its phase close, or clear the selection.
- [ ] The right pane shows the ticket's first paragraph, then its linked tickets as cockpit rows grouped by type; pressing a row selects that ticket. With a phase close, the pane starts with a button back to the phase's list.
- [ ] Escape clears the selection before it leaves the phase. The selected ticket is in the overview's address and is restored from it.
- [ ] The layout part (which links, which outlines, the 240 cap) is in `desktop/src/shared/overview-towers.ts` and checked by [[TST-0102]] on both fixtures, including your-trainer's FEAT-0051 with 202 links.

## Notes

The links are the ones the model already records for each ticket (`Ticket.links`), read both ways round. No new data beyond TASK-0181's lead, owner and date.
