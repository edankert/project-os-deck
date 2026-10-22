---
type: "[[task]]"
id: TASK-0186
title: "Pictures stand at their own tickets on the ring, larger nearer the work in hand, and a selected ticket's pane shows its pictures"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Build the DES-0005 into the deck'"]
parent: "[[FEAT-0031-The-Towers-In-Deck-Show-Links-Search-Next-Up-Needs-You-Ages-Weeks-And-Pictures]]"
effort: M
due: ""
depends: ["[[TASK-0181]]", "[[TASK-0182]]", "[[TASK-0185]]"]
blocks: []
related: ["[[TASK-0179]]", "[[RISK-0011]]"]
tests: ["[[TST-0102]]"]
---

# Pictures stand at their own tickets

**Up to eighteen of the newest pictures kept beside the notes stand just above their tickets on Deck's ring, as TASK-0179 drew them on the page.** Nearer the work, larger.

## Definition of Done

- [ ] Each picture from TASK-0181's list stands over its feature's tower, its tile, its finished phase's block on the shelf, or the core, at most three per ticket. The feature in focus has the largest, then the phase in focus, then other unfinished work, then the core; the shelf's are smallest and faded. In both groupings.
- [ ] With a phase brought close, only its pictures stand. A selected ticket's pane shows all its pictures, up to twelve.
- [ ] Pictures load through the route Deck's host already has for docs images, `/deck/file/<workspace>/<path>` (`workspaceImage` in `desktop/src/main/host.ts`). It serves only image files under the workspace's `docs/`, refuses a way out, and sandboxes SVG, so no new path is added to the host. The served host (the tablet) shows them read-only.
- [ ] [[TST-0102]] checks the placement and sizes on both fixtures, and that every listed picture's address is one that route accepts.

## Notes

Agent sessions will later stand over the same towers (DES-0006); DES-0006 already leaves the pictures off its page for that reason. That clash is PHASE-0004's to settle.
