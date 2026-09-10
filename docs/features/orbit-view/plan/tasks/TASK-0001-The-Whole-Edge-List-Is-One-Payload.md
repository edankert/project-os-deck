---
type: "[[task]]"
id: TASK-0001
aliases: ["TASK-0001"]
title: "The whole edge list is one payload — every link, with the offset that lets the edge quote the sentence that made it"
status: doing
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-05
updated: 2026-09-10
source: ["[[FEAT-0001-The-Corpus-Has-An-Inside]]"]
parent: "FEAT-0001"
effort: ""
due: ""
depends: []
blocks: ["TASK-0002", "TASK-0003"]
related: ["[[DES-0001-Nine-Ways-To-Read-The-Record]]", "[[PHASE-0002-Glass]]", "[[FEAT-0010-Lifting-A-Note]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]]", "[[project-os-cockpit#ISS-0023]]"]
tests: []
---

# The whole edge list is one payload

## Objective

One endpoint — `/api/cockpit/graph` — returns every node and every edge in the repo, once, so the orbit can be drawn without 1537 requests. The endpoint is built in the cockpit; this task consumes it in Deck and writes down what the one request costs.

## Detail

**The endpoint is the cockpit's work, not Deck's.** The sidecar is not changed for Deck, and the cockpit is the primary place for new functionality (`CLAUDE.md`). So this task begins by filing an issue in project-os-cockpit that asks for the endpoint, and it earns a row in the cockpit's capability register ([[project-os-cockpit#REFERENCE-CAPABILITY-REGISTER]]) which Deck's adoption table then carries. What is asked for: `wikilinks.py` already resolves a link target. What it does not do is hand over the **whole** set, and it does not record **where in the source** the link sat. Each edge carries the character offset of its `[[...]]`, because the callout quotes the sentence containing the link, and reconstructing that from the target alone is impossible — a note that links to `ISS-0209` three times has three different sentences to show. Node fields: id, kind, status band (from `statuses.py`, never re-derived), phase, inbound count. Edge fields: source, target, offset, and whether the link resolved.

**Deck's half is the consuming side.** A typed method on the read-only client ([[TASK-0009-A-Typed-Read-Only-Client-Over-The-Sidecar]]); the path added to the allow-list of paths Deck's host forwards, because the host proxies a list and not `/api` wholesale ([[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]); and the automated assertion that a node's status band equals what the reader shows for the same note.

**Nothing else in the phase waits on this.** [[FEAT-0010-Lifting-A-Note]]'s neighbourhood reads `/api/cockpit/context` for the note being held until the graph endpoint exists, and switches to the graph payload when it does. Only the orbit arrangement needs the whole list.

**The first of the phase's three numbers is written here.** The size in bytes and the time in milliseconds of the one request for this repository's 1537 nodes and 16148 edges, measured over Deck's host on the development laptop, go into [[FEAT-0001-The-Corpus-Has-An-Inside]]. If the request cannot arrive in one piece, that is the result, and the orbit is what is not built.

## Acceptance

- An issue for the endpoint exists in project-os-cockpit, named here, before any Deck code is written for it
- One request returns 1537 nodes and 16148 edges for this repo, and its size and time are written as numbers in the feature note
- An unresolved `[[link]]` appears as an edge with no target rather than being dropped, because a dangling link is a finding
- The status band on a node equals what the reader shows for the same note — asserted by a test, not by eye ([[project-os-cockpit#ISS-0023]])
- Deck's host forwards the graph path and still refuses every method that is not a read

## Provenance

Moved from `project-os-cockpit` on 2026-09-06, where it was `TASK-0592` (last commit there `74172d8`). Links to notes that stayed in that repository use the `[[project-os-cockpit#ID]]` form ([[project-os-cockpit#FEAT-0093]]). Split on 2026-09-07 into the cockpit's endpoint and Deck's consuming half, when [[PHASE-0002-Glass]] opened with the field built first.
