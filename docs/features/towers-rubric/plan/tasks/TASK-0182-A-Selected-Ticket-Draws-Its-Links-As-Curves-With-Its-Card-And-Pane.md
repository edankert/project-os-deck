---
type: "[[task]]"
id: TASK-0182
title: "A ticket selected on the ring draws its links as curves, with its card and its pane, and the flat plan draws the links too"
status: done
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

- [x] In 3D, each curve rises from the selected ticket in the linked ticket's type colour, with a light running along it, into other phases, the shelf and the core as well. Everything else fades; linked tickets are outlined, with their ids when there are 40 links or fewer. Up to 240 links are drawn.
- [x] With a phase brought close, the rest of the ring, the shelf and the core come back faded while something is selected.
- [x] The flat plan draws the same links as lines from the same layout, so a machine without WebGL shows them too.
- [x] The card stands where the legend was: type mark, id, title, status in the cockpit's words, feature, phase, owner, last update, the red line when it needs you, and the linked tickets counted by type. Its buttons frame the ticket and its links, bring its phase close, or clear the selection.
- [x] The right pane shows the ticket's first paragraph, then its linked tickets as cockpit rows grouped by type; pressing a row selects that ticket. With a phase close, the pane starts with a button back to the phase's list.
- [x] Escape clears the selection before it leaves the phase. The selected ticket is in the overview's address and is restored from it.
- [x] The layout part (which links, which outlines, the 240 cap) is in `desktop/src/shared/overview-towers.ts` and checked by [[TST-0102]] on both fixtures, including your-trainer's FEAT-0051 with 202 links.

## Notes

The links are the ones the model already records for each ticket (`Ticket.links`), read both ways round. No new data beyond TASK-0181's lead, owner and date.

## What was built (2026-10-22)

- **Pressing a ticket on the ring, or on a phase brought close, selects it there.** Before, it opened the ticket's own screen; the card's Open button does that now. The selection is in the address as a new key, `select=<id>`, which the grammar accepts only with `page=wheel` or `page=phase` (`desktop/src/shared/address.ts`). Back, Forward and Escape step through selections like any other screen.
- **The layout says which links to draw** (`selectionIn` in `desktop/src/shared/overview-towers.ts`): every ticket the selected one links to or that links to it, each once, by id, at most 240, with both cubes' places. Ids stand beside the linked tickets while there are 40 or fewer.
- **In 3D** (`desktop/src/renderer/overview-towers-view.ts`), a curve rises from the selected ticket to each linked one in that ticket's type colour, with a light running along it (still, halfway, for less motion). Each linked ticket is outlined, and the selected one in yellow. Everything else fades. With a phase close, the rest of the ring, the shelf and the core come back faded, and the ring moves left of the pane, as it does for a phase's list.
- **In the flat plan**, the same curves are drawn as paths from the same layout, the linked tickets outlined, the rest in a faded group. With a phase close, only curves to tickets in that phase are drawn, since the plan draws only the phase.
- **The card and the pane** are panels (`desktop/src/shared/overview-select.ts`): a new `card` panel body, and a rows panel with a paragraph and buttons above its rows. On the wheel the card stands under the workspace's name and the pane at the right. With a phase close the pane takes the list's place, with a button back to it, and the card stands at the bottom left. The card's buttons are Open, Frame (the 3D camera turns to the ticket and its links), Its phase and Clear; every button is in the list twin.
- [[TST-0102]] has 25 checks now: every link of a sample of tickets on both fixtures, your-trainer's FEAT-0051 with all 202, the cap past 240, the curves and fading in the plan, the card's facts and buttons, the pane's rows, the phase-close case, the press targets, the grammar and the flat plate. The look's checks pass on every screen drawn with a selection.
- **Checked in the real Deck**, in the container, by a new walk, `desktop/demos/towers-rubric.cjs` (`bash tools/scripts/walk-in-a-box.sh towers-rubric`): pressing DES-0005 on the ring selected it; the 3D view drew and outlined 70 curves and faded the rest; the card and pane were right; Frame turned the camera; a pane row selected FEAT-0025; Escape cleared it; Its phase brought PHASE-0005 close with DES-0005 still selected and the pane in the list's place. 11 of 11 checks held. The walk grows with each task; TASK-0187 runs it as the feature's window evidence.

One check in TST-0090 was widened: an overview address may now end in `select=` after `colour=state`.
