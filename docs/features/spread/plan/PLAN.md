---
type: "[[plan]]"
title: "Plan — spread"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
implements: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
related: ["[[PHASE-0001-Deck]]"]
---

# Plan — spread

## Delivery sequence

1. **[[TASK-0015-Notes-Become-Cards]]** — A view's notes are drawn as cards rather than rows. A card shows the note's id, title, type and status band.
2. **[[TASK-0016-A-Desk-Is-Saved-And-Reopened]]** — An arrangement of cards is a desk. A desk is saved by name into Deck's store and reopens as it was left.
3. **[[TASK-0023-The-Groups-The-Sidecar-Sends-Are-Drawn]]** — The groups the payload already carries are drawn: Needs you first, phases holding their features and tasks, severity bands, test tiers, and finished work folded away.
4. **[[TASK-0024-A-Navigator-Beside-A-Desk-That-Starts-Empty]]** — The list and the desk become two surfaces. The navigator lists the view; the desk holds only what a person put on it.
5. **[[TASK-0025-Cards-Are-Dragged-And-Removed]]** — A card is moved with the pointer and stays where it was released, and that position is what the desk saves.
6. **[[TASK-0027-Search-And-Filter-In-The-Renderer]]** — The renderer owns search and filtering, because the pooled DOM hides undrawn notes from the browser's own find.
7. **[[TASK-0028-A-Card-Face-Per-Type]]** — A card's face depends on its type: progress for phases and features, severity for issues, staleness for tests.

**Steps 3 to 7 were added on 2026-09-07**, after Edwin accepted the review's finding that what Spread shows today is a flat grid of identical cards that cannot be arranged, grouped or searched ([[REFERENCE-PHASE-0001-REVIEW]]).

## Dependencies

- **Hard:** the tasks above run in the order listed; each one's output is the next one's input. TASK-0023 comes before the rest of the new work, because the other four all need to know which cards belong together.
- **Parallel:** TASK-0027 and TASK-0028 need only TASK-0023 and can be built beside TASK-0024 and TASK-0025.
- **Soft:** [[FEAT-0002-Deck-Opens-A-Workspace]] lands first of all the features, because everything else needs a window and a sidecar to read from.

## Open questions

- None open. What was open is recorded in the feature's Scope section as a decision.
