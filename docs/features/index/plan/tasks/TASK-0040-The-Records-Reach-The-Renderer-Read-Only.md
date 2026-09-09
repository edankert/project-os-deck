---
type: "[[task]]"
id: TASK-0040
aliases: ["TASK-0040"]
title: "The records reach the renderer through Deck's own host, read-only, on both hosts"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0011-Decks-Own-Index]]"]
parent: "FEAT-0011"
effort: ""
due: ""
depends: ["TASK-0038", "TASK-0039"]
blocks: ["TASK-0043", "TASK-0045"]
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]", "[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# The records reach the renderer, read-only

## Objective

The renderer asks Deck's own host for records and gets them, in the shell and on a tablet alike. The route is Deck's, not the sidecar's, because these records are Deck's; the read-only rule at that boundary is unchanged.

## Detail

**One route, two hosts.** [[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]] made the Electron window load from Deck's HTTP host, so the shell and the tablet run identical bytes over one origin. The records are served the same way: one path on Deck's host, answering `GET` and `HEAD`, refusing every other method with 405 as the host already does. There is no preload-only route for records, because a second data path is the thing "one renderer, two hosts" exists to prevent.

**A request that arrives before the index is built waits or says so; it never kills anything.** [[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]] is exactly this shape one layer down: a read arriving during a long start-up was treated as a failure and the thing being read was torn down. Deck's index on a large vault takes time. A read during that window returns a plain "still building" answer with the revision, and the renderer draws that rather than an empty view.

**The answer carries the revision it was built from.** A caller can then ask for records and know which index state it holds, which is what makes [[TASK-0051-The-Changed-Under-You-Mark]] and the stale-view rule possible without a second round trip.

## Acceptance

- The renderer reads records from Deck's host, and the same request served to a tablet returns the same records.
- Every method that is not `GET` or `HEAD` is answered 405 on the records path, asserted over real HTTP including methods a browser will not send.
- A read while the index is still building returns a stated "still building" answer with the revision; nothing is torn down and no error is reported to the person as a failure.
- Every answer carries the index revision it was built from.
- A request for a workspace Deck does not have open is refused by name, not by an empty list.

## Steps

- [x] Add the records path to Deck's host, inside the existing method guard — `/deck/records/<workspaceId>`
- [x] Answer the still-building case explicitly, with a test that asks during a slow build
- [x] Carry the revision on every answer
- [x] Extend the suite with the method refusals and the unknown-workspace case — eight methods, TRACE driven down a raw socket because `fetch` will not send it
- [x] Extend [[TST-0029-The-Index-Reads-What-Is-On-Disk]] to cover the served route — four checks, plus four in the smoke run against the real application

## Notes

This path is Deck's own and is not a forward to the sidecar, so the allow-list [[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]] hardened does not apply to it. It has its own surface and its own refusals, and the suite has to say so rather than assuming the forwarding tests cover it.


## Done, 2026-09-09

**One route, both hosts.** `GET /deck/records/<workspaceId>` on Deck's own HTTP host answers `{ workspaceId, revision, building, records, problems }`. The Electron window loads from that host too, so the shell and a tablet read the same bytes over one origin and there is no preload-only path for records — a second data path is what "one renderer, two hosts" exists to prevent ([[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]).

**Every answer carries the revision it was built from**, so a caller knows which index state it holds without a second round trip. That is what makes [[TASK-0051-The-Changed-Under-You-Mark]] possible.

**A read during the build is answered, not refused.** It comes back 200 with `building: true`, the revision, and no records — not half a workspace, which a view would quietly draw as though it were all of it. [[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]] is this shape one layer down: a read arriving during a long start-up was read as a death, and the thing being read was torn down.

**A workspace Deck has no index for is refused BY NAME**, 404 with the id in the sentence, rather than as an empty list. An empty index and a workspace nobody opened look identical on screen and only one of them is something a person can act on.

**This path is Deck's own and is not a forward**, so the allow-list [[ISS-0014-The-Forwarding-Allow-List-Reads-The-Path-And-Never-The-Query]] hardened has nothing to do with it, and the suite says so rather than assuming the forwarding tests cover it. Its own refusals are checked over real HTTP: eight methods that are not `GET` or `HEAD`, including `TRACE`, which `fetch` refuses to send and which is therefore driven down a raw socket.

**The smoke run proves the wiring**, which no suite can: it waits for the real application's index to finish walking this repository, asserts it holds records, asserts the answer carries a revision, and asserts a POST to the records path is refused with 405.
