---
type: "[[task]]"
id: TASK-0052
aliases: ["TASK-0052"]
title: "The address grammar gains surface, page, flow and step; panel kinds come from a registry; and the store reserves a flow cursor"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0006-Every-State-Has-An-Address]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
parent: "FEAT-0006"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0006-Every-State-Has-An-Address]]", "[[TASK-0017-The-Address-Grammar]]", "[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]", "[[FEAT-0012-A-View-Is-A-Description]]", "[[FEAT-0013-The-First-Write]]", "[[PHASE-0002-Glass]]", "[[PHASE-0004-Parity]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
tests: ["[[TST-0034-The-Grammar-Carries-The-New-Keys-And-The-Panel-Registry-Refuses-Strangers]]"]
---

# The grammar opens, and the panels come from a registry

## Objective

The address grammar learns four keys — `surface`, `page`, `flow` and `step` — each refusing an unknown value the way `panel` does today. The closed three-item list of panel kinds becomes a registry that each phase adds to. The store reserves a slot for a flow cursor, and nothing fills it.

## Detail

**The rule this protects is that every reachable Deck state has an address.** That is what makes a pop-out window, a pasted link and a tablet possible. Today the grammar names a workspace, a view, a desk, a note and one of three panels. Four things coming in the next three phases have no written form: a Glass surface ([[TASK-0033-Glass-Is-Addressed-And-Opened-First]]), a page such as the acceptance checks or the release page, an editor over a note, and a flow at a step. Adding the keys now is small; adding them after windows, layouts and a command line have been built against a five-key grammar is a retrofit.

**Refusing an unknown value is the whole design, and it is not new.** [[TASK-0017-The-Address-Grammar]] built a parser that refuses rather than defaults, because the cockpit's silent fallback for an unknown navigation mode made the Tests view look broken for thirty-three hours. Each new key inherits that behaviour.

**The panel list closes at three for a good reason and a registry keeps the reason.** `panels.ts` names `needs-you`, `note` and `desk`, and the address refuses a fourth, so an address cannot name something Deck cannot draw. A registry keeps exactly that guarantee: the parser asks the registry instead of a literal set, and a phase that builds a new panel kind registers it. A description-drawn list, a page, an editor and a flow step are each a kind that will register itself later. This is the same shape [[FEAT-0007-Views-Come-From-A-Provider]] uses for views.

**The flow cursor is reserved and nothing is built.** Edwin said on 2026-09-08 that he does not yet know what flows should look like and wants them considered now and fleshed out over time. A flow, as a concept, is an ordered list of steps whose done-state is read from the record and whose verb comes from the registry, with one thing outside the record: where a person is. That one thing is a cursor in the store. The slot exists so that the acceptance runner's position — which the cockpit loses when its window closes — has somewhere to live when a flow is actually built. `docs/ARCHITECTURE.md` gains the concept in words; this task gains the slot.

## Acceptance

- `surface`, `page`, `flow` and `step` parse and format, and each refuses a value it does not know by name.
- `step` without `flow` is refused, because a step outside a flow names nothing.
- Every address that parsed before this change still parses to the same state, asserted over the existing round-trip table.
- The malformed table grows a case per new key, and the parser still refuses all twelve addresses it refused before.
- Panel kinds come from a registry; `panels.ts` holds no literal set that the parser reads.
- An address naming a panel kind that is not registered is refused by name, and registering a kind makes the same address parse, both asserted in the suite.
- The store carries a flow cursor field that nothing writes and nothing reads, with a comment naming this task and the concept section in `docs/ARCHITECTURE.md`.

## Steps

- [x] Add the four keys to the grammar, the formatter and the strict parser — 2026-09-09, `desktop/src/shared/address.ts`
- [x] Turn the panel set into a registry and register the three existing kinds from where they are built — 2026-09-09, `shared/registry.ts` and `shared/panels.ts`
- [x] Add the reserved cursor to the store's state — 2026-09-09, `DeckState.flowCursor`
- [x] Extend the address suite: the round-trip table, the malformed table, and the registry cases — 2026-09-09, `desktop/tests/panel-registry.test.mjs`
- [x] Write [[TST-0034-The-Grammar-Carries-The-New-Keys-And-The-Panel-Registry-Refuses-Strangers]] and link it from `tests:` — written at planning time; its evidence is filled in

## Notes

**[[FEAT-0006-Every-State-Has-An-Address]] goes back to `doing` for this task.** It reached `done` on 2026-09-07 with two tasks and two reviews behind it, and this is new work inside it rather than a defect in what was built. The house precedent is [[FEAT-0004-Windows-On-Any-Screen]] and [[FEAT-0005-Spread-Cards-On-A-Desk]], both of which returned from `review` to `doing` on 2026-09-07 when tasks were added.


## Done, 2026-09-09

**The grammar carries nine parts and four of them are vocabularies nobody hard-codes.** An address is now `deck://<workspace>/<view>[?desk][&note][&panel][&surface][&page][&flow][&step]`, and the keys are written in that fixed order, from one list that both the formatter and the parser read.

**The registry is `desktop/src/shared/registry.ts`, and it is one small class.** A `Vocabulary` has a noun (`panel`, `surface`, `page`, `flow`), a `register` that refuses an id which could not be written into an address, and a `refusal` that says what IS registered rather than what is not — so a phase that has not registered its kind yet reads "no page is registered", which is the actual state of the program.

**Four vocabularies, and two of them are deliberately empty.** `panel` holds the three Deck draws, registered by `shared/panels.ts`, which is where they are named. `surface` holds `list` and `spread`; PHASE-0002 registers `glass` on the day the field exists, which is the same day a description's `surfaces` section starts naming it. `page` and `flow` are empty, because Deck draws no page and runs no flow, so `?page=release` is refused today and will parse the day something draws one. An empty vocabulary is the guarantee working, not a gap.

**`step` is not a vocabulary and says why.** Which steps a flow has is the flow's business and no flow is built. What the grammar can still say is the shape of a step name and that a step outside a flow names nothing at all — so `?step=walk-it` on its own is refused, in the formatter and the parser alike.

**Two things were tightened while the parser was open.** A key that appears twice is refused, because an address answering one question twice has no right answer and picking either is the guessing this grammar exists to avoid. And a key that is absent is now read as a key that is null, so a caller holding an older five-field address object still formats — being forgiving about a MISSING key costs nothing, and the check on an unknown VALUE is untouched.

**The flow cursor exists and nothing fills it.** `DeckState.flowCursor` is always `null`: no action writes it, and `normaliseState` does not read it back off disk either, because nothing could have put it there honestly. The suite drives all thirteen actions and asserts each one leaves it alone.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh panel-registry`: 15 checks, 2026-09-09. The load-bearing one refuses `?panel=acceptance-checks`, registers that kind, and parses the same address again.
- The round-trip table and the twelve malformed addresses moved to `desktop/tests/address-table.mjs` and are run by BOTH suites, so "nothing regressed" is a measurement over one table rather than over a copy of it.
- The whole desktop suite: 190 checks, 2026-09-09.
- `electron . --smoke`: `ok: true`, nothing skipped, on this repository.

## What the shape could not carry

**Nothing, for this task.** One thing is worth writing down for the next reader: `surface` in an address and `surfaces` in a description ([[FEAT-0012-A-View-Is-A-Description]]) are the same vocabulary and must stay one. The address says which surface is drawing right now; the description says which surfaces MAY draw this view. They are registered once, in `shared/vocabularies.ts`, and a second list would be the drift this whole task exists to prevent.