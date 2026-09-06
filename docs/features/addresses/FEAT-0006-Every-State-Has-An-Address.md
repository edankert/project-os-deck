---
type: "[[feature]]"
id: FEAT-0006
aliases: ["FEAT-0006"]
title: "Every reachable Deck state has an address, so a layout is a list of addresses and some geometry"
status: review
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
reviewed_by: model:claude-opus-5
review_date: 2026-09-06
review_verdict: approved
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

## Where this stands

**2026-09-06: built and tested; the acceptance walk is owed.** Every criterion above is checked by the suites and by the smoke run that boots the real application. The status is `review` rather than `done` because the walk that settles it for a person — copying an address, quitting, and pasting it back tomorrow — is [[TST-0013-An-Address-Survives-Being-Written-Down]], and nobody has walked it yet.

## Independent review — 2026-09-06 (second pass)

**Verdict: approved.** Clean context, separate session; same model family, recorded in `reviewed_by`. The first pass held this feature at changes-requested over two findings.

**A desk name the interface accepted and the parser refused.** `formatAddress` used to validate only the workspace and the view, so a desk named `Edwin's desk` produced an address Deck itself rejected — Copy address handed the person a broken string. All five fields are validated on both ends now, and the character rules admit anything a person can reasonably type, since values are percent-encoded. Verified: `Edwin's desk`, `sprint #3`, `déjà`, `a/b`, `Q4 (draft)`, `triage!`, `a=b&c` and `100%` all round-trip.

**An unresolvable address moved Deck before failing.** `applyAddress` used to switch workspace and load a view before checking whether the address's view existed, and it never reported an unknown desk at all. Workspace, view and desk are all resolved before anything is dispatched, and an unknown desk is named in the refusal.

**A residual, found at `9b99c36` and closed at `2539206`.** `formatAddress` caps a desk name at 64 characters and refuses control characters, but the place a person types one imposed no limit. A 65-character name was therefore still a reachable state that would not format — the same two-ends-disagree shape, smaller, and safe in direction because format refused rather than emitting a broken address. `isDeskName` is now checked where the name is typed, with a reason the person can act on, so the state is no longer reachable. This verdict is recorded against `2539206`.
