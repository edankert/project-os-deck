---
type: "[[task]]"
id: TASK-0001
aliases: ["TASK-0001"]
title: "The whole edge list is one payload — every link, with the offset that lets the edge quote the sentence that made it"
status: done
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
tests: ["[[TST-0046-The-Whole-Link-Graph-Is-Read-From-Decks-Own-Index]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
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

## Outcome

**Done 2026-09-10, and amended: Deck's own index answers the edge list, not a cockpit endpoint.** This task was written on 2026-09-07, when the sidecar was the only index Deck had, so it asked the cockpit for `/api/cockpit/graph` and began by filing an issue there. On 2026-09-08 Edwin decided Deck keeps its own index of the workspace's Markdown ([[FEAT-0011-Decks-Own-Index]]: "the Decks application are individual applications/views"), and the whole edge list is a read over exactly that. So no issue was filed and the cockpit is not changed; the acceptance line asking for one was written for a Deck that no longer exists, and this outcome is the reason it is not ticked.

**What Deck serves.** `GET /deck/graph/<workspace>` returns every note as a node (id, path, title, type, status, band, phase, inbound count) and every link as an edge (source, target or null, what was written, the offset in the source file, resolved, cross-repository). `GET /deck/graph/<workspace>/sentence?source=&offset=` returns the sentence a link sits in. Both are reads on Deck's host and refuse a POST with 405. The graph is built by `desktop/src/shared/graph.ts` from the index's records and each file read once more, and kept per index revision.

**It resolves the way the cockpit does.** The rules are the cockpit's `index.py`: `[[target]]` and `[[target|shown]]`, embeds excluded, bare ids in link-bearing frontmatter keys, and id, alias, file name, title, then the id in a drifted slug. The smoke run compares twelve notes' links with the sidecar's own `/api/cockpit/context` and they match. Every node's band is `bandFor` of its status, the same function the reader's rows use, and the smoke run checks 57 nodes against the sidecar's own status.

**One defect found while building it.** Every `PLAN.md` without an `id` takes `PLAN` as its id, so the plans collapsed into one node. An id claimed by more than one note is now replaced by the note's path.

**The number.** On the cockpit's corpus (1,549 notes, 15,358 links, 14,839 of them resolved), the one request is 2.39 MB and took 86 ms cold and 15 ms warm on a Mac Studio (M2 Max) over Deck's host on loopback. On Your Trainer, 2,714 notes and 12,119 links, 2.28 MB in 107 ms; on this repository, 236 notes and 3,626 links, 0.59 MB in 39 ms. Written in [[FEAT-0001-The-Corpus-Has-An-Inside]].
