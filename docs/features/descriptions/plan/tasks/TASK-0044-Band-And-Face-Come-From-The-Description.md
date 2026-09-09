---
type: "[[task]]"
id: TASK-0044
aliases: ["TASK-0044"]
title: "Band and face are read from the description: faces.ts becomes a reader, and the vocabularies it still copies are pinned to the cockpit by fixture"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
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

- [x] Move [[TASK-0029-The-Band-Function]]'s table into the `band` section — that task's objective was rewritten at planning time and its acceptance is met here
- [x] Write the band function over the description — `bandOf`, `bandCards` and `bandInputsFor` in `shared/description.ts`
- [x] Turn the four faces [[TASK-0028-A-Card-Face-Per-Type]] built into `face` sections on the seven descriptions
- [x] Record the vocabulary fixture from the cockpit's `statuses.py` and assert against it — `desktop/fixtures/cockpit-statuses.json`
- [x] File the cockpit issue for a vocabulary payload and record its id here — [[project-os-cockpit#ISS-0292]], filed 2026-09-09
- [x] Write [[TST-0032-Band-And-Face-Follow-The-Description-And-The-Vocabularies-Match-The-Cockpit]] and link it from `tests:` — written at planning time; its evidence is filled in

## Notes

The copy in `faces.ts` drifted from the cockpit's within two days of being written, and nothing caught it. That is the argument for the fixture: a vocabulary Deck cannot ask for is a vocabulary Deck must check.


## Done, 2026-09-09

**`faces.ts` holds no note type at all.** A search of the built module for `test`, `issue`, `feature`, `phase`, `surface`, `requirement`, `character` and `chapter` finds none of them. What it holds is how to READ a face section and how to turn one into the line a person sees. The four faces are now entries in the project-os provider's `face` section, and a vault type gets a face by gaining an entry there.

**The band function is one function and every surface calls it.** `bandInputsFor(group, card)` turns a payload into the table's inputs, `bandOf(table, inputs)` applies the table, and `bandCards` deals a whole view and counts what did not fit. The suite runs it over three REAL navigation payloads recorded from the sidecar's own `nav_payload`: this repository's Features, and Your Trainer's Features and Issues.

**`bandInputsFor` holds the subtlety, and finding it was worth the fixture.** A view that gathers its own obligations receives no Needs-you group and marks no ITEM owed — the whole GROUP is marked `needs_human` instead. Reading the item alone left Your Trainer's Issues view with nothing in the front band while forty issues waited for triage. The fixture is what showed it; a hand-written payload would have had whichever shape the author assumed.

**Nothing owed is demoted and nothing falls into the quiet band.** Your Trainer's Issues view overflows both bands in the normal case — the suite asserts both overflow counts are above zero there, so the "nothing is lost" checks are not passing on data that never tests them. Every note is in a band or in an overflow count, asserted as a total.

**The status vocabulary is the cockpit's own six bands, not a second set of Deck names.** Two vocabularies for one idea is what drifted: Deck's copy had `draft`, `proposed` and `ready` in a "doing" band where `statuses.py` puts all three in `pending`, within two days of being written. The bands, the completed set and the legacy mapping are now asserted against a fixture recorded from `statuses.py` with its date and commit, and the stylesheet uses the same six names.

**A correction to this note's own claim.** It said Deck has no `final`, "which the vault uses". The vault does not use `final`: its 143 notes carrying a status write `draft`, `active`, `done`, `todo`, `none`, `research`, `planning` and `in-progress`. Three of those — `none`, `research`, `planning` — are outside project-os's vocabulary, and `bandFor` returns `none` for them rather than guessing, because drawing them as `pending` would be Deck asserting something about a vocabulary that is not its own. Adding a `final` nobody writes would have been worse than the gap it was meant to fill.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh band-and-face`: 15 checks, 2026-09-09.
- The status fixture was read from `statuses.py` on 2026-09-09 at cockpit commit `11ded07`.
- The cockpit issue for a vocabulary payload is [[project-os-cockpit#ISS-0292]], filed 2026-09-09 at `triage`.
