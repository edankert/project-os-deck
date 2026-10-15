---
type: "[[task]]"
id: TASK-0155
title: "The wheel becomes a constellation: each phase a segment of the ring, its tickets fanned inward as particles, a bubble counting what needs you"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'I actually like the re-phasing better than the normal wheel ... suggest how to make the main wheel more like the re-phasing wheel or suggest another solution which is also really cool.'", "Edwin 2026-10-15, approving: 'go ahead with all the recommendations as suggested'", "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"]
parent: "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
effort: L
due: ""
depends: []
blocks: ["[[TASK-0156]]", "[[TASK-0161]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0129]]", "[[TASK-0152]]", "[[TASK-0145]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]", "[[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]]"]
---

# The wheel becomes a constellation

**Edwin prefers the re-phase screen (S4) to the wheel (S1), so the wheel takes S4's layout for every ticket.** Today the wheel draws each phase as a sector of wedges. In the constellation, each phase is a segment of the outer ring, and its tickets fan inward from that segment as separate particles.

- **Where a ticket sits says its state.** Done tickets sit near the ring, open ones further in, and the ones that need you glow at the front of the fan. Each particle is the cockpit's mark: type colour, state fill, the needs-you dot (TASK-0145).
- **A numbered bubble outside each segment** counts the tickets in that phase that need you, drawn beside a mark for that count.
- **The middle stays the no-phase cloud**, with its button into re-phasing (TASK-0152).
- **Pointing at a ticket draws wires** to the tickets it links to, as S4 does.
- **What stays:** the shelf of finished phases, the backlog tray, the Release test button, and both colourings (type and state).

## Definition of Done
- [ ] S1 draws every ticket of every unfinished phase as one particle in its phase's fan, on Deck (333 tickets) and on your-trainer (2,646 tickets). The number of drawn marks equals the number of tickets in the scene.
- [ ] The fan's depth follows the ticket's state, with needs-you in front, as above. No two particles share a place.
- [ ] Each segment has a needs-you bubble whose number matches its phase's count of `needsYou` tickets, drawn with its own mark.
- [ ] Pointing at, or focusing, a particle draws its wires and shows its callout. Pressing it opens the ticket (S3); pressing the segment opens the phase (S2).
- [ ] The no-phase button, the shelf, the tray, the Release test button and the ◐ colouring switch work as before, and both colourings draw the constellation.
- [ ] The 60-word limit at rest holds on both workspaces, and the list twin holds every drawn ticket and control.
- [ ] TST-0090 checks the above on both fixtures. The window run TST-0093 opens the wheel on both workspaces and presses a particle and a segment. `cd desktop && npm test` passes. Codex reviews the change, in two rounds at most.

## Steps
- [ ] Reuse S4's particle layout code (`desktop/src/shared/overview-rephase.ts`) for the fan, instead of writing a second one.
- [ ] Replace the wedge drawing in `desktop/src/shared/overview-wheel.ts`; keep the scene's addresses and list twin.
- [ ] Add the bubbles and the wires.
- [ ] Extend TST-0090; add the particle and segment presses to the window run's script.

## Notes

Claude lane. Starts at once; it reads `needsYou`, which the model already carries. TASK-0156 puts the constellation on a tilted plane and waits on this task.

Watch the frame rate on your-trainer: 2,646 particles is more than S4 draws today. If it stutters when wires are drawn, say so in Verification and draw the wires only for the pointed ticket.
