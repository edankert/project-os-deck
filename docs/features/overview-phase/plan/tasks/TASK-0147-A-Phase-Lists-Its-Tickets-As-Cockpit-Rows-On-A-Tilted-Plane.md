---
type: "[[task]]"
id: TASK-0147
title: "A phase lists its tickets as cockpit rows on a tilted plane, needs-you in front and closed folded at the back"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'the right hand pane should really show the tickets as tickets ... I would use the same or a similar list/structure as in the cockpit (when displayed in the right hand or the left hand pane).'", "Edwin 2026-10-15: 'Selecting a phase I like but the done section shows the items too small (as well as they go outside the trapezium) and the open section similar as well as the needs you section, if the trapezium is there to show them as a sort 3d then it doesn't work, but it would be nice if they could be displayed more 3d.'", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"]
parent: "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]"
effort: M
due: ""
depends: ["[[TASK-0144]]", "[[TASK-0145]]"]
blocks: ["[[TASK-0150]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TST-0083-Screen-Checks-Refuse-Text-And-Missing-Marks]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0083-Screen-Checks-Refuse-Text-And-Missing-Marks]]", "[[TST-0092-A-Phase-A-Ticket-And-Re-Phasing-Read-As-Pictures]]"]
---

# A phase lists its tickets as cockpit rows on a tilted plane

**S2's right-hand pane shows each ticket as a row like the cockpit's navigator, on a plane tilted away from the viewer.** Today the pane draws glyphs in a trapezium; Edwin found them too small, some fall outside it, and the trapezium does not read as depth.

## Definition of Done
- [ ] One row per ticket, as the cockpit's `buildNavRow` draws it: the mark from TASK-0145, the id, the title, the status word, on one line.
- [ ] Three sections, front to back: Needs you; in progress and open; closed. Closed is folded to a strip of marks with a count, and opens on a press.
- [ ] The rows sit on an HTML plane tilted with CSS perspective (`rotateX`). Near rows are full size; far rows are smaller but still legible. No row is drawn outside the plane, on either workspace's largest phase.
- [ ] The plane tilts slightly to follow the pointer, and stays still under reduced motion.
- [ ] The look's "at most 60 words at rest" rule exempts the ticket list. `desktop/src/shared/overview-checks.ts` changes with it, and TST-0083 says which part of a scene is exempt and still fails a scene whose other text exceeds 60 words.
- [ ] TST-0090 checks that every ticket of the phase has one row, in the section its `needsYou`, `fill` and state put it in, on both fixtures. `cd desktop && npm test` passes.

## Steps
- [ ] Read the cockpit's `buildNavRow` and its CSS; build the row in Deck's renderer from the shared mark module.
- [ ] Replace the depth field in `desktop/src/shared/overview-phase.ts` with the three sections; keep the web and the exit ring on the left.
- [ ] Draw the plane and its tilt in the renderer; the scene keeps the rows as data so the checks and the plates read them.
- [ ] Change the word check and its test; propose the exemption in FEAT-0026's "Questions between the lanes", since `overview-checks.ts` is Codex's file.

## Notes

Claude lane. `overview-checks.ts` belongs to FEAT-0026 (Codex); the exemption is a small change proposed there and agreed before it lands.

Assumption: "needs you" here is the cockpit's flag from TASK-0144, not Deck's narrower failed-or-owed rule.
