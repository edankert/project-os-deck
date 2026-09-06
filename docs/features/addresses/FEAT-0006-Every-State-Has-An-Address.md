---
type: "[[feature]]"
id: FEAT-0006
aliases: ["FEAT-0006"]
title: "Every reachable Deck state has an address, so a layout is a list of addresses and some geometry"
status: doing
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[PHASE-0001-Deck]]"]
goal: "Any state a person can reach in Deck can be written down as a short string, and pasting that string back puts Deck in that state. This is what makes a layout serialisable, a window restorable and Deck drivable from outside."
requirements: []
tasks: ["[[TASK-0017-The-Address-Grammar]]", "[[TASK-0018-Copy-The-Address-And-Open-One]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]"]
---

# Every state has an address

## Goal

Any state a person can reach in Deck can be written down as a short string, and pasting that string back puts Deck in that state. This is what makes a layout serialisable, a window restorable and Deck drivable from outside.

## Scope

**In scope.** One grammar covering the workspace, the view, the desk and the focused note. A formatter that turns the current state into an address and a parser that turns an address back into state. Copying the current address, and opening one that is pasted in. The parser rejects an address it cannot read rather than silently falling back to a default, because a silent fallback is how the cockpit's unknown-mode bug hid for thirty-three hours.

**Out of scope.** Registering Deck as the handler for a URL scheme in the operating system, which is packaging work and adds nothing to the round trip this feature is judged on.

## Acceptance

- Every state the renderer can reach formats to an address, and that address parses back to the same state.
- Pasting an address into Deck opens that workspace, that view, that desk and that note.
- An address naming a view or desk that does not exist reports what it could not resolve and leaves Deck where it was.
- A malformed address is refused with the reason, and never resolves to a default view.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0017-The-Address-Grammar]], [[TASK-0018-Copy-The-Address-And-Open-One]]
- Plan: `docs/features/addresses/plan/PLAN.md`
