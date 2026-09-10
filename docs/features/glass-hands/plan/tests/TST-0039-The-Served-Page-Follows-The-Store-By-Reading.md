---
type: "[[test]]"
id: TST-0039
aliases: ["TST-0039"]
title: "The served page follows the store by reading it: the state a tablet is told, the choices it keeps, and a 405 for every write to the two routes"
status: active
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["[[TASK-0057-The-Served-Page-Follows-The-Store]]"]
phase: "[[PHASE-0002-Glass]]"
scope: feature
level: integration
entrypoint: "desktop/tests/served-state.test.mjs"
command: "bash tools/scripts/run-desktop-tests.sh served-state"
covers: ["[[FEAT-0014-The-Hands]]", "[[FEAT-0008-One-Renderer-Two-Hosts]]"]
issues: []
tasks: ["[[TASK-0057-The-Served-Page-Follows-The-Store]]"]
artifacts: ["desktop/src/shared/served-state.ts", "desktop/src/main/host.ts"]
adequacy: "Measured 2026-09-10 against the built modules, five mutations and four killed. Sending the actor to the network fails 3. Dropping the workspace filter fails 2. Dropping the tablet's own choices from the merge fails 1. A stream that never writes an event fails 1. Removing the loop that ends open streams on close survives, because `closeAllConnections()` ends them too; the loop is a second lock, not the only one."
mutation_score: "5 mutations, 4 killed (2026-09-10)"
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[ADR-0001-Deck-Serves-Its-Own-Read-Only-Host]]", "[[TST-0007-The-Host-Serves-Reads-And-Refuses-Everything-Else]]", "[[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]]"]
---

# The served page follows the store by reading it

## Purpose

A tablet now shows the desk the Mac holds. Until [[TASK-0057-The-Served-Page-Follows-The-Store]] a page served by Deck's host kept a fresh state of its own, so a note lifted on the Mac never reached the tablet. This suite checks the two functions that decide what the tablet is told and what it keeps, and the two read routes that carry the store: `GET /deck/state` and `GET /deck/events`.

## Procedure

1. `bash tools/scripts/run-desktop-tests.sh served-state`.
2. The suite builds a state the way the Mac would, in two workspaces, one of them with no sidecar answering, and reads it back through `servedState` and `mergeServed`.
3. It stands up Deck's host on a free port with a fake sidecar and a store it can broadcast from, and makes real HTTP requests.

## Expected results

- The state a tablet reads carries no name to write with, and says nothing about a workspace whose sidecar is not answering: not its desk, its saved desks, or what a hand pulled there.
- A tablet keeps its own view and surface, and the Mac's desk is what it draws. With follow on, it takes the Mac's workspace, view and note.
- A tablet applies only the actions that change what it keeps for itself. A card put on the desk, a pull, a pane moved or the writing name are not among them.
- `POST`, `PUT`, `DELETE`, `PATCH` and `OPTIONS` on both routes answer 405 with `Allow: GET, HEAD`, and `HEAD` answers 200.
- The event stream sends the state at once, and a change within a second of the store's broadcast.
- The host counts the pages following it, and closing it does not wait for an open stream.

## Evidence

2026-09-10: 10 of 10 pass. The smoke run adds the real window: a page opened without the preload, as a tablet loads it, received a note put on the desk in the main process within a second, and a click on it left the Mac's desk as it was. `npm run smoke:lan` asserts the five 405s from the machine's network address.

## Adequacy (who verifies this test?)

See `adequacy:` above. What this suite cannot see is Safari on a real tablet drawing the desk it received, which is a step in [[TST-0038-The-Field-Is-Arranged-By-Hand-And-A-Note-Is-Thrown-To-Another-Screen]].
