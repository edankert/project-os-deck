---
type: "[[feature]]"
id: FEAT-0006
aliases: ["FEAT-0006"]
title: "Every reachable Deck state has an address, so a layout is a list of addresses and some geometry"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-09
source: ["[[PHASE-0001-Deck]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
goal: "Any state a person can reach in Deck can be written down as a short string, and pasting that string back puts Deck in that state. This is what makes a layout serialisable, a window restorable and Deck drivable from outside."
requirements: []
tasks: ["[[TASK-0017-The-Address-Grammar]]", "[[TASK-0018-Copy-The-Address-And-Open-One]]", "[[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]]"]
release: ""
acceptance_exception: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-09
review_verdict: approved
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]", "[[PHASE-0002-Glass]]", "[[PHASE-0004-Parity]]"]
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

**Added 2026-09-08**, with [[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]].

- The grammar names four more kinds of state — `surface`, `page`, `flow` and `step` — and each refuses a value it does not know, the way `panel` does. A `step` with no `flow` is refused.
- Panel kinds come from a registry a phase adds to, not from a literal set. An address naming an unregistered kind is refused, and registering that kind makes the same address parse.
- Every address that parsed before 2026-09-08 still parses to the same state, and the twelve malformed addresses that were refused are still refused.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0017-The-Address-Grammar]], [[TASK-0018-Copy-The-Address-And-Open-One]], [[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]]
- Plan: `docs/features/addresses/plan/PLAN.md`

## Where this stands

**2026-09-09: the task is done and the feature is at `review`, waiting on a review and nothing else.** [[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]] landed. An address now carries `surface`, `page`, `flow` and `step` beside the five it had, each refusing a value it does not know by name. The panel kinds come from a registry (`desktop/src/shared/registry.ts`) that a phase adds to, so the guarantee is unchanged — an address cannot name something Deck cannot draw — and the direction is reversed: whoever builds a kind registers it, rather than editing a list in the parser.

Two of the four vocabularies are deliberately empty. Deck draws no page and runs no flow, so `?page=release` is refused today and parses the day something draws one. The refusal says "no page is registered", which is the state of the program rather than a list somebody forgot to fill in.

Nothing a person has already copied stops working: the six states [[TST-0005-Every-State-Round-Trips-Through-Its-Address]] names round-trip to the same states, their written form is byte-for-byte what it was, and the twelve malformed addresses are still refused. Both tables moved into one file that both suites read, so the claim is a measurement rather than a copy. [[TST-0034-The-Grammar-Carries-The-New-Keys-And-The-Panel-Registry-Refuses-Strangers]] is 15 checks.

**2026-09-08: back to `doing`, with one new task and three new criteria.** [[PHASE-0001-Deck]] widened on Edwin's decision, and four kinds of state arriving in the next three phases have no written form: a Glass surface, a page such as the acceptance checks or the release page, an editor over a note, and a flow at a step ([[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]], Part 5). The rule this feature exists to keep — every reachable state has an address — stops being true the moment one of those ships without a key. [[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]] adds the four keys and turns the closed three-item panel list into a registry, keeping the guarantee that an address cannot name something Deck cannot draw.

This is new work inside the feature, not a defect in what was built. The approvals below stand for what they reviewed, and the feature needs a review again before it returns to `done`. The same move was made for [[FEAT-0004-Windows-On-Any-Screen]] and [[FEAT-0005-Spread-Cards-On-A-Desk]] on 2026-09-07.

**2026-09-07: done.** The walk is made and the second independent review approved this feature. [[TST-0013-An-Address-Survives-Being-Written-Down]] passed — Edwin walked it on 2026-09-06 and marked it pass in the release ledger, with the remark "I think this bit works". A second clean-context review, run at the close-out of [[PHASE-0001-Deck]], read this feature's code and criteria again and approved it with no findings against it ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]).

**2026-09-06: built and tested; the acceptance walk is owed.** Every criterion above is checked by the suites and by the smoke run that boots the real application. The status is `review` rather than `done` because the walk that settles it for a person — copying an address, quitting, and pasting it back tomorrow — is [[TST-0013-An-Address-Survives-Being-Written-Down]], and nobody has walked it yet.

## Independent review — 2026-09-09 (third pass, TASK-0052's widening)

**Verdict: approved.** Clean context and a separate session; the same model family as the author, recorded in `reviewed_by`. This pass reviewed only what [[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]] added — the four new keys and the panel registry — and re-checked that nothing the earlier passes approved has moved.

**The three criteria added on 2026-09-08 hold.** `surface`, `page`, `flow` and `step` each refuse an unregistered value by name, and `?step=` without `?flow=` is refused in both the formatter and the parser (`desktop/src/shared/address.ts:73-80`). `pageKinds` and `flowKinds` are empty, so `?page=release` is refused today with a sentence that names the actual state of the program rather than an empty list. The round-trip table and the malformed table live in `desktop/tests/address-table.mjs` and are read by both suites, so "still parses to the same state" is a measurement rather than a copy.

**The registry keeps the guarantee it replaced a literal list to keep.** Mutating `Vocabulary.has` to accept any string — the change that would silently reopen the grammar — failed 7 checks across `panel-registry`, `address` and `descriptions`. Registration is a module-load side effect in `desktop/src/shared/panels.ts:38`, so there is no ordering hazard between the two hosts, and `register` refuses an id that could not survive an address round trip.

**Nothing found against this feature.** Two documentation nits, neither blocking: [[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]]'s Evidence says "The whole desktop suite: 190 checks" where the suite now runs 291, and it names `shared/registry.ts` in one paragraph and `shared/vocabularies.ts` in another for the same three vocabularies. Both are true statements about different files; a reader auditing the note will have to open both.

## Independent review — 2026-09-06 (second pass)

**Verdict: approved.** Clean context, separate session; same model family, recorded in `reviewed_by`. The first pass held this feature at changes-requested over two findings.

**A desk name the interface accepted and the parser refused.** `formatAddress` used to validate only the workspace and the view, so a desk named `Edwin's desk` produced an address Deck itself rejected — Copy address handed the person a broken string. All five fields are validated on both ends now, and the character rules admit anything a person can reasonably type, since values are percent-encoded. Verified: `Edwin's desk`, `sprint #3`, `déjà`, `a/b`, `Q4 (draft)`, `triage!`, `a=b&c` and `100%` all round-trip.

**An unresolvable address moved Deck before failing.** `applyAddress` used to switch workspace and load a view before checking whether the address's view existed, and it never reported an unknown desk at all. Workspace, view and desk are all resolved before anything is dispatched, and an unknown desk is named in the refusal.

**A residual, found at `9b99c36` and closed at `2539206`.** `formatAddress` caps a desk name at 64 characters and refuses control characters, but the place a person types one imposed no limit. A 65-character name was therefore still a reachable state that would not format — the same two-ends-disagree shape, smaller, and safe in direction because format refused rather than emitting a broken address. `isDeskName` is now checked where the name is typed, with a reason the person can act on, so the state is no longer reachable. This verdict is recorded against `2539206`.
