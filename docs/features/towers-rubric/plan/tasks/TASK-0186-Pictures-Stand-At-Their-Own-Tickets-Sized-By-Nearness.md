---
type: "[[task]]"
id: TASK-0186
title: "Pictures stand at their own tickets on the ring, larger nearer the work in hand, and a selected ticket's pane shows its pictures"
status: done
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

- [x] Each picture from TASK-0181's list stands over its feature's tower, its tile, its finished phase's block on the shelf, or the core, at most three per ticket. The feature in focus has the largest, then the phase in focus, then other unfinished work, then the core; the shelf's are smallest and faded. In both groupings.
- [x] With a phase brought close, only its pictures stand. A selected ticket's pane shows all its pictures, up to twelve.
- [x] Pictures load through the route Deck's host already has for docs images, `/deck/file/<workspace>/<path>` (`workspaceImage` in `desktop/src/main/host.ts`). It serves only image files under the workspace's `docs/`, refuses a way out, and sandboxes SVG, so no new path is added to the host. The served host (the tablet) shows them read-only.
- [x] [[TST-0102]] checks the placement and sizes on both fixtures, and that every listed picture's address is one that route accepts.

## Notes

Agent sessions will later stand over the same towers (DES-0006); DES-0006 already leaves the pictures off its page for that reason. That clash is PHASE-0004's to settle.

## What was built (2026-10-22)

- **The layout says which pictures stand where** (`picturesIn` in `desktop/src/shared/overview-towers.ts`): the newest eighteen of the model's pictures, at most three for one ticket, each over its ticket's tower, tile, finished phase's block on the shelf, or the core, read from the layout itself so it holds in both groupings. Pictures at one place stand side by side about its middle.
- **Nearer the work, larger.** The feature in focus's pictures are largest, then the phase in focus's (by phase), then other unfinished work, then the core, then the shelf, which are also faded. The camera's distance changes a size by at most 8% either way, so a nearer class always outsizes a further one. The page allowed 10% either way, which let a picture of the phase in focus outgrow one of the feature in focus by a fiftieth at the camera's limits; a new check found it, and the core and shelf sizes were lowered to 0.52 and 0.42 to keep every step strict.
- **In 3D** (`desktop/src/renderer/overview-towers-view.ts`) the pictures are images in a layer over the canvas, placed each frame where their ticket is. With a phase brought close only its pictures stand; while something is selected or searched they fade. Pressing a picture selects its ticket. They load through the host's existing route for docs images, `/deck/file/<workspace>/<path>`, so the host gained no new path.
- **The flat plan draws no pictures.** It is what a window with no WebGL shows, and the plates; a plate is rendered with no host to load pictures from. In such a window a ticket's pictures are still in its pane.
- **A selected ticket's pane shows its own pictures**, the newest twelve, and says how many it has when there are more.
- [[TST-0102]] has 57 checks now: placement, slots, sizes and nearness in both groupings on both fixtures; the size order at the camera's limits; the page's counts (eight on Deck's fixture, DES-0005's three over FEAT-0028 largest, DES-0004's three in the core; eighteen on your-trainer's); every picture's address passing the host route's own rules; the pane's twelve of DES-0005's pictures.
- **Checked in the real Deck**, in the container: eleven pictures stood at their tickets on Deck's live notes, each loaded through the host; DES-0005's three over FEAT-0031, the feature in focus, were the largest (130 pixels wide) and the core's the smallest (67); with PHASE-0005 close only its three stood; DES-0005's pane showed 12 of its 37 pictures, all loaded. The towers walk held 36 of 36.
