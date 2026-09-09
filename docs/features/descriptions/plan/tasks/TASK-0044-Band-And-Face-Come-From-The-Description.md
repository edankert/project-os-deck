---
type: "[[task]]"
id: TASK-0044
aliases: ["TASK-0044"]
title: "Band and face are read from the description: faces.ts becomes a reader, and the vocabularies it still copies are pinned to the cockpit by fixture"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
parent: "FEAT-0012"
effort: ""
due: ""
depends: ["TASK-0041", "TASK-0042"]
blocks: ["TASK-0045", "TASK-0029"]
related: ["[[FEAT-0012-A-View-Is-A-Description]]", "[[TASK-0029-The-Band-Function]]", "[[TASK-0028-A-Card-Face-Per-Type]]", "[[PHASE-0002-Glass]]", "[[PHASE-0003-Vault]]", "[[ADR-0004-A-View-Is-A-Description]]"]
tests: ["[[TST-0032-Band-And-Face-Follow-The-Description-And-The-Vocabularies-Match-The-Cockpit]]"]
---

# Band and face come from the description

## Objective

`desktop/src/shared/faces.ts` stops deciding what a card looks like and which band it stands in. Both come from the description's `face` and `band` sections, so the navigator, Spread and Glass read one rule instead of three. The status vocabulary Deck still copies from the cockpit is pinned by a fixture, so a drift fails a test rather than confusing a person.

## Detail

**Three things are wrong today and all three have the same cause.** `faces.ts` puts `draft`, `proposed` and `ready` in the doing band; the cockpit's `statuses.py` puts all three in `pending`. Deck has no `final`, which the vault uses and [[PHASE-0003-Vault]] has already noted. And `faceFor` names `test` and `issue` in code, so a vault's character with a portrait, a page with a number and a chapter that orders its pages all arrive as plain cards. Each is a decision that belongs to a description written into a module instead.

**The band section is [[TASK-0029-The-Band-Function]]'s table, moved.** That task was going to put a per-view band table in a Glass-only module. Its acceptance is unchanged — pure, tested over the real payloads, overflow counted rather than silent, columns reserved for held and joined-to-desk — and its table becomes the `band` section of every description. The function that applies it lives with the other pure modules and every surface calls it. That is what makes the navigator's folding and Glass's banding the same decision.

**The face section is property names, not code.** Title, subtitle, image, and a list of fields. [[TASK-0028-A-Card-Face-Per-Type]] built four faces by type; those become four descriptions' `face` sections, and a vault type gets a face by writing one rather than by adding a branch.

**The vocabulary Deck copies is pinned, because it has already drifted once.** The status bands, the severity order and the known types are the sidecar's, and the sidecar serves none of them as data. Until it does, Deck keeps a copy and a fixture read off the cockpit's `statuses.py` asserts the copy matches — the same technique [[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]] uses for the view list. **File the cockpit issue for a vocabulary payload on the day this task starts**, the way [[TASK-0001-The-Whole-Edge-List-Is-One-Payload]] files its endpoint issue: the status bands, the severity order and the known types, served as data, so no client holds a copy.

## Acceptance

- A card's face is read from the description's `face` section, and `faces.ts` contains no branch on a note's type.
- A card's band is read from the description's `band` section by one function that the navigator, Spread and Glass all call.
- The band function meets [[TASK-0029-The-Band-Function]]'s acceptance in full, including the overflow counts and the reserved held and joined-to-desk columns.
- Deck's status bands equal the cockpit's `statuses.py`, asserted against a fixture recorded from that file with its date and commit; `final` is present.
- Changing a description's `face` changes what the card shows, with no change to the renderer, asserted in the suite.
- The cockpit issue for a vocabulary payload is filed on the day this task starts, and its id is recorded in this note's Notes.

## Steps

- [ ] Move [[TASK-0029-The-Band-Function]]'s table into the `band` section and rewrite that task's objective to match.
- [ ] Write the band function over the description, in `desktop/src/shared/`.
- [ ] Turn the four faces [[TASK-0028-A-Card-Face-Per-Type]] built into `face` sections on the seven descriptions.
- [ ] Record the vocabulary fixture from the cockpit's `statuses.py` and assert against it.
- [ ] File the cockpit issue for a vocabulary payload and record its id here.
- [ ] Write [[TST-0032-Band-And-Face-Follow-The-Description-And-The-Vocabularies-Match-The-Cockpit]] and link it from `tests:`.

## Notes

The copy in `faces.ts` drifted from the cockpit's within two days of being written, and nothing caught it. That is the argument for the fixture: a vocabulary Deck cannot ask for is a vocabulary Deck must check.
