---
type: "[[test]]"
id: TST-0030
aliases: ["TST-0030"]
title: "A description parses or says why not, the seven project-os views still match the cockpit, and twelve real base files come back with their unsupported constructs named"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/descriptions.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh descriptions"
covers: ["[[FEAT-0012-A-View-Is-A-Description]]"]
issues: []
tasks: ["[[TASK-0041-The-Description-Shape-And-Its-Parser]]", "[[TASK-0042-Seven-Descriptions-Equal-To-Todays-Views]]", "[[TASK-0046-A-Base-File-Reads-As-A-Description]]"]
artifacts: []
adequacy: "Defaulting a missing section instead of refusing it fails the malformed table. Accepting a bare unknown key fails the namespace check. Throwing on the first unreadable construct fails the several-at-once check, which asserts every refusal is reported. Reporting a TaskNotes view type as a generic parse failure fails the fixture check."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]]", "[[PHASE-0003-Vault]]"]
---

# A description parses, or says why not

## Purpose

A view is now a document, and the parser that reads it must refuse what it cannot understand by name. An unsupported filter that quietly returns an empty list is indistinguishable on screen from a view with nothing in it, and only one of those is a bug. This suite covers the shape, the parser's refusals, the seven project-os descriptions, and the twelve real base files they were seeded from.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0030` reproduces it locally without writing anything.

## Procedure

- Parse a valid description and assert the five sections: `source`, `band`, `face`, `surfaces`, `verbs`.
- Assert a document missing a required section is refused by name rather than defaulted.
- Assert `source.kind` accepts `mode` and `query` and refuses a third value by name.
- Assert `verbs` accepts `registry` and refuses a restated verb list, with the reason naming the cockpit's REQ-0026.
- Assert every description carries a version, that an unreadable version is refused by name, and that the refusal says which versions the parser can read.
- Assert a key outside the seeded language is accepted under Deck's namespace prefix and refused as a bare key.
- Feed a document with several unreadable constructs and assert all of them are reported, each with its location, rather than the first one thrown.
- Parse all seven descriptions the project-os provider emits and assert zero refusals.
- Assert each of the seven names `list` and `spread` in `surfaces` and does not name `glass`.
- Parse the twelve base-file fixtures — ten from `~/Notes`, two from the cockpit's `docs/__bases__/` — and assert each yields a description plus a list of unsupported constructs.
- Assert every unsupported construct is named with what it was and where it appeared, and that none is reported as a generic failure.
- Assert the TaskNotes view types and keys come back as named unsupported constructs and do not prevent the rest of the file parsing.
- Assert the four Comic card views produce a `face` naming the portrait, cover, scene or image the file names.
- Assert the sidebar base's `or`-of-`and` filter parses.

## Expected results

- A description Deck can read becomes a record; one it cannot becomes a record plus a list of named reasons. There is no third outcome.
- The seven views Deck already draws are expressible in the new shape with nothing left over.
- Every base file Edwin has actually written reads as a description as far as the seed reaches, and says by name where it stopped.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh descriptions`: 17 checks pass, 2026-09-09.
- THIRTEEN base-file fixtures, not twelve: eleven from `~/Notes` and two from the cockpit's `docs/__bases__/`, copied 2026-09-09. `desktop/fixtures/bases/README.md` names where each came from.
- All seven provider descriptions parse with zero refusals; each names `list` and `spread` and none names `glass`.
- Every one of the thirteen yields at least one description. The TaskNotes plugin's four view types come back as named unsupported constructs and stop nothing; the four Comic card views name `note.portrait`, `note.cover`, `note.scene` and `note.image`; the sidebar base's `or`-of-`and` parses as three `and` branches under one `or`.
- Nothing writes to a base file, asserted by their modification times before and after.

## Adequacy (who verifies this test?)

The malformed table is the guard: a parser that starts defaulting instead of refusing fails it, which is the failure [[FEAT-0006-Every-State-Has-An-Address]] already learned from when the cockpit's silent fallback made the Tests view look broken for thirty-three hours. The twelve fixtures are the second guard, because they are files nobody wrote for this suite. What they cannot check is whether the message helps a person; that is [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]].
