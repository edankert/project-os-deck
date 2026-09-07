---
type: "[[test]]"
id: TST-0021
aliases: ["TST-0021"]
title: "A port another process is listening on is never offered as free"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[ISS-0002-A-Second-Deck-Cannot-Start-And-Says-Nothing]]", "[[ISS-0004-Two-Decks-Bind-The-Same-Port]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/ports.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh ports"
covers: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[ISS-0002-A-Second-Deck-Cannot-Start-And-Says-Nothing]]", "[[ISS-0004-Two-Decks-Bind-The-Same-Port]]"]
issues: ["[[ISS-0002-A-Second-Deck-Cannot-Start-And-Says-Nothing]]", "[[ISS-0004-Two-Decks-Bind-The-Same-Port]]"]
tasks: []
artifacts: []
adequacy: "Reverting the probe to a bind on 127.0.0.1 fails ISS-0004's check, because a loopback bind succeeds beside a wildcard listener. Reverting it to a bind on the requested interface alone fails ISS-0002's check. Returning a port when the range is exhausted fails the last check."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[FEAT-0002-Deck-Opens-A-Workspace]]"]
---

# A port in use is never offered as free

## Purpose

Guards [[ISS-0002-A-Second-Deck-Cannot-Start-And-Says-Nothing]] and [[ISS-0004-Two-Decks-Bind-The-Same-Port]]. Deck picks a port for the sidecar by probing a range, and a probe that answers wrongly costs a person a working application either immediately or much later. This suite holds real ports with real servers and asks the probe what it sees.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0021` reproduces it locally without writing anything.

## Procedure

- Borrow a port by letting the operating system pick one and releasing it, so the range under test is a range nothing else is holding.
- Ask for a free port when nothing holds it and assert the first port in the range comes back.
- Hold the port with a server bound to every interface, ask for a free port on loopback, and assert the probe skips it and offers a later one in the range.
- Hold the port with a server bound to loopback, ask for a free port that Deck will bind on every interface, and assert the probe skips it.
- Hold the only port in a one-port range and assert the probe reports that nothing is free rather than handing back a port.

## Expected results

- A port another process is listening on is never returned, whichever interface that process bound and whichever interface Deck will bind.
- A range with nothing free in it produces a described failure, not a port that fails later as `EADDRINUSE` inside the sidecar.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh ports`: 4 checks, all passing on 2026-09-07.
- The desktop suites run 143 checks in total on that date, this one included.
- Each check holds a real port with a real `net` server, so what is measured is the operating system's behaviour and not a model of it.

## Adequacy (who verifies this test?)

Reverting the probe to a plain bind on `127.0.0.1` fails ISS-0004's check. Reverting it to a bind on the interface Deck asked for fails ISS-0002's check. Returning a port instead of rejecting when the range is exhausted fails the last check. All three failures are the reported defects rather than approximations of them.

## Notes

These are the two halves of one probe. Binding alone cannot see a wildcard listener, because on macOS a loopback bind succeeds beside one, and two Decks then listen on one port with no way to say which a browser reaches. So the probe asks whether anything answers a connection first, and only then whether the interface Deck needs can be bound. ISS-0002 is the second half: a port held on loopback cannot be bound by a process asking for every interface, and the old probe offered it anyway.

The suite loads the BUILT modules under `desktop/dist`, not the TypeScript sources. That is the house rule stated in `desktop/tests/helpers.mjs`: a check that reads source text survives the rename that breaks the behaviour it claims to protect.
