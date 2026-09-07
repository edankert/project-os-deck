---
type: "[[test]]"
id: TST-0018
aliases: ["TST-0018"]
title: "A card shows what its note is, and a type Deck has never heard of still draws"
status: active
owner: user:edwin
created: 2026-09-07
updated: 2026-09-07
source: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/faces.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh faces"
covers: ["[[FEAT-0005-Spread-Cards-On-A-Desk]]"]
issues: []
tasks: ["[[TASK-0028-A-Card-Face-Per-Type]]"]
artifacts: []
adequacy: "Counting a surface's children rather than reading the progress object the sidecar sent fails the surface check. Throwing on a type with no face fails the unknown-type check, which the Vault phase meets first."
mutation_score: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: approved
related: ["[[PHASE-0001-Deck]]", "[[TASK-0028-A-Card-Face-Per-Type]]"]
---

# A card shows what its note is

## Purpose

Every card used to show an id, a title, a type and a status stripe, whatever the note held. That is the cockpit's row with rounded corners. A card's face is now decided by a pure function of the note, so this suite checks it without opening a window.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0018` reproduces it locally without writing anything.

## Procedure

- Give a feature three tasks, two of them finished, and assert the face reports two of three done.
- Give a test surface a progress object the sidecar sent, and assert the face uses those numbers rather than counting the children again.
- Assert an issue's face shows its severity beside its status.
- Assert a test's face shows the date it was last walked, marks a stale one, and says so when it has never been walked.
- Assert an issue carrying no severity falls back to the plain face rather than drawing an empty band.
- Give a note a type Deck has no face for, and assert it still draws with id, title, type and status.
- Assert a note with neither type nor status still draws, as `note` at `no status`.
- Assert progress is counted with the same status vocabulary the bands use, so `fixed`, `implemented` and `passing` all count as done.
- Assert a note holding nothing has no progress to show.

## Expected results

- A card says what its note is, and a person can tell a feature from an issue from a test without opening either.
- A count the sidecar sent wins over a count Deck could compute, because the sidecar knows about notes Deck was not sent.
- An unknown type never blanks a card and never throws. This matters ahead of the Vault phase, which brings note types nobody here has heard of.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh faces`: 8 checks, all passing on 2026-09-07.
- The desktop suites run 143 checks in total on that date, this one included.

## Adequacy (who verifies this test?)

Counting a surface's children rather than reading the progress object the sidecar sent fails the surface check, and it fails with the wrong total rather than an error, which is why the check asserts the numbers and not just their shape. Throwing on a type with no face fails the unknown-type check. Widening the done vocabulary, so `doing` counts as finished, fails the progress check.

## Notes

The suite loads the BUILT modules under `desktop/dist`, not the TypeScript sources. That is the house rule stated in `desktop/tests/helpers.mjs`: a check that reads source text survives the rename that breaks the behaviour it claims to protect.

## Independent review — 2026-09-07

**Verdict: approved.** Clean context, separate session. `faceFor` and `faceText` are covered per type, the payload's own progress count is preferred over a recount, an issue with no severity falls back rather than drawing an empty band, and an unknown type draws what every card has — which is the Vault phase's case. Each check fails under the mutation the `adequacy` line names.

The one criterion outside this suite is the last: "the faces are drawn by the same pooled element". That is true of `cards.ts:115-139`, which paints every face into one `.face` node, but it is read rather than tested — no node suite loads anything under `desktop/src/renderer/`.
