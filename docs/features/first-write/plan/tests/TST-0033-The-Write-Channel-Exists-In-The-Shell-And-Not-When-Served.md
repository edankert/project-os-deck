---
type: "[[test]]"
id: TST-0033
aliases: ["TST-0033"]
title: "The write channel exists in the shell and not when served, the verbs come from the sidecar, and every refusal is reported in the sidecar's own words"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0013-The-First-Write]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/writes.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh writes"
covers: ["[[FEAT-0013-The-First-Write]]"]
issues: []
tasks: ["[[TASK-0047-The-Write-Channel]]", "[[TASK-0048-The-Actor-Is-A-Setting]]", "[[TASK-0049-The-Actuator-Row-And-One-Transition]]", "[[TASK-0050-Ticking-A-Criterion-With-Evidence]]", "[[TASK-0051-The-Changed-Under-You-Mark]]"]
artifacts: []
adequacy: "Leaving the write capability true when the preload bridge is absent fails the served-page check. Forwarding a write through Deck's host fails the 405 check, which runs over real HTTP on every path including the new ones. Restating a verb table in Deck fails the search against the cockpit's own transition table. Offering a tick on a note whose checkboxes carry no data-raw fails the missing-address check. Redrawing a second window automatically fails the announce check."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]]"]
---

# The write channel exists in the shell and not when served

## Purpose

Deck writes for the first time, and [[ADR-0003-Deck-Writes-Through-The-Shell]] put the write on exactly one route: the preload bridge, the main process, and a loopback request to the sidecar. This suite proves the route exists, that no write leaves Deck by any other route, and that the served page has no verb on it at all.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0033` reproduces it locally without writing anything.

## Procedure

- Send a write from the renderer against a fake sidecar and assert it arrives as a POST from loopback, carrying the body Deck built.
- Assert the capability set carries `write`, true when the preload bridge is present and false when it is not.
- Assert the renderer offers no verb when `write` is false, by searching what the served page renders.
- Over real HTTP against Deck's host: assert every method that is not `GET` or `HEAD` is answered 405, on every path including the ones this feature added.
- Assert no write leaves Deck except through the write channel, the way [[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]] asserts it for the read client.
- Assert a sidecar's refusal reaches the renderer intact rather than as a generic failure.
- Assert the actor comes from the store: change it, make a write, and read the name out of the request body.
- Assert the default actor is derived rather than written in the source, and search the built output for a person's name as a literal.
- Assert the verbs shown on a note are exactly the rows `GET /api/notes/actions` returned, in the order returned.
- Assert a disabled row is shown disabled with its own reason; assert a row asking for confirmation gets one and a row that does not is applied directly.
- Search the built renderer for any verb name, from-state or transition rule against the cockpit's own table, and assert none is present.
- Assert a tick sends the `data-raw` text, the evidence, the actor and the note's modification time.
- Assert a tick with no evidence is not sent.
- Assert a note whose rendered checkboxes carry no `data-raw` offers no tick and states why.
- Assert the three refusals — nothing matched, matched twice, changed underneath — each produce their own sentence, with the duplicate-wording case naming the cause and the fix.
- With two windows in the store suite: assert a write marks the other window, that the mark is not applied until the person's action, and that the writing window redraws its own note without a mark.
- Assert a burst of changes produces one mark, and that the mark clears on redraw rather than surviving a view switch.

## Expected results

- One route in, and it is the shell's. The host that faces the network still refuses every write by method.
- Nothing about which verbs are legal is decided in Deck.
- A refusal is a sentence a person can act on, not an HTTP status.
- A change never redraws underneath somebody who is reading.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh write-channel`: 21 checks pass, 2026-09-09.
- The smoke run's line asserting the served page offers no verb: the served host answers `write: false`, the shell answers `write: true`, and the shell shows the name it writes with.
- A LIVE write against the sidecar this repository was already running, on 2026-09-09, reverted with `git checkout` afterwards and the working tree left clean:
  - `ISS-0016` moved `triage` → `deferred` in the file, with the sidecar's decision callout appended.
  - A criterion was ticked as `- [x] A live check that Deck can tick a criterion — evidence: ticked through Deck, 2026-09-09 (user:deck-live-check, 2026-09-09)`, which is the sidecar's `TICK_TEMPLATE` exactly.
  - The same tick with a modification time that had gone stale by one write was refused: `note changed on disk since it was read — reload and retry`.
  - A criterion that matches nothing was refused: `no criterion on TASK-0052 reads '...'`.
- The three refusal sentences are matched against the sidecar's OWN wording, read from `note_writes.py` and confirmed against those live refusals. The first version of the wording matched none of them, because all three were written from memory of what such a message might say.

## Adequacy (who verifies this test?)

The 405 check runs over real HTTP, including methods a browser will not send, because the equivalent check is what caught the traversal hole in Deck's host on 2026-09-06. The literal-name and verb-table searches read the built output rather than the source, so a table that moved modules is still caught. What this suite cannot do is prove that a real tablet in Safari shows no control; that is [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]], and it is the half Edwin decided on.
