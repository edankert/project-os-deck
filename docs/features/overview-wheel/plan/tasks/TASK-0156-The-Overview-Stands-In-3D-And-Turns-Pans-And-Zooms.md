---
type: "[[task]]"
id: TASK-0156
title: "The wheel, the phase plane and the ring screens stand on a tilted plane in 3D, and a person turns, pans and zooms them with the mouse"
status: backlog
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'Also can we make the wheels (and the other lists/trapeziums) a little more 3d, and allow to move them using the middle mouse button and zoom in / out?'", "Edwin 2026-10-15, approving: 'go ahead with all the recommendations as suggested'", "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"]
parent: "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
effort: L
due: ""
depends: ["[[TASK-0155]]"]
blocks: ["[[TASK-0161]]"]
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TASK-0147]]", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]", "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]", "[[FEAT-0016-The-Wheel-Zooms-Glass-And-The-Orbit]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]", "[[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]]", "[[TST-0092-A-Phase-A-Ticket-And-Re-Phasing-Read-As-Pictures]]"]
---

# The overview stands in 3D, and turns, pans and zooms

**The wheel, S2's list of tickets, the re-phase screen (S4) and the release test's rings (S6) stand on a plane tilted away in real depth, and the person can move it with the mouse.** This is "Level 1" 3D: CSS 3D transforms on the existing SVG and HTML, with no new library. A real 3D scene (WebGL) is only drawn as a design plate (TASK-0157).

The controls are the same on all four screens:

- **Middle button and drag** turns the plane.
- **Shift with the middle button** pans it.
- **The scroll wheel** zooms in and out, toward the pointer.
- **Double-click** on empty space resets the view.
- **Under reduced motion** nothing moves on its own (no lean toward the pointer, no eased transitions); the plane moves only while the person drags.

## Definition of Done
- [ ] One shared camera module holds the tilt, turn, pan and zoom, and the four screens use it. The default tilt is shallow enough that the far edge of S2's plane stays legible on your-trainer's largest phase.
- [ ] The four controls work on S1, S2, S4 and S6. Each is clamped (the plane cannot be turned edge-on or zoomed until it vanishes), and double-click restores the default.
- [ ] Text stays crisp at every zoom: zoom changes the SVG's own scale rather than scaling a flattened layer.
- [ ] Pointer hits land on the mark under the pointer after any turn, pan or zoom.
- [ ] The scroll wheel zooms the overview when the overview is open and does not zoom Glass behind it (FEAT-0016's zoom).
- [ ] With reduced motion on, nothing moves until the person drags.
- [ ] The scene checks keep passing unchanged: the scene is the same data; only the camera moves.
- [ ] TST-0090 checks the camera module's clamps and reset as data. The window run TST-0093 drags with the middle button, zooms with the wheel and double-clicks on each of the four screens, on both workspaces, and checks a press still opens the right screen afterwards. `cd desktop && npm test` passes. Codex reviews the change, in two rounds at most.

## Steps
- [ ] Write the camera module, with pure functions for the clamps and the hit transform.
- [ ] Apply it to S1 and S4, then to S2's existing tilted plane (TASK-0147), then to S6's rings.
- [ ] Route the scroll wheel to the overview while it is open.
- [ ] Extend TST-0090 and the window run's script.

## Notes

Claude lane. Waits on TASK-0155, because the constellation is what stands on S1's plane.

S6 is FEAT-0029's screen, in Codex's lane. The camera is applied to S6's container only, without changing what S6 draws; Codex is told under FEAT-0029's "Questions between the lanes" before the change, and reviews it.

Assumption about a trackpad, which has no middle button: a pinch zooms (it arrives as a scroll with Ctrl held), and the keys +, − and 0 zoom and reset. Turning and panning need a mouse. If Edwin wants a trackpad way to turn the plane, that is a change to this task.
