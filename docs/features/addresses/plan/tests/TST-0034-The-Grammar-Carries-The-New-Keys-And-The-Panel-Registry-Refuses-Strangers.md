---
type: "[[test]]"
id: TST-0034
aliases: ["TST-0034"]
title: "The grammar carries surface, page, flow and step, every old address still round-trips, and the panel registry refuses a kind nobody registered"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/panel-registry.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh panel-registry"
covers: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
issues: []
tasks: ["[[TASK-0052-The-Grammar-Opens-And-The-Panels-Come-From-A-Registry]]"]
artifacts: []
adequacy: "Defaulting an unknown surface or page instead of refusing it fails the malformed table. Accepting a step with no flow fails its own check. Reading a literal panel list instead of the registry fails the register-then-parse check, which makes an address that was refused parse after a kind is registered. Changing what an existing address parses to fails the round-trip table, which is the one carried over unchanged."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[TST-0005-Every-State-Round-Trips-Through-Its-Address]]", "[[PHASE-0002-Glass]]", "[[PHASE-0004-Parity]]"]
---

# The grammar carries the new keys, and the panel registry refuses strangers

## Purpose

Every reachable Deck state has an address, which is what makes a pop-out window, a pasted link and a tablet possible. Four kinds of state arriving in the next three phases had no written form: a Glass surface, a page, an editor, and a flow at a step. This suite checks the four new keys, checks that nothing that parsed before parses differently now, and checks that the panel kinds come from a registry rather than from a literal set.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0034` reproduces it locally without writing anything.

## Procedure

- Round-trip `surface`, `page`, `flow` and `step` through the formatter and the parser.
- Assert each of the four refuses a value it does not know, by name, the way `panel` does.
- Assert `step` without `flow` is refused, because a step outside a flow names nothing.
- Run the round-trip table [[TST-0005-Every-State-Round-Trips-Through-Its-Address]] carries, unchanged, and assert every address still parses to the same state.
- Run the twelve malformed addresses that suite refuses and assert all twelve are still refused.
- Add a malformed case per new key and assert each is refused with the key named.
- Assert `panels.ts` holds no literal set that the parser reads, by searching the built output. The existing `panels` suite keeps what it checks about a popped-out window carrying one panel; this is a new suite, so a failure names this note.
- Assert an address naming an unregistered panel kind is refused by name.
- Register that kind, parse the same address again, and assert it now parses. Refusing before and parsing after is what proves the registry is real.
- Assert the three existing kinds — `needs-you`, `note`, `desk` — are registered from where they are built rather than from a list in the parser.
- Assert the store carries a flow cursor field, that nothing writes it and nothing reads it, and that its comment names this task.

## Expected results

- Four more kinds of state can be written down, and each refuses a value it does not understand.
- Nothing a person has already copied out of Deck stops working.
- An address still cannot name something Deck cannot draw, and now the guarantee comes from a registry a phase adds to rather than from a list somebody has to remember to edit.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh panel-registry`: 15 checks pass, 2026-09-09.
- The round-trip table holds the same six states before and after, and the malformed table the same twelve addresses. Both moved to `desktop/tests/address-table.mjs` and are now run by this suite and by [[TST-0005-Every-State-Round-Trips-Through-Its-Address]], so the two cannot drift into two tables.
- The six states gained four parts each — `surface`, `page`, `flow`, `step` — absent in every one of them, and their WRITTEN form is byte-for-byte what it was, which is what a person who copied an address yesterday actually depends on.
- Whole desktop suite: 190 checks, 2026-09-09. `electron . --smoke`: `ok: true`.

## Adequacy (who verifies this test?)

The register-then-parse pair is the load-bearing check: a parser that quietly accepts every panel kind passes a refusal test with a typo but fails this one. Carrying the old round-trip and malformed tables unchanged is what makes "nothing regressed" a measurement rather than a claim. The reason the malformed table matters at all is [[FEAT-0006-Every-State-Has-An-Address]]'s founding defect: the cockpit's silent fallback for an unknown navigation mode made the Tests view look broken for thirty-three hours.
