---
type: "[[task]]"
id: TASK-0146
title: "Back and forward retrace the overview screens a person has visited"
status: doing
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-15
updated: 2026-10-15
source: ["Edwin 2026-10-15: 'we need a back/forward button.'", "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"]
parent: "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]"
effort: S
due: ""
depends: []
blocks: []
related: ["[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[TST-0005-Every-State-Round-Trips-Through-Its-Address]]"]
tests: ["[[TST-0090-The-Overview-Screens-Are-Drawn-From-The-Model-And-Hold-The-Look]]", "[[TST-0093-Every-Overview-Screen-Opens-From-Its-Address-In-A-Real-Window]]", "[[TST-0091-Deck-Opens-On-The-Wheel-And-It-Reads-As-A-Picture]]"]
---

# Back and forward retrace the overview screens a person has visited

**Two arrow buttons beside the Deck name take a person back to the overview screen they came from, and forward again.** Every move between overview screens becomes one entry in a history. Each screen already has an address, so an entry is an address.

## Definition of Done
- [ ] ← and → buttons sit beside the Deck brand button. Each is disabled when there is nothing to go back or forward to.
- [ ] ⌘[ and ⌘], and the mouse's back and forward buttons, do the same.
- [ ] Opening a new screen after going back drops the forward entries, as a browser does.
- [ ] Escape still goes up one level (ticket to phase, phase to wheel), which is not the same as back.
- [ ] The history logic is a pure function over addresses, tested in the overview-screens suite (TST-0090): a run of opens, backs and forwards ends on the expected address and the expected enabled buttons.
- [ ] The window run (TST-0093) presses back and forward once on each workspace and lands on the screens the history says.
- [ ] `cd desktop && npm test` passes.

## Steps
- [ ] Write the history as a small module in `desktop/src/shared/` and its tests.
- [ ] Wire the buttons, keys and mouse buttons in `desktop/src/renderer/overview.ts`.
- [ ] Add one back-and-forward step to `desktop/scripts/overview-drive.cjs`.

## Notes

Claude lane. No dependency on the other tasks; it can start at once.

The history is per window and lasts for the session. It is not saved, and leaving the overview for another view does not add an entry. That reading is the plainest one of "a back/forward button"; Edwin can widen it.

No new test note: TST-0090 holds the pure history check and TST-0093 the window check.
