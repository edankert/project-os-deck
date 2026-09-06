---
type: "[[test]]"
id: TST-0001
aliases: ["TST-0001"]
title: "The sidecar client reads what Deck needs and has no way to write"
status: active
owner: user:edwin
created: 2026-09-06
updated: 2026-09-06
source: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/sidecar-client.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh sidecar-client"
covers: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
issues: []
tasks: []
artifacts: []
adequacy: "Break the guard and the suite fails: adding a write method to the client, or relaxing the field validation, is caught by the method assertion and the malformed-payload case respectively. Recorded in the note when the suite first ran."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]"]
---

# The sidecar client reads what Deck needs and has no way to write

## Purpose

Deck's only route to the sidecar is one typed client. This suite runs that client against a fake sidecar, checks it reads the payloads Deck depends on, and checks it cannot write.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0001` reproduces it locally without writing anything.

## Procedure

- Stand up a fake sidecar over Node's HTTP module that records every request it receives.
- Call each client method and assert the parsed result against the recorded payload shapes.
- Assert the client exports no method that sends anything but `GET`, and that the fake sidecar saw only `GET` requests.
- Feed the client a malformed payload, an error payload and a closed socket, and assert each produces a described error rather than an exception.
- Assert workspace discovery accepts a directory carrying `SNAPSHOT.yaml` and refuses one that carries neither marker.

## Expected results

- Every read returns the typed shape, with the fields Deck depends on present.
- A response missing a required field is reported as an error naming the field.
- An unreachable sidecar produces an error, not a crash.
- The fake sidecar records no request whose method is not `GET`.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh sidecar-client`, from the repository root: 20 checks, all passing on 2026-09-06.
- The fake sidecar records every request it receives. After exercising every client method, the set of methods it saw was exactly `['GET']`.
- Run live against the sidecar the cockpit already had open on this repository: Deck reused it rather than starting a second one, and read 8 groups' worth of notes through it.

## Adequacy (who verifies this test?)

Verified by mutation on 2026-09-06. Removing the required-field check in the client (`requireString` returning `''` instead of throwing) makes "a response missing a field Deck needs is an error that names the field" fail. The read-only claim is asserted twice over: once on the client's own method names, once on what the fake sidecar recorded.
