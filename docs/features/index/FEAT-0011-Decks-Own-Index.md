---
type: "[[feature]]"
id: FEAT-0011
aliases: ["FEAT-0011"]
title: "Deck's own index: the main process reads the workspace's Markdown itself, so a view can arrange notes the sidecar does not arrange"
status: review
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[PHASE-0001-Deck]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]"]
goal: "Deck's main process reads every Markdown file in the open workspace, parses its frontmatter, and keeps one record per note that it updates when the file changes. A view described as a query has something to run over, and Deck stops depending on the cockpit growing an endpoint that returns the notes."
requirements: []
tasks: ["[[TASK-0038-Records-From-The-Workspaces-Markdown]]", "[[TASK-0039-The-Index-Watches-And-Carries-A-Revision]]", "[[TASK-0040-The-Records-Reach-The-Renderer-Read-Only]]"]
release: ""
acceptance_exception: ""
related: ["[[PHASE-0001-Deck]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[FEAT-0012-A-View-Is-A-Description]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]", "[[REFERENCE-ARCHITECTURE-REVIEW-BEFORE-GLASS]]", "[[project-os-cockpit#ISS-0279]]"]
---

# Deck's own index

## Goal

**Deck reads the notes itself.** Its main process walks the open workspace's Markdown files, parses each one's frontmatter, and keeps a record per note: the id, the path, the title, the type, the status, the dates, the wikilinks it makes, and every other frontmatter field as it was written. When a file changes on disk the record changes and a revision number rises, so the renderer knows its picture is old.

This exists because a view described as a query needs something to evaluate over, and Deck holds no notes today. Edwin decided on 2026-09-08 that the something is Deck's own index rather than a new endpoint in the cockpit: "Decks own index, the Decks application are individual applications/views" ([[ADR-0004-A-View-Is-A-Description]]).

Two words are used throughout. A **record** is what Deck knows about one note: its frontmatter, parsed, plus where the file is. The **index** is every record for the open workspace, held in the main process.

## Scope

**In scope.** Discovery of the workspace's Markdown files, with the same directories ignored that the sidecar ignores. Frontmatter parsing, including the fields whose value is a list and the fields whose value is a wikilink. The normalisation rules the sidecar applies, mirrored rather than reinvented, so that a note Deck calls a `feature` is a note the cockpit calls a `feature`. A file watcher that keeps the index current and raises a revision on every change. A read path from the index to the renderer, through Deck's host, available on both hosts and read-only on both.

**Out of scope.** Writing any file. The index reads and Deck's writes go through the sidecar's guarded endpoints ([[ADR-0003-Deck-Writes-Through-The-Shell]]). Rendering a note's body, which stays the sidecar's `/api/render`. Obligations: whether a note is owed is a judgement the sidecar makes from its own registry, and a query-sourced view still reads owed and suppressed from the navigation payload. The link graph as a whole payload, which is [[TASK-0001-The-Whole-Edge-List-Is-One-Payload]] in [[PHASE-0002-Glass]] and still cockpit work.

**Not asked of the cockpit.** The review recommended filing an issue there for a records endpoint. Edwin withdrew it on 2026-09-08 by choosing Deck's own index.

## Acceptance

- For this repository and for Your Trainer, Deck's count of notes per type equals the sidecar's library groups, checked against a fixture read off the sidecar rather than against Deck's own output.
- A note whose `type:` is a list of values is counted under every one of those values. This is the defect [[project-os-cockpit#ISS-0279]] reports in the sidecar's own indexer, and Deck must not reproduce it.
- A note whose frontmatter Deck cannot parse is reported by path with the reason, and the rest of the index is built. One bad file never empties a view.
- Editing a note on disk changes its record and raises the index revision, with no restart and no re-open of the workspace.
- The renderer reads records through Deck's host on both hosts, and the served host answers the records to a tablet and still refuses every method that is not a read.

## Links

- Phase: [[PHASE-0001-Deck]]
- Decision: [[ADR-0004-A-View-Is-A-Description]]
- Tasks: [[TASK-0038-Records-From-The-Workspaces-Markdown]], [[TASK-0039-The-Index-Watches-And-Carries-A-Revision]], [[TASK-0040-The-Records-Reach-The-Renderer-Read-Only]]
- Risk: [[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]
- Plan: `docs/features/index/plan/PLAN.md`
- Acceptance walk: [[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]]


## Where this stands

**2026-09-09: built, and at `review` waiting on the walk a person makes.** All three tasks are `done`. Deck's main process walks a workspace's Markdown, keeps a record per note with every frontmatter key under its own name, watches for changes, raises one number per workspace when anything moves, and serves the records read-only on both hosts.

**The comparison with the sidecar is real rather than a formality.** `desktop/fixtures/sidecar-types.json` is recorded from the cockpit's own `Index`, by `tools/scripts/record-sidecar-fixture.py`, which imports it. Deck agrees with the sidecar about all 199 notes in this repository, path by path. On Your Trainer's 2715 notes the two agree to within eleven differences the fixture names one by one: one is [[project-os-cockpit#ISS-0279]], the list-valued `type:` Deck must not reproduce, and ten are files whose frontmatter PyYAML refuses outright and whose notes therefore vanish from the cockpit's own views.

**Fixing this repository's own such file was part of the work.** `ISS-0010` carried `don\'t` inside a double-quoted YAML scalar, which is not a valid escape; the cockpit dropped that note's frontmatter and showed 22 issues where there are 23. The note says `do not` now.

**What is owed is [[TST-0026-Decks-Index-Counts-What-The-Cockpit-Counts]]**, the live comparison a fixture cannot make: Deck and the cockpit open side by side, and a person reads the counts off both screens.
