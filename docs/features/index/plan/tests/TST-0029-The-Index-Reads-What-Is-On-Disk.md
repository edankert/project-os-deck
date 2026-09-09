---
type: "[[test]]"
id: TST-0029
aliases: ["TST-0029"]
title: "The index reads what is on disk, counts types the way the sidecar does, follows a change, and is served read-only"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0011-Decks-Own-Index]]"]
phase: "[[PHASE-0001-Deck]]"
scope: feature
level: unit
entrypoint: "desktop/tests/index.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh index"
covers: ["[[FEAT-0011-Decks-Own-Index]]"]
issues: []
tasks: ["[[TASK-0038-Records-From-The-Workspaces-Markdown]]", "[[TASK-0039-The-Index-Watches-And-Carries-A-Revision]]", "[[TASK-0040-The-Records-Reach-The-Renderer-Read-Only]]"]
artifacts: []
adequacy: "Dropping a note whose type: is a list fails the list-valued check. Mirroring the sidecar's type rule wrongly fails the fixture comparison, which reads the sidecar's own library groups rather than Deck's output. Rebuilding the whole index on one file's change fails the read-count check. Answering a POST on the records path with anything but 405 fails the host check."
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]", "[[project-os-cockpit#ISS-0279]]"]
---

# The index reads what is on disk

## Purpose

Deck keeps its own index of the workspace's Markdown, which means two programs now decide independently what a note is ([[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]). This suite checks the record Deck builds, the counts it produces against a fixture recorded from the sidecar, what happens when a file changes, and that the records reach a page read-only.

> **Status is evidence, not intent.** This test carries a `command:`, so it records no verdict; the CI run is the verdict. `python3 tools/scripts/run-tests.py --filter TST-0029` reproduces it locally without writing anything.

## Procedure

- Walk a fixture directory and assert one record per Markdown file, with every frontmatter key present under its own name and its value in its own shape: a scalar, a list, a wikilink, a list of wikilinks, a date.
- Assert the directories the sidecar ignores are ignored, from the one place they are named.
- Compare Deck's count of notes per type against the fixture recorded from the sidecar's library groups, for this repository and for Your Trainer.
- Assert a note whose `type:` is a list is counted under each of its values, and that the fixture carries this as a named expected difference from the sidecar with [[project-os-cockpit#ISS-0279]] as the reason.
- Feed a file with unparseable frontmatter and assert a report carrying its path and the parser's reason, and that every other file still yields a record.
- Write a file into a temporary directory, change its frontmatter, and assert the record changes and the revision rises.
- Add a file, delete a file, and rename a file; assert an addition, a removal, and a removal-plus-addition rather than a record with a stale path.
- Count file reads across a single file's change and assert only that file was re-read.
- Change many files at once and assert one rebuild and one revision rise, not one per file.
- Assert the revision is monotonic and never falls, including across a rebuild.
- Over real HTTP against Deck's host: assert the records path answers `GET` and `HEAD`, and answers 405 to every other method, including methods a browser will not send.
- Ask for records while the index is still building and assert a stated "still building" answer carrying the revision, with nothing torn down.
- Ask for a workspace Deck does not have open and assert a refusal by name rather than an empty list.

## Expected results

- Deck and the sidecar agree about how many notes of each type a workspace holds, and where they deliberately disagree the fixture says so with a reason.
- One broken file costs one record, never the view.
- A change on disk reaches the record without a restart, and every window can tell that its picture is old.
- The records are readable from both hosts and writable from neither.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh index`: 27 checks pass, 2026-09-09.
- The fixture was recorded on 2026-09-09 from cockpit commit `11ded07`, by `tools/scripts/record-sidecar-fixture.py`, which imports the sidecar's own `Index` rather than re-reading its rules.
- This repository: 199 notes, compared path by path against the sidecar's answer; no disagreements and no named differences needed.
- Your Trainer: 2715 notes, compared as per-type counts; eleven named differences, one of them [[project-os-cockpit#ISS-0279]] and ten of them files whose frontmatter PyYAML refuses outright and Deck reads.
- The comparison for Your Trainer is SKIPPED, out loud, when that repository is not on the machine — which is the case in CI.
- Four checks over real HTTP for the records route, plus four in the smoke run against the real application.

## Adequacy (who verifies this test?)

The fixture is what makes this suite worth having: it is recorded from the sidecar's own output rather than from Deck's, so a mirrored rule that is subtly wrong fails here instead of surprising somebody in front of two applications. The named-difference rows are the load-bearing part — a suite that passes because somebody loosened an assertion tests nothing. The live comparison a fixture cannot make is [[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]].
