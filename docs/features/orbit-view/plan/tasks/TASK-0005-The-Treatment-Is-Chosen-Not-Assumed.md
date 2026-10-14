---
type: "[[task]]"
id: TASK-0005
aliases: ["TASK-0005"]
title: "The treatment is chosen, not assumed — the sky, the instrument and the wooden table are drawn, and a person picks"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-05
updated: 2026-09-10
source: ["Edwin 2026-09-05: 'this feels a little minority report like or did you have something more like (wooden) play blocks in mind'"]
parent: "FEAT-0001"
effort: ""
due: ""
depends: []
blocks: ["TASK-0003"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[DES-0002-The-Glass-Cockpit]]", "[[project-os-cockpit#DES-0002]]", "[[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]"]
tests: []
---

# The treatment is chosen, not assumed

## Objective

Decide between the three treatments [[DES-0001]] draws for the orbit, and record why. A design verdict is human-only ([[project-os-cockpit#REQ-0026]]); this task ends in Edwin's decision, not in an implementation.

## Detail

**What this decision covers narrowed on 2026-09-07.** The Glass field itself ([[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]) is built with [[DES-0002]]'s fog-and-detail treatment, which the review's measurement chose over blur: distance loses contrast and detail rather than going out of focus. This task no longer blocks the field's renderer. It decides how the orbit arrangement looks, and it blocks only [[TASK-0003]], the orbit's edge overlay.

They are not three palettes. They disagree about what the view is claiming:

- **Constellation** — a near-black field of luminous points, edges as filaments so faint they read as texture, depth by haze. It says *this is vast and mostly settled*, which is true: 70% of the corpus is terminal. It is also the look every graph view already has.
- **Glass** — the same field rendered as an instrument: cyan plates, brackets, billboarded panes, a scan sweep. It says *this is a live system you are working*. **It costs a distinction**: washing the bands toward one colour puts four of the six statuses inside 25 degrees of hue, so `blocked` is held out as the only alarm red and `archived` is desaturated to stay readable.
- **Blocks** — opaque painted-wood solids on a lit table, stacked into districts, casting shadows. It says *this is a made thing with weight*. Occlusion becomes information: a block behind another is genuinely hidden, which is honest about a corpus you cannot see all of at once. It costs the edges, which do not survive an opaque scene at 16148 of them — and with them the link callout. In exchange `done` becomes the **bare wood** rather than a colour, which is the only treatment that handles a corpus that is 70% finished without turning into one flat hue.

**The second is the sharper trade and the likelier mistake.** Blocks look better in a screenshot and may navigate worse. That is exactly the kind of judgment this project reserves for a person.

## Acceptance

- All three drawn against the same real data, not a sample, and switchable side by side
- The decision recorded in [[DES-0001]]'s frontmatter, with the reason
- If blocks win, what replaces the edge callout is answered before [[TASK-0003]] starts
- If glass wins, the four collapsed status hues are answered before [[TASK-0003]] starts

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `TASK-0596` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).

## Where this stands

**2026-09-10: all three are drawn, over the same real data, and switchable; the choice is Edwin's and has not been made.** In the orbit, the field's bar carries constellation, glass and blocks. Each draws the same notes. Glass holds `blocked` out as the only red and desaturates `archived`, which answers the collapsed hues before a choice rather than after it. Blocks draw no links at all, and a reach, resting on a block, draws that block's links, which is what replaces the edge callout there. `DECK_SMOKE_ONLY=glass electron . --smoke` saves a picture of each over this repository as `deck-orbit-constellation.png`, `deck-orbit-glass.png` and `deck-orbit-blocks.png` in the system's temporary directory, and the running application switches between them live. Constellation is the default until the choice is recorded in [[DES-0001-Nine-Ways-To-Read-The-Record]].
