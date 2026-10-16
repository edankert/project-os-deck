---
type: "[[task]]"
id: TASK-0164
title: "The exit criteria are drawn as a band of cells along each phase's rim, lit when met, and a tower's red cap can be pressed"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-16
updated: 2026-10-16
source: ["Edwin 2026-10-16, after turning DES-0005-towers.html: 'I like the design page, please implement as suggested. However can you please come up with a different design for the exit criteria? Also, what is the red rectangle on-top of the tower, I assume this highlights issues that \"needs me\", should this be selectable?'"]
parent: "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]"
effort: S
due: ""
depends: []
blocks: ["[[TASK-0166]]"]
related: ["[[TASK-0163]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]"]
tests: ["[[TST-0094-DES-0005s-Plates-Are-Drawn-For-Every-Screen-With-Every-Mark]]"]
---

# The exit criteria are a band along the phase's rim

**The design page draws a phase's exit criteria as a band of cells along the outer edge of its segment, one cell per criterion, lit when it is met.** Edwin asked for a different design than the arch of floating cubes. The band is on the ring itself, so every phase shows at rest how close it is to closing, from any angle, without a shape standing over the towers. A phase whose band is fully lit is ready to close. A phase that writes its criteria as prose has a dashed band.

**A tower's red cap can be pressed.** Pointing at it lists the tickets in that feature that need you and what each asks. Pressing it opens the one ticket on its own screen, where the red banner says what to do; with several, it brings the phase close with those tickets at the top of its list and the first selected.

## Definition of Done

- [ ] The design page draws the band on every phase of the ring, its cells lit by the criteria the model ticks; pointing at a cell names its criterion; the arch is gone.
- [ ] Pointing at a red cap lists what needs you in that tower; pressing it selects the ticket, or the first of several, and brings its phase close.
- [ ] The pictures under `docs/designs/__attachments__/DES-0005/towers-*.jpg` are retaken, and DES-0005's "Towers on the ring" says what the band and the cap do.
- [ ] TST-0094 passes.

## Verification
