---
type: "[[test]]"
id: TST-0032
aliases: ["TST-0032"]
title: "Band and face follow the description rather than the code, and the status vocabulary Deck copies still equals the cockpit's"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/band-and-face.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh band-and-face"
covers: ["[[FEAT-0012-A-View-Is-A-Description]]"]
issues: []
tasks: ["[[TASK-0044-Band-And-Face-Come-From-The-Description]]", "[[TASK-0029-The-Band-Function]]"]
artifacts: []
adequacy: "Leaving a branch on note type in faces.ts fails the search check. Putting draft, proposed or ready in the doing band fails the vocabulary fixture, which is recorded from the cockpit's statuses.py rather than from Deck. Demoting an owed note past the front band's capacity instead of counting it fails the overflow check. Dropping the held and joined-to-desk columns fails the reserved-columns check."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[TASK-0028-A-Card-Face-Per-Type]]", "[[ADR-0004-A-View-Is-A-Description]]"]
---

# Band and face follow the description

## Purpose

`faces.ts` decided a card's face by branching on the note's type and decided its band from two hard-coded status sets. One of those sets was already wrong: it called `draft`, `proposed` and `ready` "doing" where the cockpit calls all three "pending", and it drifted within two days of being written. This suite checks that both decisions now come from the description, and that the vocabulary Deck still has to copy is pinned to the cockpit's own file.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0032` reproduces it locally without writing anything.

## Procedure

- Assert `faces.ts` contains no branch on a note's type, by searching the built output. The existing `faces` suite keeps what it checks about the four card faces; this suite is a new one, so a failure names this note.
- Change a description's `face` section and assert the card shows what the new section names, with no change to the renderer.
- Assert a card's band comes from the description's `band` section, through one function, and that the navigator, Spread and Glass all call that function.
- Run the band function over fixtures built from the real navigation payloads of this repository and of Your Trainer.
- For each of the seven views, assert the table says which group lands in which band, and that a view with no Needs-you group has a row saying so rather than a fallback.
- Assert a note in the Needs-you group is never assigned to the mid or quiet band; past the front band's capacity it is counted as overflow and the count is returned.
- Assert a note in the view's own groups that does not fit the mid band is counted as mid overflow and never assigned to the quiet band.
- Assert the table carries columns for held and joined-to-desk that nothing yet fills.
- Compare Deck's status bands against the fixture recorded from the cockpit's `statuses.py`, band by band, and assert `final` is present.
- Assert the fixture records the date and the cockpit commit it was read at.
- Assert the four faces [[TASK-0028-A-Card-Face-Per-Type]] built are now `face` sections on the seven descriptions and produce the same cards they produced before.

## Expected results

- What a card looks like and where it stands are properties of the view, readable in one document, not decisions spread across the renderer.
- One band function serves the navigator, Spread and Glass, so folding and banding are the same decision.
- A vocabulary Deck cannot ask the sidecar for is a vocabulary a test checks.

## Evidence (fill after running)

- `bash tools/scripts/run-desktop-tests.sh band-and-face`: the check count and the date.
- The cockpit commit and date the status-band fixture was read from `statuses.py`.
- The id of the cockpit issue filed for a vocabulary payload.

## Adequacy (who verifies this test?)

The vocabulary fixture is recorded from the cockpit's own source file, so it fails when the cockpit changes rather than when Deck does — which is the drift that already happened once with nothing to catch it. The overflow checks are the band function's real content: a band function that silently demotes an owed note passes every other check here and defeats the front plane's whole purpose.
