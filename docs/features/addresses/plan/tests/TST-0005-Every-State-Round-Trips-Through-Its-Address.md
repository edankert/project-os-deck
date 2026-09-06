---
type: "[[test]]"
id: TST-0005
aliases: ["TST-0005"]
title: "Every state round-trips through its address, and a malformed address is refused rather than defaulted"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/address.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh address"
covers: ["[[FEAT-0006-Every-State-Has-An-Address]]"]
issues: []
tasks: []
artifacts: []
adequacy: "Replacing a refusal with a fallback to the default view fails the last assertion, which is the failure this test exists for: the cockpit's silent mode fallback hid a broken view for thirty-three hours."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
---

# Every state round-trips through its address

## Purpose

An address is the written form of a Deck state. This suite asserts the round trip over a table of states and the refusals over a table of bad input.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0005` reproduces it locally without writing anything.

## Procedure

- Format each state in a table of reachable states, parse the result and assert it equals the state.
- Parse a table of malformed addresses and assert each is refused with a reason.
- Assert an address naming an unknown view is refused and names the view.
- Assert no malformed input ever parses to the default view.

## Expected results

- Format then parse is the identity over every reachable state.
- Every refusal names what it could not read.
- No input silently becomes the default view.

## Evidence (fill after running)

- `bash tools/scripts/run-desktop-tests.sh address`, run from the repository root.

## Adequacy (who verifies this test?)

Replacing a refusal with a fallback to the default view fails the last assertion, which is the failure this test exists for: the cockpit's silent mode fallback hid a broken view for thirty-three hours.
