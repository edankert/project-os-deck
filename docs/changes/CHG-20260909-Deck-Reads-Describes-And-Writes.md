---
type: "[[change]]"
id: CHG-20260909-Deck-Reads-Describes-And-Writes
aliases: ["CHG-20260909-Deck-Reads-Describes-And-Writes"]
title: "Deck gains its own index, a language for describing a view, and a write path through the shell — and two defects that looked like the renderer turn out to be a path comparison and the smoke run itself"
status: merged
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["The eighteen tasks PHASE-0001 gained on 2026-09-08 when Edwin widened it before Glass"]
commit: ""
pr: ""
impacts: ["desktop/src/main/", "desktop/src/renderer/", "desktop/src/shared/", "desktop/tests/", "desktop/fixtures/", "tools/scripts/record-sidecar-fixture.py"]
issues: ["[[ISS-0022-The-Smoke-Run-Says-A-Popped-Out-Desk-Never-Draws-A-Card]]", "[[ISS-0023-Two-Sidecars-For-One-Repository-When-The-Paths-Differ-Only-In-Case]]"]
features: ["[[FEAT-0006-Every-State-Has-An-Address]]", "[[FEAT-0011-Decks-Own-Index]]", "[[FEAT-0012-A-View-Is-A-Description]]", "[[FEAT-0013-The-First-Write]]"]
related: ["[[PHASE-0001-Deck]]", "[[ADR-0003-Deck-Writes-Through-The-Shell]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]", "[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]]"]
---

# Deck reads the notes itself, a view becomes a document, and Deck writes for the first time

## What changed, for somebody using Deck

**A view can now be described rather than programmed, and nothing on screen changed on the day it landed.** The seven views are the same seven, in the same order, with the same groups, counts and folding. What changed is underneath: each one is a document saying what it selects, which band a note stands in, what a card shows and which surfaces may draw it.

**Deck reads the workspace's Markdown itself.** It keeps a record per note, watches for changes, and raises one number when anything moves. A view can now be a query over that, and the first one was walked in the running application.

**Deck can change a note, from the shell only.** Ticking an acceptance criterion with evidence, and one status transition. On a tablet there is no verb at all — absent, not greyed out.

**A card that could not be read says so.** A view whose filter Deck cannot evaluate draws the notes it could still select, with the construct it could not read named above them. An empty view and a broken view no longer look the same.

## Two defects, and both were mis-diagnosed in their own notes

**Deck compared two path strings where it meant to compare two directories** ([[ISS-0023-Two-Sidecars-For-One-Repository-When-The-Paths-Differ-Only-In-Case]]). macOS reaches one directory as both `/Users/edwin/…` and `/Users/Edwin/…`, so the guard that stops Deck starting a second sidecar on a repository the cockpit already serves called one repository two. Deck ran its own sidecar on `your-trainer` and left that repository's `.cockpit/url` naming a port nobody was listening on. `realDirectory` in `desktop/src/main/paths.ts` asks the file system for the spelling on disk, and the three places that decide "is this the same repository" all read it. [[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]] closes again, on the check it was waiting for.

**The popped-out desk that drew no cards was never a defect in the window** ([[ISS-0022-The-Smoke-Run-Says-A-Popped-Out-Desk-Never-Draws-A-Card]]). `npm run smoke` carries no `--workspace` and opened none, and the panel section sat outside the guard that skips the workspace half — so it opened a satellite on a workspace Deck does not know and asserted that a card put on that workspace's desk reached it. Neither candidate cause in the note was right: the desk does not drop cards outside the pinned view, and a satellite does repaint on a change from another window. `--workspace` now defaults to this repository, the panel checks sit inside the guard, and a run that SKIPPED checks is no longer a run that passed.

## Six things found rather than assumed

Each is written where somebody will meet it rather than only here.

- **This repository had a note whose frontmatter was invalid YAML.** `ISS-0010`'s `source:` carried an invalid escape inside a double-quoted scalar, which is not a YAML escape, so the cockpit dropped that note's frontmatter and had been showing 22 issues where there are 23. The note says `do not` now.
- **Deck's status vocabulary had drifted from the cockpit's within two days of being written** — `draft`, `proposed` and `ready` in a "doing" band where `statuses.py` puts all three in `pending`. It is the cockpit's own six band names now, pinned by a fixture, and [[project-os-cockpit#ISS-0292]] asks for the vocabulary to be served so no client has to copy it.
- **`/api/render` carries no modification time**, which the plan for the tick assumed. It comes from Deck's own index instead — the better source, since the index is what watches the file.
- **The three refusal sentences for a failed tick were written from memory** and matched none of the sidecar's actual ones. They are read from `note_writes.py` now and confirmed against live refusals.
- **A view that gathers its own obligations marks the GROUP, not each item.** Reading the item alone left forty of Your Trainer's issues waiting for triage with nothing in the front band. The real payload fixture is what showed it.
- **A descending sort put every missing value first**, because presence was decided inside the direction flip. A note with no due date is not the most urgent one.

## What this asks of a reader

- **`npm run smoke` and `electron . --smoke --workspace <path>` now run the same checks.** They did not before.
- **Two fixtures are recorded rather than written**, by `tools/scripts/record-sidecar-fixture.py`, which imports the cockpit's own `Index` and `statuses`. Re-record them when the cockpit's indexer or its status table changes: `../project-os-cockpit/.venv/bin/python3 tools/scripts/record-sidecar-fixture.py`.
- **A new read path**, `GET /deck/records/<workspaceId>`, optionally `?rel=<path>` for one note. It answers on both hosts, carries the revision it was built from, says `building: true` while the walk is running, and refuses every method that is not `GET` or `HEAD`.
- **The status band names in the stylesheet are the cockpit's six** — `active`, `pending`, `done`, `archived`, `blocked`, `reference` — where they were Deck's own four.

## What is still owed

Four acceptance walks and a review, all of them a person's job: [[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]], [[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]], [[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]] and [[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]].

[[ISS-0008-Nothing-In-CI-Exercises-The-Renderer]] is unchanged and is still the reason ISS-0022 cost a day: the smoke run is the only thing that drives the renderer, it is not in CI, and until today nothing checked the smoke run either.
