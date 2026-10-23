---
type: "[[task]]"
id: TASK-0212
aliases: ["TASK-0212"]
title: "The Shells button stands at the foot of the workspace rail, so the header keeps to one line and Glass is laid out as before"
status: doing
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["The container smoke on 2026-10-22: Glass checks failed in both halves after TASK-0206; bisected on 2026-10-23"]
parent: "[[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[TASK-0206]]"]
tests: ["[[TST-0107]]"]
---

# The Shells button stands at the foot of the rail

**Since [[TASK-0206]], Glass in a window 780 or 1000 px wide was laid out on less room than before, and the smoke's Glass checks failed in both halves.** Cards moved during a hold, the orbit's dots moved after Escape, and resting on a tile showed no pointer and no callout.

## Cause

TASK-0206 put "⌘ Shells" in the header's right-hand group. The view switcher beside it wraps when the header runs out of width. One more button pushed the switcher onto a second line in narrower windows, so the header grew taller and everything under it moved and shrank.

Found by bisecting in a clone, a loopback smoke in the container per step: passing at 7e9e42d, failing at b65ccf4, with 16e4e17 untestable because its image could not install node-pty. At b65ccf4 with only the button kept hidden, the smoke passed.

## Definition of Done

- [ ] The button is not in the header. It stands at the foot of the workspace rail, in Deck's own window only, and opens and closes the drawer as before.
- [ ] A served page still has no button and no drawer.
- [ ] The loopback and network smoke runs pass in the container.
- [ ] The shell drawer's walk finds the button in the rail and opens the drawer from it.
