---
type: "[[task]]"
id: TASK-0001
aliases: ["TASK-0001"]
title: "The whole edge list is one payload — every link, with the offset that lets the edge quote the sentence that made it"
status: backlog
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-05
updated: 2026-09-06
source: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
parent: "FEAT-0001"
effort: ""
due: ""
depends: []
blocks: ["TASK-0002", "TASK-0003"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]"]
tests: []
---

# The whole edge list is one payload

## Objective

One endpoint — `/api/cockpit/graph` — returns every node and every edge in the repo, once, so the field can be drawn without 1537 requests.

## Detail

`wikilinks.py` already resolves a link target. What it does not do is hand over the **whole** set, and it does not record **where in the source** the link sat.

Each edge carries the character offset of its `[[...]]`, because the callout quotes the sentence containing the link, and reconstructing that from the target alone is impossible — a note that links to `ISS-0209` three times has three different sentences to show.

Node fields: id, kind, status band (from `statuses.py`, never re-derived), phase, inbound count. Edge fields: source, target, offset, and whether the link resolved.

## Acceptance

- One request returns 1537 nodes and 16148 edges for this repo
- An unresolved `[[link]]` appears as an edge with no target rather than being dropped, because a dangling link is a finding
- The status band on a node equals what the reader shows for the same note — asserted by a test, not by eye ([[project-os-cockpit#ISS-0023]])

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `TASK-0592` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]).
