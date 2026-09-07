---
type: "[[task]]"
id: TASK-0007
aliases: ["TASK-0007"]
title: "The sidecar starts and stops with Deck — one per workspace, on a free loopback port, waited for before it is used"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[FEAT-0002-Deck-Opens-A-Workspace]]"]
parent: "FEAT-0002"
effort: ""
due: ""
depends: []
blocks: []
related: ["[[FEAT-0002-Deck-Opens-A-Workspace]]", "[[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]", "[[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]]", "[[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]", "[[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
tests: ["[[TST-0001-The-Sidecar-Client-Reads-And-Never-Writes]]", "[[TST-0021-A-Port-In-Use-Is-Never-Offered-As-Free]]", "[[TST-0022-A-Refused-Port-Is-Not-The-End-Of-It]]"]
---

# The sidecar starts and stops with Deck

## Objective

Opening a workspace starts one sidecar process for it and hands the renderer the base URL to read from. Quitting Deck stops every sidecar it started.

## Definition of Done

- [x] A sidecar already running for that workspace is reused: Deck reads the repository's `.cockpit/url`, asks `/api/cockpit/identity`, and accepts it only when the root it reports is the workspace being opened.
- [x] Deck starts its own sidecar only when no live one answers, on a port that was free when Deck asked, and stops only the sidecars it started.
- [x] The renderer is given the base URL only after the sidecar answers a request.
- [x] Opening the same workspace twice reuses the running sidecar rather than starting a second.
- [x] Quitting Deck, including by closing the last window, leaves no sidecar process behind.
- [x] A sidecar that fails to start is reported to the renderer as an error with its output, not as an empty workspace.
- [x] A borrowed sidecar that exits while Deck is using it is re-resolved rather than left as an empty workspace.

## Steps

- [x] Read the discovery file and verify the identity before spawning anything.
- [x] Find a free loopback port, then spawn the sidecar with the workspace root and that port.
- [x] Poll a read endpoint until it answers or a timeout expires.
- [x] Keep a map of workspace root to running process and port.
- [x] Kill every child on `will-quit`, and on the main process exiting for any reason.

## Notes

Reuse before spawn, because of [[RISK-0001-A-Second-Sidecar-Takes-Over-Focus-Routing]]: the sidecar writes `.cockpit/url` into the repository and the `cockpit` command follows it, so a second sidecar on one repository silently captures that routing. Loopback only. Deck never binds the sidecar to a routable address; the network surface Deck offers is its own host in [[FEAT-0008-One-Renderer-Two-Hosts]], which proxies reads.

## What this task owns changed on 2026-09-07, and this is the record of it

**Four things about starting a sidecar changed after this task was marked done, and until now only the issue notes said so.** The close-out review named that as a handoff failure: a reader opening this note or [[FEAT-0002-Deck-Opens-A-Workspace]] could not tell that any of it had happened ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]], finding K).

**One: Deck tries four ports, not one.** A port that Deck's own probe can bind is not necessarily one the sidecar can bind. Node sets `SO_REUSEADDR` on what it binds and CPython's `socketserver` does not, so a port whose previous listener has gone but whose socket still lingers passes Deck's probe and is refused to Python. No probe can settle this, because the question is asked in a different process at a different moment. `startOnce` therefore retries on the next port, up to four attempts, and `isPortCollision` decides which failures are worth retrying ([[ISS-0009-A-Sidecar-Cannot-Bind-The-Port-Deck-Offered-It]], guarded by [[TST-0022-A-Refused-Port-Is-Not-The-End-Of-It]]).

**Two: two windows asking for one workspace get one sidecar.** A popped-out panel is reopened at launch beside the focus window, so two resolves for the same workspace now arrive moments apart. `resolve` coalesces them on the workspace id and both callers get the same handle. Before this, each started its own and the second killed the first ([[ISS-0010-Two-Windows-Opening-One-Workspace-Kill-Each-Others-Sidecar]]).

**Three: a sidecar has 45 seconds to answer, not 15.** Your Trainer's 2660 notes take about ten seconds to index before the server listens, measured on 2026-09-07, and a vault in [[PHASE-0003-Vault]] will be slower. A timeout under that turns a slow start into a failed one.

**Four, still open: a read arriving during that wait kills the sidecar.** The record is registered before the readiness wait, so `sidecarBaseFor` answers for the whole window, and a proxied read that gets a connection refusal calls `forget`, which stops a sidecar Deck owns. The served page has no gate that stops this. That is [[ISS-0011-A-Read-From-The-Served-Page-Kills-A-Sidecar-That-Is-Still-Indexing]], filed at `triage`, and it is why [[FEAT-0002-Deck-Opens-A-Workspace]] did not reach `done` on 2026-09-07.
