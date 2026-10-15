---
type: "[[task]]"
id: TASK-0146
title: "Back and forward retrace the overview screens a person has visited"
status: done
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
- [x] ← and → buttons sit beside the Deck brand button. Each is disabled when there is nothing to go back or forward to.
- [x] ⌘[ and ⌘], and the mouse's back and forward buttons, do the same.
- [x] Opening a new screen after going back drops the forward entries, as a browser does.
- [x] Escape still goes up one level (ticket to phase, phase to wheel), which is not the same as back.
- [x] The history logic is a pure function over addresses, tested in the overview-screens suite (TST-0090): a run of opens, backs and forwards ends on the expected address and the expected enabled buttons.
- [x] The window run (TST-0093) presses back and forward once on each workspace and lands on the screens the history says.
- [x] `cd desktop && npm test` passes.

## Steps
- [x] Write the history as a small module in `desktop/src/shared/` and its tests.
- [x] Wire the buttons, keys and mouse buttons in `desktop/src/renderer/overview.ts`.
- [x] Add one back-and-forward step to `desktop/scripts/overview-drive.cjs`.

## Verification

← and → sit beside the Deck name, shown with the overview, each disabled when there is nowhere to go; ⌘[ ⌘] and the mouse's buttons do the same; opening a screen after going back drops what was ahead; Escape still goes up a level. The history is the pure `overview-trail.ts` (`opened`, `stepped`, `afterDraw`), tested in TST-0090, including a step that a click overtakes. An address that names an overview screen in another workspace no longer draws that workspace's wheel first. TST-0093 pressed back and forward by button and by ⌘[ ⌘] on both workspaces on 2026-10-15 and landed where the history said. Codex reviewed it twice; both rounds are in FEAT-0027.

## Notes

Claude lane. No dependency on the other tasks; it can start at once.

The history is per window and lasts for the session. It is not saved, and leaving the overview for another view does not add an entry. That reading is the plainest one of "a back/forward button"; Edwin can widen it.

No new test note: TST-0090 holds the pure history check and TST-0093 the window check.
